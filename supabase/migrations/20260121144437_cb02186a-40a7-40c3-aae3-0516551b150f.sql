-- Create rate_limits table for tracking request rates
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_rate_limits_user_action ON public.rate_limits(user_id, action_type, window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits (via edge functions with service role)
CREATE POLICY "System can manage rate limits"
ON public.rate_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_window TIMESTAMP WITH TIME ZONE;
  existing_count INTEGER;
BEGIN
  -- Calculate window start (rounded to the minute)
  current_window := date_trunc('minute', now()) - (EXTRACT(MINUTE FROM now())::INTEGER % p_window_minutes) * INTERVAL '1 minute';
  
  -- Get existing request count for this window
  SELECT request_count INTO existing_count
  FROM public.rate_limits
  WHERE user_id = p_user_id 
    AND action_type = p_action_type
    AND window_start = current_window;
  
  IF existing_count IS NULL THEN
    -- First request in this window
    INSERT INTO public.rate_limits (user_id, action_type, request_count, window_start)
    VALUES (p_user_id, p_action_type, 1, current_window);
    RETURN TRUE;
  ELSIF existing_count < p_max_requests THEN
    -- Increment counter
    UPDATE public.rate_limits
    SET request_count = request_count + 1
    WHERE user_id = p_user_id 
      AND action_type = p_action_type
      AND window_start = current_window;
    RETURN TRUE;
  ELSE
    -- Rate limit exceeded
    RETURN FALSE;
  END IF;
END;
$$;

-- Cleanup old rate limit records (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - INTERVAL '24 hours';
END;
$$;