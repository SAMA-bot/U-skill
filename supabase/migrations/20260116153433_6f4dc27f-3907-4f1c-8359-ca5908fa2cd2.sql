-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.capacity_skills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.motivation_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;