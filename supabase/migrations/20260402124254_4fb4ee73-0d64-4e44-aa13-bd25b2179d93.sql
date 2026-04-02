-- Fix 1: Remove overly permissive "Anyone can view" policies from private course buckets
DROP POLICY IF EXISTS "Anyone can view course documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view course videos" ON storage.objects;

-- Fix 2: Remove sensitive tables from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.faculty_feedback;
ALTER PUBLICATION supabase_realtime DROP TABLE public.faculty_documents;
ALTER PUBLICATION supabase_realtime DROP TABLE public.achievement_badges;
ALTER PUBLICATION supabase_realtime DROP TABLE public.performance_metrics;
ALTER PUBLICATION supabase_realtime DROP TABLE public.motivation_scores;
ALTER PUBLICATION supabase_realtime DROP TABLE public.capacity_skills;