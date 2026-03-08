import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, Check, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePerformanceScore } from "@/hooks/usePerformanceScore";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { useToast } from "@/hooks/use-toast";
import { getPerformanceBadgeColor, getPerformanceBadgeLabel } from "@/lib/performanceUtils";
import AnimatedCounter from "@/components/dashboard/AnimatedCounter";

const FacultyProgressTracker = () => {
  const { user } = useAuth();
  const { selectedYear } = useAcademicYear();
  const performanceData = usePerformanceScore(user?.id);
  const { toast } = useToast();

  const [targetScore, setTargetScore] = useState(80);
  const [savedTarget, setSavedTarget] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchGoal();
  }, [user, selectedYear]);

  const fetchGoal = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("performance_goals")
        .select("target_score")
        .eq("user_id", user.id)
        .eq("academic_year", selectedYear)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setTargetScore(data.target_score);
        setSavedTarget(data.target_score);
      } else {
        setSavedTarget(null);
        setTargetScore(80);
      }
    } catch (err) {
      console.error("Error fetching goal:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveGoal = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("performance_goals")
        .upsert(
          {
            user_id: user.id,
            target_score: targetScore,
            academic_year: selectedYear,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,academic_year" }
        );

      if (error) throw error;
      setSavedTarget(targetScore);
      setEditing(false);
      toast({ title: "Goal saved", description: `Target set to ${targetScore}/100` });
    } catch (err: any) {
      console.error("Error saving goal:", err);
      toast({ title: "Error", description: "Failed to save goal", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const currentScore = performanceData.compositeScore;
  const target = savedTarget ?? 80;
  const progressPercent = target > 0 ? Math.min(Math.round((currentScore / target) * 100), 100) : 0;
  const remaining = Math.max(target - currentScore, 0);
  const goalReached = currentScore >= target;

  if (loading || performanceData.loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      <div className="px-4 py-5 sm:px-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-primary to-accent rounded-md p-1.5">
              <Target className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">Progress Tracker</h3>
              <p className="text-xs text-muted-foreground">
                {selectedYear} performance goal
              </p>
            </div>
          </div>
          {savedTarget !== null && !editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* No goal set yet OR editing */}
        {(savedTarget === null || editing) ? (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Set your target performance score
              </label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[targetScore]}
                  onValueChange={(v) => setTargetScore(v[0])}
                  min={10}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-2xl font-bold text-foreground w-14 text-right">
                  {targetScore}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                <span>10</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveGoal} disabled={saving} size="sm" className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                {savedTarget === null ? "Set Goal" : "Update Goal"}
              </Button>
              {editing && (
                <Button variant="outline" size="sm" onClick={() => { setEditing(false); setTargetScore(savedTarget ?? 80); }}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Score vs Target */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Score</p>
                <div className="flex items-baseline gap-1.5">
                  <AnimatedCounter
                    value={currentScore}
                    className="text-3xl font-bold text-foreground"
                  />
                  <span className="text-sm text-muted-foreground">/ {target}</span>
                </div>
              </div>
              <div className="text-right">
                {goalReached ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                    🎉 Goal Reached!
                  </Badge>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className="text-lg font-semibold text-foreground">{remaining} pts</p>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="relative">
                <Progress value={progressPercent} className="h-3" />
              </div>
            </div>

            {/* Performance Badge */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Current standing</span>
              <Badge className={`text-xs ${getPerformanceBadgeColor(currentScore)}`}>
                {getPerformanceBadgeLabel(currentScore)}
              </Badge>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FacultyProgressTracker;
