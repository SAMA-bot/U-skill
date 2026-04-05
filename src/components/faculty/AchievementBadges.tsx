import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, Star, BookOpen, Flame, Target, Zap, Trophy, GraduationCap, Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  clock: Clock,
};

const allBadges = [
  { name: "First Steps", icon: "star", description: "Complete your first activity" },
  { name: "Dedicated Learner", icon: "book", description: "Complete 5 activities" },
  { name: "First Course", icon: "graduation", description: "Complete your first course" },
  { name: "Course Champion", icon: "graduation", description: "Complete 3 courses" },
  { name: "Getting Started", icon: "flame", description: "Reach a 3-day login streak" },
  { name: "Streak Master", icon: "flame", description: "Reach a 7-day login streak" },
  { name: "Streak Legend", icon: "flame", description: "Reach a 15-day login streak" },
  { name: "Unstoppable", icon: "zap", description: "Reach a 30-day login streak" },
  { name: "Training Enthusiast", icon: "target", description: "Complete 10 hours of training" },
  { name: "Training Expert", icon: "trophy", description: "Complete 50 hours of training" },
  { name: "Reflective Mind", icon: "book", description: "Write 5 journal entries" },
  { name: "High Performer", icon: "trophy", description: "Reach 80+ performance score" },
  { name: "Goal Setter", icon: "target", description: "Set your first performance goal" },
];

const AchievementBadges = () => {
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) checkAndFetchBadges();
  }, [user]);

  const checkAndFetchBadges = async () => {
    if (!user) return;

    try {
      // Call the server-side function to auto-award any new badges
      await supabase.rpc("auto_award_badges" as any);

      // Also do client-side check for "Goal Setter" (needs performance_goals table)
      const { count: goalCount } = await supabase
        .from("performance_goals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if ((goalCount || 0) >= 1) {
        await supabase
          .from("achievement_badges")
          .upsert(
            { user_id: user.id, badge_name: "Goal Setter", badge_icon: "target", description: "Set your first performance goal" },
            { onConflict: "user_id,badge_name", ignoreDuplicates: true }
          );
      }

      // Fetch all earned badges
      const { data } = await supabase
        .from("achievement_badges")
        .select("*")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (data) setEarnedBadges(data as Badge[]);
    } catch (err) {
      console.error("Error checking badges:", err);
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
            const earned = earnedBadges.find((b) => b.badge_name === badge.name);
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
                {isEarned && earned && (
                  <span className="text-[9px] text-yellow-600 dark:text-yellow-400 mt-1">
                    {new Date(earned.earned_at).toLocaleDateString()}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AchievementBadges;
