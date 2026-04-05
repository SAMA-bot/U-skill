import { useState, useEffect } from "react";
import { TrendingUp, Loader2, BookOpen, Flame, Zap, PenLine } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MotivationIndexCard = () => {
  const [index, setIndex] = useState(0);
  const [components, setComponents] = useState({ streaks: 0, activities: 0, engagement: 0, journal: 0 });
  const [stats, setStats] = useState({ streak: 0, xp: 0, completedCourses: 0, totalActivities: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) calculate();
  }, [user]);

  const calculate = async () => {
    if (!user) return;

    const [streakRes, actRes, motivRes, journalRes, courseRes, xpRes] = await Promise.all([
      supabase.from("user_streaks").select("current_streak").eq("user_id", user.id).eq("streak_type", "daily_login").maybeSingle(),
      supabase.from("activities").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed"),
      supabase.from("motivation_scores").select("motivation_index, engagement_score").eq("user_id", user.id).order("year", { ascending: false }).order("week_number", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("reflection_journal").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("course_enrollments").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed"),
      supabase.from("lesson_progress").select("xp_earned").eq("user_id", user.id).eq("status", "completed"),
    ]);

    const currentStreak = streakRes.data?.current_streak || 0;
    const activityCount = actRes.count || 0;
    const journalCount = journalRes.count || 0;
    const completedCourses = courseRes.count || 0;
    const totalXp = (xpRes.data || []).reduce((sum: number, r: any) => sum + (r.xp_earned || 0), 0);

    // Normalize each to 0-25 (total max 100)
    const streakScore = Math.min(currentStreak * 3, 25);
    const activityScore = Math.min(activityCount * 2.5, 25);
    const engagementScore = Math.min(((motivRes.data?.engagement_score || 0) / 100) * 25, 25);
    const journalScore = Math.min(journalCount * 2.5, 25);

    setComponents({
      streaks: Math.round(streakScore),
      activities: Math.round(activityScore),
      engagement: Math.round(engagementScore),
      journal: Math.round(journalScore),
    });
    setIndex(Math.round(streakScore + activityScore + engagementScore + journalScore));
    setStats({
      streak: currentStreak,
      xp: totalXp,
      completedCourses,
      totalActivities: activityCount,
    });
    setLoading(false);
  };

  const getLabel = (score: number) => {
    if (score >= 80) return { text: "Highly Motivated", color: "text-green-500" };
    if (score >= 60) return { text: "Motivated", color: "text-blue-500" };
    if (score >= 40) return { text: "Moderate", color: "text-yellow-500" };
    return { text: "Needs Boost", color: "text-orange-500" };
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

  const label = getLabel(index);

  const breakdownItems = [
    { label: "Streaks", value: components.streaks, max: 25, icon: Flame },
    { label: "Activities", value: components.activities, max: 25, icon: Zap },
    { label: "Engagement", value: components.engagement, max: 25, icon: TrendingUp },
    { label: "Reflections", value: components.journal, max: 25, icon: PenLine },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Motivation Index
        </CardTitle>
        <CardDescription>Based on your real engagement data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 mb-4">
          <div className="relative h-24 w-24 flex items-center justify-center">
            <svg className="h-24 w-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                strokeDasharray={`${index * 2.64} 264`}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <span className="absolute text-2xl font-bold text-foreground">{index}</span>
          </div>
          <div>
            <p className={`text-lg font-semibold ${label.color}`}>{label.text}</p>
            <p className="text-xs text-muted-foreground">out of 100</p>
          </div>
        </div>

        {/* Real-time quick stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-lg bg-muted/30 border border-border">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{stats.streak}</p>
            <p className="text-[10px] text-muted-foreground">Day Streak</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-lg font-bold text-foreground">{stats.xp}</p>
            <p className="text-[10px] text-muted-foreground">Total XP</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{stats.completedCourses}</p>
            <p className="text-[10px] text-muted-foreground">Courses Done</p>
          </div>
        </div>

        <div className="space-y-2">
          {breakdownItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Icon className="h-3 w-3" />
                    {item.label}
                  </span>
                  <span className="text-foreground font-medium">{item.value}/{item.max}</span>
                </div>
                <Progress value={(item.value / item.max) * 100} className="h-1.5" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default MotivationIndexCard;
