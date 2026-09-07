CREATE TABLE public.signup_telemetry (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  stage text not null,
  status text not null,
  email_domain text,
  user_id uuid,
  duration_ms integer,
  supabase_request_id text,
  http_status integer,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

CREATE INDEX idx_signup_telemetry_request_id ON public.signup_telemetry(request_id);
CREATE INDEX idx_signup_telemetry_created_at ON public.signup_telemetry(created_at DESC);

GRANT ALL ON public.signup_telemetry TO service_role;

ALTER TABLE public.signup_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read signup telemetry"
ON public.signup_telemetry FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.signup_telemetry TO authenticated;