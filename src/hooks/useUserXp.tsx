import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface XpBreakdown {
  total: number;
  lesson: number;
  course: number;
  streak: number;
  recent: { source_type: string; xp_amount: number; description: string | null; created_at: string }[];
}

const empty: XpBreakdown = { total: 0, lesson: 0, course: 0, streak: 0, recent: [] };

/**
 * Returns the user's total XP plus a per-source breakdown.
 * Subscribes to xp_events realtime so the UI updates instantly when XP is awarded.
 */
export const useUserXp = () => {
  const { user } = useAuth();
  const [data, setData] = useState<XpBreakdown>(empty);
  const [loading, setLoading] = useState(true);

  const fetchXp = useCallback(async () => {
    if (!user) return;
    const { data: rows, error } = await supabase
      .from("xp_events")
      .select("source_type, xp_amount, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setLoading(false);
      return;
    }
    const breakdown: XpBreakdown = {
      total: 0, lesson: 0, course: 0, streak: 0, recent: (rows || []).slice(0, 10) as any,
    };
    (rows || []).forEach((r: any) => {
      breakdown.total += r.xp_amount || 0;
      if (r.source_type === "lesson") breakdown.lesson += r.xp_amount || 0;
      else if (r.source_type === "course") breakdown.course += r.xp_amount || 0;
      else if (r.source_type === "streak") breakdown.streak += r.xp_amount || 0;
    });
    setData(breakdown);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchXp();
  }, [fetchXp]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`xp_events-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "xp_events", filter: `user_id=eq.${user.id}` },
        () => fetchXp()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchXp]);

  return { ...data, loading, refetch: fetchXp };
};
