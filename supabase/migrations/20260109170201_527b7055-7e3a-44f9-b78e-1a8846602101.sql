-- Create profiles table for faculty details
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  designation TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create performance_metrics table for monthly tracking
CREATE TABLE public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  teaching_score INTEGER DEFAULT 0 CHECK (teaching_score >= 0 AND teaching_score <= 100),
  research_score INTEGER DEFAULT 0 CHECK (research_score >= 0 AND research_score <= 100),
  service_score INTEGER DEFAULT 0 CHECK (service_score >= 0 AND service_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- Create capacity_skills table for skill tracking
CREATE TABLE public.capacity_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skill_name TEXT NOT NULL,
  current_level INTEGER DEFAULT 0 CHECK (current_level >= 0 AND current_level <= 100),
  target_level INTEGER DEFAULT 100 CHECK (target_level >= 0 AND target_level <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_name)
);

-- Create motivation_scores table for weekly tracking
CREATE TABLE public.motivation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  motivation_index INTEGER DEFAULT 0 CHECK (motivation_index >= 0 AND motivation_index <= 100),
  engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_number, year)
);

-- Create activities table for training activities
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  activity_type TEXT DEFAULT 'workshop',
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('completed', 'in_progress', 'pending')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app_role enum and user_roles table for role management
CREATE TYPE public.app_role AS ENUM ('admin', 'faculty', 'hod');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'faculty',
  UNIQUE(user_id, role)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacity_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for performance_metrics
CREATE POLICY "Users can view their own metrics"
ON public.performance_metrics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
ON public.performance_metrics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics"
ON public.performance_metrics FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for capacity_skills
CREATE POLICY "Users can view their own skills"
ON public.capacity_skills FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own skills"
ON public.capacity_skills FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for motivation_scores
CREATE POLICY "Users can view their own motivation scores"
ON public.motivation_scores FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own motivation scores"
ON public.motivation_scores FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for activities
CREATE POLICY "Users can view their own activities"
ON public.activities FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own activities"
ON public.activities FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'faculty');
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_capacity_skills_updated_at
  BEFORE UPDATE ON public.capacity_skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();