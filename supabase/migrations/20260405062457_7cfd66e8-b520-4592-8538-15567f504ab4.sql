
-- Function to auto-award achievement badges
CREATE OR REPLACE FUNCTION public.auto_award_badges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _activity_count int;
  _course_count int;
  _login_streak int;
  _journal_count int;
  _perf_score int;
  _training_hours int;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN RETURN; END IF;

  SELECT count(*) INTO _activity_count FROM activities WHERE user_id = _user_id AND status = 'completed';
  SELECT count(*) INTO _course_count FROM course_enrollments WHERE user_id = _user_id AND status = 'completed';
  SELECT COALESCE(max(longest_streak), 0) INTO _login_streak FROM user_streaks WHERE user_id = _user_id AND streak_type = 'daily_login';
  SELECT count(*) INTO _journal_count FROM reflection_journal WHERE user_id = _user_id;
  SELECT COALESCE(ROUND(AVG((COALESCE(teaching_score,0) + COALESCE(research_score,0) + COALESCE(service_score,0)) / 3)), 0)
    INTO _perf_score FROM performance_metrics WHERE user_id = _user_id;
  SELECT COALESCE(SUM(c.duration_hours), 0) INTO _training_hours
    FROM course_enrollments ce JOIN courses c ON c.id = ce.course_id
    WHERE ce.user_id = _user_id AND ce.status = 'completed';

  -- First Steps
  IF _activity_count >= 1 THEN
    INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
    VALUES (_user_id, 'First Steps', 'star', 'Complete your first activity')
    ON CONFLICT (user_id, badge_name) DO NOTHING;
  END IF;

  -- Dedicated Learner
  IF _activity_count >= 5 THEN
    INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
    VALUES (_user_id, 'Dedicated Learner', 'book', 'Complete 5 activities')
    ON CONFLICT (user_id, badge_name) DO NOTHING;
  END IF;

  -- Course Champion
  IF _course_count >= 3 THEN
    INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
    VALUES (_user_id, 'Course Champion', 'graduation', 'Complete 3 courses')
    ON CONFLICT (user_id, badge_name) DO NOTHING;
  END IF;

  -- First Course
  IF _course_count >= 1 THEN
    INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
    VALUES (_user_id, 'First Course', 'graduation', 'Complete your first course')
    ON CONFLICT (user_id, badge_name) DO NOTHING;
  END IF;

  -- Streak milestones
  IF _login_streak >= 3 THEN
    INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
    VALUES (_user_id, 'Getting Started', 'flame', 'Reach a 3-day login streak')
    ON CONFLICT (user_id, badge_name) DO NOTHING;
  END IF;

  IF _login_streak >= 7 THEN
    INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
    VALUES (_user_id, 'Streak Master', 'flame', 'Reach a 7-day login streak')
    ON CONFLICT (user_id, badge_name) DO NOTHING;
  END IF;

  IF _login_streak >= 15 THEN
    INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
    VALUES (_user_id, 'Streak Legend', 'flame', 'Reach a 15-day login streak')
    ON CONFLICT (user_id, badge_name) DO NOTHING;
  END IF;

  IF _login_streak >= 30 THEN
    INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
    VALUES (_user_id, 'Unstoppable', 'zap', 'Reach a 30-day login streak')
    ON CONFLICT (user_id, badge_name) DO NOTHING;
  END IF;

  -- Training hours
  IF _training_hours >= 10 THEN
    INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
    VALUES (_user_id, 'Training Enthusiast', 'target', 'Complete 10 hours of training')
    ON CONFLICT (user_id, badge_name) DO NOTHING;
  END IF;

  IF _training_hours >= 50 THEN
    INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
    VALUES (_user_id, 'Training Expert', 'trophy', 'Complete 50 hours of training')
    ON CONFLICT (user_id, badge_name) DO NOTHING;
  END IF;

  -- Reflective Mind
  IF _journal_count >= 5 THEN
    INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
    VALUES (_user_id, 'Reflective Mind', 'book', 'Write 5 journal entries')
    ON CONFLICT (user_id, badge_name) DO NOTHING;
  END IF;

  -- High Performer
  IF _perf_score >= 80 THEN
    INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
    VALUES (_user_id, 'High Performer', 'trophy', 'Reach 80+ performance score')
    ON CONFLICT (user_id, badge_name) DO NOTHING;
  END IF;
