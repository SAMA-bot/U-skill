import { useState, useEffect } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MotivationIndexCard = () => {
  const [index, setIndex] = useState(0);
  const [components, setComponents] = useState({ streaks: 0, activities: 0, engagement: 0, journal: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) calculate();
  }, [user]);

  const calculate = async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];

    const [streakRes, actRes, motivRes, journalRes] = await Promise.all([
      supabase.from("user_streaks").select("current_streak").eq("user_id", user.id).eq("streak_type", "daily_login").maybeSingle(),
      supabase.from("activities").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed"),
      supabase.from("motivation_scores").select("motivation_index, engagement_score").eq("user_id", user.id).order("year", { ascending: false }).order("week_number", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("reflection_journal").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    // Normalize each to 0-25 (total max 100)
    const streakScore = Math.min((streakRes.data?.current_streak || 0) * 3, 25);
    const activityScore = Math.min((actRes.count || 0) * 2.5, 25);
    const engagementScore = Math.min(((motivRes.data?.engagement_score || 0) / 100) * 25, 25);
    const journalScore = Math.min((journalRes.count || 0) * 2.5, 25);

    setComponents({
      streaks: Math.round(streakScore),
      activities: Math.round(activityScore),
      engagement: Math.round(engagementScore),
      journal: Math.round(journalScore),
    });
    setIndex(Math.round(streakScore + activityScore + engagementScore + journalScore));
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
    { label: "Streaks", value: components.streaks, max: 25 },
    { label: "Activities", value: components.activities, max: 25 },
    { label: "Engagement", value: components.engagement, max: 25 },
    { label: "Reflections", value: components.journal, max: 25 },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Motivation Index
        </CardTitle>
        <CardDescription>Your overall motivation score based on engagement</CardDescription>
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
              />
            </svg>
            <span className="absolute text-2xl font-bold text-foreground">{index}</span>
          </div>
          <div>
            <p className={`text-lg font-semibold ${label.color}`}>{label.text}</p>
            <p className="text-xs text-muted-foreground">out of 100</p>
          </div>
        </div>
        <div className="space-y-2">
          {breakdownItems.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-foreground font-medium">{item.value}/{item.max}</span>
              </div>
              <Progress value={(item.value / item.max) * 100} className="h-1.5" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MotivationIndexCard;
