import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LucideIcon } from "lucide-react";

type MetricType =
  | "capacity"
  | "performance"
  | "motivation"
  | "training_hours"
  | "total_faculty"
  | "avg_performance"
  | "avg_capacity"
  | "avg_motivation"
  | "departments"
  | "completed_trainings";

interface MetricDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricType: MetricType;
  metricLabel: string;
  metricValue: number;
  metricSuffix: string;
  metricIcon: LucideIcon;
  userId?: string;
  onNavigate?: (section: string) => void;
}

interface DetailItem {
  label: string;
  value: number;
  max?: number;
  sublabel?: string;
}

const MetricDetailSheet = ({
  open,
  onOpenChange,
  metricType,
  metricLabel,
  metricValue,
  metricSuffix,
  metricIcon: Icon,
  userId,
  onNavigate,
}: MetricDetailSheetProps) => {
  const [details, setDetails] = useState<DetailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    if (open) {
      fetchDetails();
    }
  }, [open, metricType, userId]);

  const fetchDetails = async () => {
    setLoading(true);
    setDetails([]);
    setSummary("");

    try {
      switch (metricType) {
        case "capacity": {
          const { data } = await supabase
            .from("capacity_skills")
            .select("skill_name, current_level, target_level")
            .eq("user_id", userId!);
          if (data) {
            setDetails(
              data.map((s) => ({
                label: s.skill_name,
                value: s.current_level || 0,
                max: s.target_level || 100,
                sublabel: `Target: ${s.target_level || 100}`,
              }))
            );
            setSummary(
              data.length > 0
                ? `You have ${data.length} tracked skills. ${data.filter((s) => (s.current_level || 0) >= (s.target_level || 100)).length} have reached their target.`
                : "No skills tracked yet. Complete courses to build your capacity."
            );
          }
          break;
        }
        case "performance": {
          const { data } = await supabase
            .from("performance_metrics")
            .select("month, year, teaching_score, research_score, service_score")
            .eq("user_id", userId!)
            .order("year", { ascending: false })
            .order("month", { ascending: false })
            .limit(6);
          if (data && data.length > 0) {
            const latest = data[0];
            setDetails([
              { label: "Teaching", value: latest.teaching_score || 0, max: 100 },
              { label: "Research", value: latest.research_score || 0, max: 100 },
              { label: "Service", value: latest.service_score || 0, max: 100 },
            ]);
            if (data.length >= 2) {
              const prev = data[1];
              const latestAvg = Math.round(((latest.teaching_score || 0) + (latest.research_score || 0) + (latest.service_score || 0)) / 3);
              const prevAvg = Math.round(((prev.teaching_score || 0) + (prev.research_score || 0) + (prev.service_score || 0)) / 3);
              const diff = latestAvg - prevAvg;
              setSummary(
                `Latest: ${latest.month} ${latest.year}. ${diff > 0 ? `Up ${diff} points` : diff < 0 ? `Down ${Math.abs(diff)} points` : "No change"} from previous period.`
              );
            } else {
              setSummary(`Latest: ${latest.month} ${latest.year}.`);
            }
          } else {
            setSummary("No performance data recorded yet.");
          }
          break;
        }
        case "motivation": {
          const { data } = await supabase
            .from("motivation_scores")
            .select("week_number, year, motivation_index, engagement_score")
            .eq("user_id", userId!)
            .order("year", { ascending: false })
            .order("week_number", { ascending: false })
            .limit(8);
          if (data && data.length > 0) {
            setDetails(
              data.map((s) => ({
                label: `Week ${s.week_number}, ${s.year}`,
                value: s.motivation_index || 0,
                max: 100,
                sublabel: `Engagement: ${s.engagement_score || 0}%`,
              }))
            );
            const trend = data.length >= 2 ? (data[0].motivation_index || 0) - (data[1].motivation_index || 0) : 0;
            setSummary(
              `${data.length} weeks tracked. ${trend > 0 ? `Trending up +${trend}` : trend < 0 ? `Trending down ${trend}` : "Stable"} this week.`
            );
          } else {
            setSummary("No motivation data recorded yet.");
          }
          break;
        }
        case "training_hours": {
          const { data } = await supabase
            .from("activities")
            .select("title, status, activity_type, completed_at")
            .eq("user_id", userId!)
            .eq("status", "completed")
            .order("completed_at", { ascending: false })
            .limit(10);
          if (data) {
            setDetails(
              data.map((a) => ({
                label: a.title,
                value: 4, // Each activity = 4 hours
                max: 4,
                sublabel: a.activity_type || "Workshop",
              }))
            );
            setSummary(
              `${data.length} completed activities (${data.length * 4} training hours).`
            );
          }
          break;
        }
        case "total_faculty":
        case "avg_performance":
        case "avg_capacity":
        case "avg_motivation": {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("full_name, department, designation, user_id");
          if (profiles) {
            const items: DetailItem[] = [];
            for (const p of profiles.slice(0, 10)) {
              if (metricType === "total_faculty") {
                items.push({ label: p.full_name, value: 0, sublabel: p.department || "Unassigned" });
              } else {
                const { data: perf } = await supabase
                  .from(metricType === "avg_motivation" ? "motivation_scores" : "performance_metrics")
                  .select("*")
                  .eq("user_id", p.user_id)
                  .order(metricType === "avg_motivation" ? "year" : "year", { ascending: false })
                  .limit(1)
                  .maybeSingle();
                let score = 0;
                if (perf) {
                  if (metricType === "avg_performance") {
                    score = Math.round(((perf.teaching_score || 0) + (perf.research_score || 0) + (perf.service_score || 0)) / 3);
                  } else if (metricType === "avg_motivation") {
                    score = perf.motivation_index || 0;
                  } else if (metricType === "avg_capacity") {
                    const { data: skills } = await supabase
                      .from("capacity_skills")
                      .select("current_level")
                      .eq("user_id", p.user_id);
                    score = skills && skills.length > 0
                      ? Math.round(skills.reduce((s, sk) => s + (sk.current_level || 0), 0) / skills.length)
                      : 0;
                  }
                }
                items.push({ label: p.full_name, value: score, max: 100, sublabel: p.department || "Unassigned" });
              }
            }
            if (metricType !== "total_faculty") {
              items.sort((a, b) => b.value - a.value);
            }
            setDetails(items);
            const deptMap = new Map<string, number>();
            profiles.forEach((p) => {
              const d = p.department || "Unassigned";
              deptMap.set(d, (deptMap.get(d) || 0) + 1);
            });
            setSummary(
              metricType === "total_faculty"
                ? `${profiles.length} faculty across ${deptMap.size} departments.`
                : `Showing top ${Math.min(10, profiles.length)} faculty by ${metricLabel.toLowerCase().replace("avg ", "")}.`
            );
          }
          break;
        }
        case "departments": {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("department");
          if (profiles) {
            const deptMap = new Map<string, number>();
            profiles.forEach((p) => {
              const d = p.department || "Unassigned";
              deptMap.set(d, (deptMap.get(d) || 0) + 1);
            });
            setDetails(
              Array.from(deptMap.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([dept, count]) => ({
                  label: dept,
                  value: count,
                  sublabel: `${count} faculty member${count !== 1 ? "s" : ""}`,
                }))
            );
            setSummary(`${deptMap.size} departments with ${profiles.length} total faculty.`);
          }
          break;
        }
        case "completed_trainings": {
          const { data } = await supabase
            .from("activities")
            .select("title, user_id, activity_type, completed_at")
            .eq("status", "completed")
            .order("completed_at", { ascending: false })
            .limit(15);
          if (data) {
            setDetails(
              data.map((a) => ({
                label: a.title,
                value: 1,
                sublabel: a.activity_type || "Workshop",
              }))
            );
            setSummary(`${data.length} recently completed trainings across all faculty.`);
          }
          break;
        }
      }
    } catch (err) {
      console.error("Error fetching metric details:", err);
      setSummary("Failed to load details.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (value: number, max: number = 100) => {
    const pct = (value / max) * 100;
    if (pct >= 80) return "text-green-600 dark:text-green-400";
    if (pct >= 60) return "text-amber-600 dark:text-amber-400";
    if (pct >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getProgressColor = (value: number, max: number = 100) => {
    const pct = (value / max) * 100;
    if (pct >= 80) return "bg-green-500";
    if (pct >= 60) return "bg-amber-500";
    if (pct >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getSectionForMetric = (): string | null => {
    switch (metricType) {
      case "capacity":
      case "avg_capacity":
      case "completed_trainings":
        return "courses";
      case "performance":
      case "avg_performance":
        return "reports";
      case "motivation":
      case "avg_motivation":
        return "motivation";
      case "training_hours":
        return "activities";
      case "total_faculty":
        return "faculty";
      case "departments":
        return "departments";
      default:
        return null;
    }
  };

  const section = getSectionForMetric();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg">{metricLabel}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-bold text-foreground">
                  {metricValue}
                  {metricSuffix}
                </span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5 mt-2">
            {/* Summary */}
            {summary && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-muted/50 border border-border"
              >
                <p className="text-sm text-muted-foreground">{summary}</p>
              </motion.div>
            )}

            {/* Detail items */}
            <div className="space-y-3">
              {details.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.label}
                      </p>
                      {item.sublabel && (
                        <p className="text-xs text-muted-foreground">{item.sublabel}</p>
                      )}
                    </div>
                    {item.max && item.max > 1 && (
                      <span className={`text-sm font-semibold ml-3 ${getScoreColor(item.value, item.max)}`}>
                        {item.value}/{item.max}
                      </span>
                    )}
                  </div>
                  {item.max && item.max > 1 && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.04 }}
                        className={`h-full rounded-full ${getProgressColor(item.value, item.max)}`}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {details.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No detailed data available yet.</p>
              </div>
            )}

            {/* Navigate action */}
            {section && onNavigate && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onNavigate(section);
                    onOpenChange(false);
                  }}
                >
                  View Full {metricLabel} Section
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default MetricDetailSheet;
