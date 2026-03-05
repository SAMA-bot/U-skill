import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, Star, BookOpen, Flame, Target, Zap, Trophy, GraduationCap, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Badge {
  id: string;
  badge_name: string;
  badge_icon: string;
  description: string | null;
  earned_at: string;
}

const iconMap: Record<string, typeof Award> = {
  award: Award,
  star: Star,
  book: BookOpen,
  flame: Flame,
  target: Target,
  zap: Zap,
  trophy: Trophy,
  graduation: GraduationCap,
};

const allBadges = [
  { name: "First Steps", icon: "star", description: "Complete your first activity", check: "activity_count >= 1" },
  { name: "Dedicated Learner", icon: "book", description: "Complete 5 activities", check: "activity_count >= 5" },
  { name: "Course Champion", icon: "graduation", description: "Complete 3 courses", check: "course_count >= 3" },
  { name: "Streak Master", icon: "flame", description: "Reach a 7-day login streak", check: "login_streak >= 7" },
  { name: "Goal Setter", icon: "target", description: "Set your first performance goal", check: "has_goals" },
  { name: "Reflective Mind", icon: "book", description: "Write 5 journal entries", check: "journal_count >= 5" },
  { name: "High Performer", icon: "trophy", description: "Reach 80+ performance score", check: "perf_score >= 80" },
  { name: "Unstoppable", icon: "zap", description: "Reach a 30-day login streak", check: "login_streak >= 30" },
];

const AchievementBadges = () => {
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) checkAndFetchBadges();
  }, [user]);

  const checkAndFetchBadges = async () => {
    if (!user) return;

    try {
      // Fetch counts in parallel
      const [activitiesRes, coursesRes, streakRes, journalRes, perfRes] = await Promise.all([
        supabase.from("activities").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed"),
        supabase.from("course_enrollments").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed"),
        supabase.from("user_streaks").select("longest_streak").eq("user_id", user.id).eq("streak_type", "daily_login").maybeSingle(),
        supabase.from("reflection_journal").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("performance_metrics").select("teaching_score, research_score, service_score").eq("user_id", user.id).order("year", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const activityCount = activitiesRes.count || 0;
      const courseCount = coursesRes.count || 0;
      const loginStreak = streakRes.data?.longest_streak || 0;
      const journalCount = journalRes.count || 0;
      const perfScore = perfRes.data
        ? Math.round(((perfRes.data.teaching_score || 0) + (perfRes.data.research_score || 0) + (perfRes.data.service_score || 0)) / 3)
        : 0;

      // Check which badges should be earned
      const shouldEarn: { name: string; icon: string; description: string }[] = [];

      for (const badge of allBadges) {
        let earned = false;
        if (badge.check === "activity_count >= 1") earned = activityCount >= 1;
        else if (badge.check === "activity_count >= 5") earned = activityCount >= 5;
        else if (badge.check === "course_count >= 3") earned = courseCount >= 3;
        else if (badge.check === "login_streak >= 7") earned = loginStreak >= 7;
        else if (badge.check === "has_goals") earned = activityCount >= 1; // Simplified
        else if (badge.check === "journal_count >= 5") earned = journalCount >= 5;
        else if (badge.check === "perf_score >= 80") earned = perfScore >= 80;
        else if (badge.check === "login_streak >= 30") earned = loginStreak >= 30;

        if (earned) shouldEarn.push({ name: badge.name, icon: badge.icon, description: badge.description });
      }

      // Insert new badges (ignore conflicts)
      for (const badge of shouldEarn) {
        await supabase
          .from("achievement_badges")
          .upsert(
            { user_id: user.id, badge_name: badge.name, badge_icon: badge.icon, description: badge.description },
            { onConflict: "user_id,badge_name", ignoreDuplicates: true }
          );
      }

      // Fetch earned badges
      const { data } = await supabase
        .from("achievement_badges")
        .select("*")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (data) setEarnedBadges(data as Badge[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const earnedNames = new Set(earnedBadges.map((b) => b.badge_name));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          Achievement Badges
        </CardTitle>
        <CardDescription>
          {earnedBadges.length}/{allBadges.length} badges earned
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {allBadges.map((badge, i) => {
            const isEarned = earnedNames.has(badge.name);
            const Icon = iconMap[badge.icon] || Award;
            return (
              <motion.div
                key={badge.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`flex flex-col items-center p-3 rounded-lg border text-center transition-all ${
                  isEarned
                    ? "border-yellow-500/50 bg-yellow-500/5"
                    : "border-border bg-muted/20 opacity-40 grayscale"
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 ${
                    isEarned ? "bg-yellow-500/20" : "bg-muted"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isEarned ? "text-yellow-500" : "text-muted-foreground"}`} />
                </div>
                <span className="text-xs font-medium text-foreground">{badge.name}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">{badge.description}</span>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AchievementBadges;
