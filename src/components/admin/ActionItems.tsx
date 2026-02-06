import { useEffect, useState } from "react";
import { AlertTriangle, Award, MessageSquareWarning, FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { Loader2 } from "lucide-react";

interface ActionItem {
  userId: string;
  name: string;
  avatarUrl: string | null;
  department: string | null;
  type: "low_score" | "missing_certificate" | "low_feedback";
  priority: "High" | "Medium";
  detail: string;
}

const typeConfig = {
  low_score: { label: "Low Performance Score", icon: AlertTriangle },
  missing_certificate: { label: "Missing Certificates", icon: FileWarning },
  low_feedback: { label: "Low Feedback Rating", icon: MessageSquareWarning },
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const ActionItems = () => {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedYear, getDateRangeForYear } = useAcademicYear();

  useEffect(() => {
    fetchActionItems();
  }, [selectedYear]);

  const fetchActionItems = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, department, avatar_url");

      if (!profiles) return;

      const dateRange = getDateRangeForYear(selectedYear);
      const startDate = dateRange?.start.toISOString();
      const endDate = dateRange?.end.toISOString();
      const academicStartYear = parseInt(selectedYear.split("-")[0]);

      const actionItems: ActionItem[] = [];

      for (const profile of profiles) {
        // 1. Performance score < 60 (composite from trainings + feedback + publications)
        // Trainings
        let enrollQuery = supabase
          .from("course_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.user_id)
          .eq("status", "completed");
        if (startDate && endDate) {
          enrollQuery = enrollQuery.gte("enrolled_at", startDate).lte("enrolled_at", endDate);
        }
        const { count: enrollCount } = await enrollQuery;

        let actTrainQuery = supabase
          .from("activities")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.user_id)
          .eq("status", "completed")
          .in("activity_type", ["workshop", "seminar", "conference", "training"]);
        if (startDate && endDate) {
          actTrainQuery = actTrainQuery.gte("created_at", startDate).lte("created_at", endDate);
        }
        const { count: actTrainCount } = await actTrainQuery;

        const trainingsCount = (enrollCount || 0) + (actTrainCount || 0);
        const trainingScore = Math.min(Math.round((trainingsCount / 10) * 100), 100);

        // Feedback
        const { data: perfData } = await supabase
          .from("performance_metrics")
          .select("teaching_score")
          .eq("user_id", profile.user_id)
          .or(`year.eq.${academicStartYear},year.eq.${academicStartYear + 1}`);

        let avgFeedback = 0;
        if (perfData && perfData.length > 0) {
          avgFeedback = Math.round(
            perfData.reduce((s, p) => s + (p.teaching_score || 0), 0) / perfData.length
          );
        }

        // Publications
        let pubQuery = supabase
          .from("activities")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.user_id)
          .eq("status", "completed")
          .in("activity_type", ["publication", "research"]);
        if (startDate && endDate) {
          pubQuery = pubQuery.gte("created_at", startDate).lte("created_at", endDate);
        }
        const { count: pubCount } = await pubQuery;
        const pubScore = Math.min(Math.round(((pubCount || 0) / 5) * 100), 100);

        const composite = Math.round(
          trainingScore * 0.3 + avgFeedback * 0.4 + pubScore * 0.3
        );

        if (composite < 60) {
          actionItems.push({
            userId: profile.user_id,
            name: profile.full_name,
            avatarUrl: profile.avatar_url,
            department: profile.department,
            type: "low_score",
            priority: composite < 40 ? "High" : "Medium",
            detail: `Composite score: ${composite}/100`,
          });
        }

        // 2. Missing certificates (no completed trainings/courses at all)
        if (trainingsCount === 0) {
          actionItems.push({
            userId: profile.user_id,
            name: profile.full_name,
            avatarUrl: profile.avatar_url,
            department: profile.department,
            type: "missing_certificate",
            priority: "Medium",
            detail: "No completed trainings or certifications",
          });
        }

        // 3. Low feedback rating (avg teaching_score below 30 out of 100 ≈ below 3/10 scale)
        if (perfData && perfData.length > 0 && avgFeedback < 30) {
          actionItems.push({
            userId: profile.user_id,
            name: profile.full_name,
            avatarUrl: profile.avatar_url,
            department: profile.department,
            type: "low_feedback",
            priority: avgFeedback < 20 ? "High" : "Medium",
            detail: `Avg feedback: ${avgFeedback}/100`,
          });
        }
      }

      // Sort: High priority first
      actionItems.sort((a, b) => (a.priority === "High" ? -1 : 1) - (b.priority === "High" ? -1 : 1));
      setItems(actionItems);
    } catch (err) {
      console.error("Error fetching action items:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No action items — all faculty are performing well!
        </p>
      ) : (
        items.map((item, idx) => {
          const config = typeConfig[item.type];
          const Icon = config.icon;
          return (
            <div
              key={`${item.userId}-${item.type}-${idx}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={item.avatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs">
                  {getInitials(item.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                  <Badge
                    variant={item.priority === "High" ? "destructive" : "secondary"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {item.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{config.label} — {item.detail}</span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ActionItems;
