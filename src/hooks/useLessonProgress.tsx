import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface LessonProgressRecord {
  id: string;
  user_id: string;
  lesson_id: string;
  status: string;
  completed_at: string | null;
  xp_earned: number;
}

/**
 * Lesson progress is written only through the start_lesson / complete_lesson
 * backend functions. XP is decided server-side from the lesson record; the
 * client never sends xp_earned, status timestamps or user ids.
 */
export const useLessonProgress = () => {
  const [progress, setProgress] = useState<LessonProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const userIdRef = useRef<string | null>(null);
  const inFlight = useRef<Set<string>>(new Set());
  userIdRef.current = user?.id ?? null;

  const fetchProgress = useCallback(async () => {
    const uid = user?.id;
    if (!uid) { setProgress([]); setLoading(false); setError(null); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from("lesson_progress").select("*").eq("user_id", uid);
      if (userIdRef.current !== uid) return; // stale response for a previous account
      if (error) throw error;
      setProgress((data || []) as LessonProgressRecord[]);
    } catch (e) {
      if (userIdRef.current !== uid) return;
      console.error("Error fetching lesson progress:", e);
      setError("We couldn't load your lesson progress.");
    } finally {
      if (userIdRef.current === uid) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { setProgress([]); fetchProgress(); }, [fetchProgress]);

  const upsertLocal = (row: LessonProgressRecord) =>
    setProgress(prev => [...prev.filter(p => p.lesson_id !== row.lesson_id), row]);

  const getLessonStatus = (lessonId: string): string | null =>
    progress.find(p => p.lesson_id === lessonId)?.status || null;

  const isLessonCompleted = (lessonId: string): boolean => getLessonStatus(lessonId) === "completed";

  /** Returns the XP the server awarded, or null if the completion failed. */
  const completeLesson = async (lessonId: string, _displayXp?: number): Promise<number | null> => {
    const uid = user?.id;
    if (!uid) return null;
    const existing = progress.find(p => p.lesson_id === lessonId);
    if (existing?.status === "completed") return 0;
    const key = `complete:${lessonId}`;
    if (inFlight.current.has(key)) return null;
    inFlight.current.add(key);
    try {
      const { data, error } = await supabase.rpc("complete_lesson", { p_lesson_id: lessonId });
      if (error) throw error;
      if (userIdRef.current !== uid) return null;
      const row = data as unknown as LessonProgressRecord;
      upsertLocal(row);
      toast({ title: `🎉 +${row.xp_earned} XP earned!`, description: "Lesson completed successfully." });
      return row.xp_earned;
    } catch (e) {
      console.error("complete_lesson failed:", e);
      toast({
        title: "Couldn't save your progress",
        description: "Your lesson wasn't marked complete. Check your connection and try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      inFlight.current.delete(key);
    }
  };

  const startLesson = async (lessonId: string): Promise<boolean> => {
    const uid = user?.id;
    if (!uid) return false;
    if (progress.some(p => p.lesson_id === lessonId)) return true;
    const key = `start:${lessonId}`;
    if (inFlight.current.has(key)) return true;
    inFlight.current.add(key);
    try {
      const { data, error } = await supabase.rpc("start_lesson", { p_lesson_id: lessonId });
      if (error) throw error;
      if (userIdRef.current === uid) upsertLocal(data as unknown as LessonProgressRecord);
      return true;
    } catch (e) {
      console.error("start_lesson failed:", e);
      return false;
    } finally {
      inFlight.current.delete(key);
    }
  };

  const getTotalXp = (): number =>
    progress.filter(p => p.status === "completed").reduce((sum, p) => sum + p.xp_earned, 0);

  const getCompletedCount = (): number => progress.filter(p => p.status === "completed").length;

  return {
    progress, loading, error,
    getLessonStatus, isLessonCompleted, completeLesson, startLesson,
    getTotalXp, getCompletedCount, refetch: fetchProgress,
  };
};
