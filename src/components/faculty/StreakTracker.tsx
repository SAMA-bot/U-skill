import { useState, useEffect } from "react";
import { Flame, Zap, Calendar, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Streak {
  streak_type: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

const streakConfig: Record<string, { label: string; icon: typeof Flame; color: string }> = {
  daily_login: { label: "Login Streak", icon: Flame, color: "text-orange-500" },
  activity_completion: { label: "Activity Streak", icon: Zap, color: "text-yellow-500" },
  journal_streak: { label: "Journal Streak", icon: Calendar, color: "text-blue-500" },
};

const StreakTracker = () => {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAndUpdateStreaks();
    }
  }, [user]);

  const fetchAndUpdateStreaks = async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];

    // Ensure streak rows exist
    for (const type of ["daily_login", "activity_completion", "journal_streak"]) {
      await supabase
        .from("user_streaks")
        .upsert(
          { user_id: user.id, streak_type: type, current_streak: 0, longest_streak: 0 },
          { onConflict: "user_id,streak_type", ignoreDuplicates: true }
        );
    }

    // Update login streak
    const { data: loginStreak } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .eq("streak_type", "daily_login")
      .single();

    if (loginStreak) {
      const last = loginStreak.last_activity_date;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (last !== today) {
        const newStreak = last === yesterdayStr ? (loginStreak.current_streak || 0) + 1 : 1;
        const longest = Math.max(newStreak, loginStreak.longest_streak || 0);
        await supabase
          .from("user_streaks")
          .update({ current_streak: newStreak, longest_streak: longest, last_activity_date: today })
          .eq("user_id", user.id)
          .eq("streak_type", "daily_login");
      }
    }

    // Fetch all streaks
    const { data } = await supabase
      .from("user_streaks")
      .select("streak_type, current_streak, longest_streak, last_activity_date")
      .eq("user_id", user.id);

    if (data) setStreaks(data as Streak[]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Streak Tracker
        </CardTitle>
        <CardDescription>Keep your momentum going!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {streaks.map((streak) => {
            const config = streakConfig[streak.streak_type] || {
              label: streak.streak_type,
              icon: Flame,
              color: "text-primary",
            };
            const Icon = config.icon;
            return (
              <div
                key={streak.streak_type}
                className="flex flex-col items-center p-4 rounded-lg border border-border bg-muted/30 text-center"
              >
                <Icon className={`h-8 w-8 ${config.color} mb-2`} />
                <span className="text-2xl font-bold text-foreground">{streak.current_streak}</span>
                <span className="text-xs text-muted-foreground">{config.label}</span>
                <div className="flex items-center gap-1 mt-2">
                  <Trophy className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Best: {streak.longest_streak}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default StreakTracker;
