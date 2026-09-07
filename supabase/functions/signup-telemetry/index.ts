import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const EventSchema = z.object({
  requestId: z.string().uuid(),
  stage: z.string().min(1).max(64),
  status: z.enum(['start', 'success', 'error', 'info']),
  emailDomain: z.string().max(255).optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  durationMs: z.number().int().min(0).max(3_600_000).optional().nullable(),
  supabaseRequestId: z.string().max(128).optional().nullable(),
  httpStatus: z.number().int().min(100).max(599).optional().nullable(),
  errorCode: z.string().max(128).optional().nullable(),
  errorMessage: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const BodySchema = z.object({ events: z.array(EventSchema).min(1).max(25) });

// Defense in depth: strip anything password-like before it ever reaches storage.
const FORBIDDEN_KEY = /pass|pwd|secret|token|credential/i;
function sanitize(meta: Record<string, unknown> = {}) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (FORBIDDEN_KEY.test(key)) continue;
    if (typeof value === 'string' && value.length > 500) continue;
    if (value !== null && typeof value === 'object') continue;
    out[key] = value;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const edgeRequestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const json = { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': edgeRequestId };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: json });
  }

  let parsed;
  try {
    parsed = BodySchema.safeParse(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: json });
  }
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: json });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const rows = parsed.data.events.map((e) => ({
    request_id: e.requestId,
    stage: e.stage,
    status: e.status,
    email_domain: e.emailDomain ?? null,
    user_id: e.userId ?? null,
    duration_ms: e.durationMs ?? null,
    supabase_request_id: e.supabaseRequestId ?? null,
    http_status: e.httpStatus ?? null,
    error_code: e.errorCode ?? null,
    error_message: e.errorMessage ?? null,
    metadata: { ...sanitize(e.metadata), edge_request_id: edgeRequestId },
  }));

  const { error } = await supabase.from('signup_telemetry').insert(rows);
  if (error) {
    console.error('[signup-telemetry] insert failed', edgeRequestId, error.message);
    return new Response(JSON.stringify({ error: error.message, edgeRequestId }), { status: 500, headers: json });
  }

  console.log('[signup-telemetry] stored', rows.length, 'events', edgeRequestId);
  return new Response(JSON.stringify({ ok: true, stored: rows.length, edgeRequestId }), { status: 200, headers: json });
});
