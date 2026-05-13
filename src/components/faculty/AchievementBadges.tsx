import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Star, BookOpen, Flame, Target, Zap, Trophy, GraduationCap, Loader2, Clock, Filter, ArrowUpDown, SortDesc, SortAsc } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Badge {
  id: string;
  badge_name: string;
  badge_icon: string;
  description: string | null;
  earned_at: string;
}

type BadgeCategory = "all" | "learning" | "streak" | "performance" | "milestone";
type SortOption = "newest" | "oldest" | "name-asc" | "name-desc";

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

const categoryLabels: Record<BadgeCategory, string> = {
  all: "All",
  learning: "Learning",
  streak: "Streaks",
  performance: "Performance",
  milestone: "Milestones",
};

const allBadges = [
  { name: "First Steps", icon: "star", description: "Complete your first activity", category: "milestone" as BadgeCategory },
  { name: "Dedicated Learner", icon: "book", description: "Complete 5 activities", category: "learning" as BadgeCategory },
  { name: "First Course", icon: "graduation", description: "Complete your first course", category: "learning" as BadgeCategory },
  { name: "Course Champion", icon: "graduation", description: "Complete 3 courses", category: "learning" as BadgeCategory },
  { name: "Getting Started", icon: "flame", description: "Reach a 3-day login streak", category: "streak" as BadgeCategory },
  { name: "Streak Master", icon: "flame", description: "Reach a 7-day login streak", category: "streak" as BadgeCategory },
  { name: "Streak Legend", icon: "flame", description: "Reach a 15-day login streak", category: "streak" as BadgeCategory },
  { name: "Unstoppable", icon: "zap", description: "Reach a 30-day login streak", category: "streak" as BadgeCategory },
  { name: "Training Enthusiast", icon: "target", description: "Complete 10 hours of training", category: "performance" as BadgeCategory },
  { name: "Training Expert", icon: "trophy", description: "Complete 50 hours of training", category: "performance" as BadgeCategory },
  { name: "Reflective Mind", icon: "book", description: "Write 5 journal entries", category: "learning" as BadgeCategory },
  { name: "High Performer", icon: "trophy", description: "Reach 80+ performance score", category: "performance" as BadgeCategory },
  { name: "Goal Setter", icon: "target", description: "Set your first performance goal", category: "milestone" as BadgeCategory },
];

const categories: BadgeCategory[] = ["all", "learning", "streak", "performance", "milestone"];

const AchievementBadges = () => {
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<BadgeCategory>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showEarnedOnly, setShowEarnedOnly] = useState(false);
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

  const earnedNames = useMemo(() => new Set(earnedBadges.map((b) => b.badge_name)), [earnedBadges]);

  const filteredAndSortedBadges = useMemo(() => {
    let result = allBadges.map((b) => {
      const earned = earnedBadges.find((eb) => eb.badge_name === b.name);
      return {
        ...b,
        isEarned: !!earned,
        earnedAt: earned?.earned_at || null,
      };
    });

    // Filter by category
    if (activeCategory !== "all") {
      result = result.filter((b) => b.category === activeCategory);
    }

    // Filter earned only
    if (showEarnedOnly) {
      result = result.filter((b) => b.isEarned);
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => {
          if (!a.earnedAt && !b.earnedAt) return 0;
          if (!a.earnedAt) return 1;
          if (!b.earnedAt) return 1;
          return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
        });
        break;
      case "oldest":
        result.sort((a, b) => {
          if (!a.earnedAt && !b.earnedAt) return 0;
          if (!a.earnedAt) return 1;
          if (!b.earnedAt) return 1;
          return new Date(a.earnedAt).getTime() - new Date(b.earnedAt).getTime();
        });
        break;
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return result;
  }, [earnedBadges, activeCategory, sortBy, showEarnedOnly]);

  const earnedCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((c) => {
      if (c === "all") {
        counts[c] = earnedBadges.length;
      } else {
        counts[c] = earnedBadges.filter((eb) => {
          const def = allBadges.find((b) => b.name === eb.badge_name);
          return def?.category === c;
        }).length;
      }
    });
    return counts;
  }, [earnedBadges]);

  const totalByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((c) => {
      if (c === "all") {
        counts[c] = allBadges.length;
      } else {
        counts[c] = allBadges.filter((b) => b.category === c).length;
      }
    });
    return counts;
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Achievement Badges
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {earnedBadges.length}/{allBadges.length}
          </Badge>
        </div>
        <CardDescription>Earn badges by completing activities and reaching milestones</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <ToggleGroup
            type="single"
            value={activeCategory}
            onValueChange={(v) => v && setActiveCategory(v as BadgeCategory)}
            className="flex-wrap gap-1"
          >
            {categories.map((cat) => (
              <ToggleGroupItem
                key={cat}
                value={cat}
                size="sm"
                className="text-xs h-7 px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {categoryLabels[cat]}
                <span className="ml-1.5 text-[10px] opacity-60">
                  {earnedCountByCategory[cat]}/{totalByCategory[cat]}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Sort & View Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex gap-1">
              {([
                { key: "newest", icon: SortDesc, label: "Newest" },
                { key: "oldest", icon: SortAsc, label: "Oldest" },
                { key: "name-asc", icon: ArrowUpDown, label: "A-Z" },
              ] as { key: SortOption; icon: typeof SortDesc; label: string }[]).map((opt) => (
                <Button
                  key={opt.key}
                  variant={sortBy === opt.key ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs gap-1 px-2"
                  onClick={() => setSortBy(opt.key)}
                >
                  <opt.icon className="h-3 w-3" />
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          <Button
            variant={showEarnedOnly ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowEarnedOnly((v) => !v)}
          >
            {showEarnedOnly ? "Showing Earned" : "Show All"}
          </Button>
        </div>

        {/* Badges Grid */}
        <AnimatePresence mode="popLayout">
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {filteredAndSortedBadges.map((badge, i) => {
              const Icon = iconMap[badge.icon] || Award;
              return (
                <motion.div
                  key={badge.name}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className={`flex flex-col items-center p-3 rounded-lg border text-center transition-all ${
                    badge.isEarned
                      ? "border-yellow-500/50 bg-yellow-500/5"
                      : "border-border bg-muted/20 opacity-40 grayscale"
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 ${
                      badge.isEarned ? "bg-yellow-500/20" : "bg-muted"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${badge.isEarned ? "text-yellow-500" : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-xs font-medium text-foreground">{badge.name}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{badge.description}</span>
                  {badge.isEarned && badge.earnedAt && (
                    <span className="text-[9px] text-yellow-600 dark:text-yellow-400 mt-1">
                      {new Date(badge.earnedAt).toLocaleDateString()}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {filteredAndSortedBadges.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No badges match your current filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AchievementBadges;
