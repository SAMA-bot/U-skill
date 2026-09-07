import { supabase } from '@/integrations/supabase/client';

/**
 * End-to-end signup telemetry.
 *
 * Every signup attempt gets one client-generated request id. Each step of the flow
 * emits an event carrying that id, so frontend actions can be correlated with the
 * backend responses they triggered (via the server's request id + HTTP status).
 *
 * Passwords are NEVER captured. Only non-sensitive facts (email domain, password
 * length, timings, error codes/messages) are recorded.
 */

export type TelemetryStatus = 'start' | 'success' | 'error' | 'info';

export interface TelemetryEvent {
  requestId: string;
  stage: string;
  status: TelemetryStatus;
  emailDomain?: string | null;
  userId?: string | null;
  durationMs?: number | null;
  supabaseRequestId?: string | null;
  httpStatus?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

const FORBIDDEN_KEY = /pass|pwd|secret|token|credential/i;

function scrub(metadata?: TelemetryEvent['metadata']) {
  if (!metadata) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_KEY.test(key) && !/length$/i.test(key)) continue;
    out[key] = value;
  }
  return out;
}

export function newRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`.padEnd(36, '0');
}

export function emailDomainOf(email: string): string | null {
  const at = email.lastIndexOf('@');
  return at === -1 ? null : email.slice(at + 1).toLowerCase();
}

const queue: TelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function send(events: TelemetryEvent[]) {
  try {
    await supabase.functions.invoke('signup-telemetry', {
      body: { events },
      headers: { 'x-request-id': events[0].requestId },
    });
  } catch (err) {
    // Telemetry must never break the signup flow.
    console.warn('[signup-telemetry] delivery failed', err);
  }
}

/** Records a signup step. Fire-and-forget: never throws, never blocks the UI. */
export function trackSignupEvent(event: TelemetryEvent): void {
  const safe: TelemetryEvent = { ...event, metadata: scrub(event.metadata) };
  console.info(`[Signup ${safe.requestId}] ${safe.stage}:${safe.status}`, {
    httpStatus: safe.httpStatus ?? undefined,
    supabaseRequestId: safe.supabaseRequestId ?? undefined,
    durationMs: safe.durationMs ?? undefined,
    errorCode: safe.errorCode ?? undefined,
    ...safe.metadata,
  });

  queue.push(safe);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flushSignupTelemetry(), 400);
}

export async function flushSignupTelemetry(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  await send(batch);
}

export interface CapturedResponse {
  httpStatus: number | null;
  supabaseRequestId: string | null;
}

/**
 * Runs `action` while observing the network responses it produces, so the
 * server-side request id and HTTP status of a Supabase call can be correlated
 * with the client-side request id. Request bodies are never inspected.
 */
export async function withResponseCapture<T>(
  urlMatcher: (url: string) => boolean,
  action: () => Promise<T>,
): Promise<{ result: T; captured: CapturedResponse }> {
  const captured: CapturedResponse = { httpStatus: null, supabaseRequestId: null };
  const originalFetch = globalThis.fetch;

  if (typeof originalFetch !== 'function') {
    return { result: await action(), captured };
  }

  globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);
    try {
      const input = args[0];
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
      if (url && urlMatcher(url)) {
        captured.httpStatus = response.status;
        captured.supabaseRequestId =
          response.headers?.get('x-request-id') ??
          response.headers?.get('sb-request-id') ??
          response.headers?.get('cf-ray') ??
          null;
      }
    } catch {
      /* capture is best-effort */
    }
    return response;
  };

  try {
    const result = await action();
    return { result, captured };
  } finally {
    globalThis.fetch = originalFetch;
  }
}
