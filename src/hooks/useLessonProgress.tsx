import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface LessonProgressRecord {
  id: string;
  user_id: string;
  lesson_id: string;
  status: string;
  completed_at: string | null;
  xp_earned: number;
}

export const useLessonProgress = () => {
  const [progress, setProgress] = useState<LessonProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchProgress = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      setProgress((data || []) as LessonProgressRecord[]);
    } catch (error: any) {
      console.error("Error fetching lesson progress:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProgress(); }, [user]);

  const getLessonStatus = (lessonId: string): string | null => {
    return progress.find(p => p.lesson_id === lessonId)?.status || null;
  };

  const isLessonCompleted = (lessonId: string): boolean => {
    return getLessonStatus(lessonId) === "completed";
  };

  const completeLesson = async (lessonId: string, xpReward: number) => {
    if (!user) return;
    try {
      const existing = progress.find(p => p.lesson_id === lessonId);
      if (existing?.status === "completed") return;

      const { data, error } = await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          status: "completed",
          completed_at: new Date().toISOString(),
          xp_earned: xpReward,
        }, { onConflict: "user_id,lesson_id" })
        .select()
        .single();

      if (error) throw error;
      setProgress(prev => {
        const filtered = prev.filter(p => p.lesson_id !== lessonId);
        return [...filtered, data as LessonProgressRecord];
      });
      toast({ title: `🎉 +${xpReward} XP earned!`, description: "Lesson completed successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const startLesson = async (lessonId: string) => {
    if (!user) return;
    const existing = progress.find(p => p.lesson_id === lessonId);
    if (existing) return; // Already started or completed

    try {
      const { data, error } = await supabase
        .from("lesson_progress")
        .insert({ user_id: user.id, lesson_id: lessonId, status: "in_progress", xp_earned: 0 })
        .select()
        .single();
      if (error) throw error;
      setProgress(prev => [...prev, data as LessonProgressRecord]);
    } catch (error: any) {
      console.error("Error starting lesson:", error);
    }
  };

  const getTotalXp = (): number => {
    return progress.filter(p => p.status === "completed").reduce((sum, p) => sum + p.xp_earned, 0);
  };

  const getCompletedCount = (): number => {
    return progress.filter(p => p.status === "completed").length;
  };

  return {
    progress,
    loading,
    getLessonStatus,
    isLessonCompleted,
    completeLesson,
    startLesson,
    getTotalXp,
    getCompletedCount,
    refetch: fetchProgress,
  };
};
