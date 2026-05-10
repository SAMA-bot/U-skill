import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Award, Star, BookOpen, Flame, Target, Zap, GraduationCap, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUserXp } from "@/hooks/useUserXp";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getLevelInfo } from "@/lib/levelUtils";

interface Badge {
  id: string;
  badge_name: string;
  badge_icon: string;
  earned_at: string;
}

const iconMap: Record<string, typeof Award> = {
  award: Award, star: Star, book: BookOpen, flame: Flame,
  target: Target, zap: Zap, trophy: Trophy, graduation: GraduationCap,
};

const LevelCard = () => {
  const { total, loading: xpLoading } = useUserXp();
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        await supabase.rpc("auto_award_badges" as any);
      } catch {}
      const { data } = await supabase
        .from("achievement_badges")
        .select("id, badge_name, badge_icon, earned_at")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });
      setBadges((data || []) as Badge[]);
      setLoading(false);
    };
    load();
  }, [user, total]);

  const info = getLevelInfo(total);

  if (xpLoading || loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Level & Badges
        </CardTitle>
        <CardDescription>Your XP rank and earned achievements</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <motion.div
            key={info.level}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
          >
            <span className="text-2xl font-bold text-primary-foreground">{info.level}</span>
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-foreground truncate">{info.title}</p>
            <p className="text-xs text-muted-foreground mb-1.5">
              {info.currentLevelXp} / {info.nextLevelXp} XP to level {info.level + 1}
            </p>
            <Progress value={info.progressPct} className="h-2" />
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5 text-yellow-500" />
              Earned Badges
            </p>
            <span className="text-xs text-muted-foreground">{badges.length}</span>
          </div>
          {badges.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              Complete activities and lessons to earn your first badge!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {badges.slice(0, 8).map((b, i) => {
                const Icon = iconMap[b.badge_icon] || Award;
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    title={b.badge_name}
                    className="h-9 w-9 rounded-full bg-yellow-500/15 border border-yellow-500/40 flex items-center justify-center"
                  >
                    <Icon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </motion.div>
                );
              })}
              {badges.length > 8 && (
                <div className="h-9 px-2 rounded-full bg-muted border border-border flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">+{badges.length - 8}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LevelCard;
