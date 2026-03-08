
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS department text DEFAULT NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS training_date date DEFAULT NULL;