END;
$$;

-- Trigger function to call auto_award_badges after course completion
CREATE OR REPLACE FUNCTION public.trigger_badge_check_on_course_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Award badges inline (no auth.uid() in trigger context, so do it directly)
    DECLARE
      _activity_count int;
      _course_count int;
      _login_streak int;
      _journal_count int;
      _perf_score int;
      _training_hours int;
    BEGIN
      SELECT count(*) INTO _course_count FROM course_enrollments WHERE user_id = NEW.user_id AND status = 'completed';
      SELECT COALESCE(SUM(c.duration_hours), 0) INTO _training_hours
        FROM course_enrollments ce JOIN courses c ON c.id = ce.course_id
        WHERE ce.user_id = NEW.user_id AND ce.status = 'completed';
      SELECT COALESCE(max(longest_streak), 0) INTO _login_streak FROM user_streaks WHERE user_id = NEW.user_id AND streak_type = 'daily_login';

      IF _course_count >= 1 THEN
        INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
        VALUES (NEW.user_id, 'First Course', 'graduation', 'Complete your first course')
        ON CONFLICT (user_id, badge_name) DO NOTHING;
      END IF;

      IF _course_count >= 3 THEN
        INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
        VALUES (NEW.user_id, 'Course Champion', 'graduation', 'Complete 3 courses')
        ON CONFLICT (user_id, badge_name) DO NOTHING;
      END IF;

      IF _training_hours >= 10 THEN
        INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
        VALUES (NEW.user_id, 'Training Enthusiast', 'target', 'Complete 10 hours of training')
        ON CONFLICT (user_id, badge_name) DO NOTHING;
      END IF;

      IF _training_hours >= 50 THEN
        INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
        VALUES (NEW.user_id, 'Training Expert', 'trophy', 'Complete 50 hours of training')
        ON CONFLICT (user_id, badge_name) DO NOTHING;
      END IF;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function for streak milestone badges
CREATE OR REPLACE FUNCTION public.trigger_badge_check_on_streak_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.streak_type = 'daily_login' THEN
    IF NEW.current_streak >= 3 OR NEW.longest_streak >= 3 THEN
      INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
      VALUES (NEW.user_id, 'Getting Started', 'flame', 'Reach a 3-day login streak')
      ON CONFLICT (user_id, badge_name) DO NOTHING;
    END IF;

    IF NEW.current_streak >= 7 OR NEW.longest_streak >= 7 THEN
      INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
      VALUES (NEW.user_id, 'Streak Master', 'flame', 'Reach a 7-day login streak')
      ON CONFLICT (user_id, badge_name) DO NOTHING;
    END IF;

    IF NEW.current_streak >= 15 OR NEW.longest_streak >= 15 THEN
      INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
      VALUES (NEW.user_id, 'Streak Legend', 'flame', 'Reach a 15-day login streak')
      ON CONFLICT (user_id, badge_name) DO NOTHING;
    END IF;

    IF NEW.current_streak >= 30 OR NEW.longest_streak >= 30 THEN
      INSERT INTO achievement_badges (user_id, badge_name, badge_icon, description)
      VALUES (NEW.user_id, 'Unstoppable', 'zap', 'Reach a 30-day login streak')
      ON CONFLICT (user_id, badge_name) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trg_badge_on_course_completion
  AFTER UPDATE ON public.course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_badge_check_on_course_completion();

CREATE TRIGGER trg_badge_on_streak_update
  AFTER UPDATE ON public.user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_badge_check_on_streak_update();

-- Allow authenticated users to insert their own badges (for client-side check)
CREATE POLICY "Users can insert their own badges"
  ON public.achievement_badges
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
