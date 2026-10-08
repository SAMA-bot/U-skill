import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PathProgressRecord {
  id: string;
  path_id: string;
  status: "in_progress" | "completed" | string;
  started_at: string;
  completed_at: string | null;
  current_lesson_id: string | null;
  lessons_completed: number;
  total_lessons: number;
  xp_earned: number;
  last_activity_at: string;
}

export const PATH_COMPLETION_BONUS_XP = 50;

/** Server-maintained per-path progress (started / completed / current lesson). */
export const useLearningPathProgress = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<PathProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from("learning_path_progress")
      .select("*")
      .eq("user_id", user.id);
    if (!error) setRecords((data || []) as PathProgressRecord[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  const getPathProgress = (pathId: string) => records.find(r => r.path_id === pathId) || null;

  return { records, loading, getPathProgress, refetch };
};
