import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, FileX, ThumbsDown, BookOpen, Loader2, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

interface AlertItem {
  id: string;
  facultyName: string;
  avatarUrl: string | null;
  type: "missing_documents" | "low_feedback" | "incomplete_training";
  detail: string;
  priority: "high" | "medium";
}

interface DepartmentAlertsProps {
  department: string;
}

const ALERT_CONFIG = {
  missing_documents: {
    icon: FileX,
    label: "Missing Documents",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  low_feedback: {
    icon: ThumbsDown,
    label: "Low Feedback",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  incomplete_training: {
    icon: BookOpen,
    label: "Incomplete Training",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
};

const DepartmentAlerts = ({ department }: DepartmentAlertsProps) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedYear, getDateRangeForYear } = useAcademicYear();

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const dateRange = getDateRangeForYear(selectedYear);
      const startDate = dateRange?.start.toISOString();
      const endDate = dateRange?.end.toISOString();

      // Get faculty in department
      const { data: faculty } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .eq("department", department);

      if (!faculty || faculty.length === 0) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      const facultyIds = faculty.map((f) => f.user_id);
      const facultyMap = Object.fromEntries(faculty.map((f) => [f.user_id, f]));

      // Fetch all data in parallel
      const [docsRes, feedbackRes, enrollRes] = await Promise.all([
        supabase
          .from("faculty_documents")
          .select("user_id, status")
          .in("user_id", facultyIds),
        supabase
          .from("faculty_feedback")
          .select("faculty_id, rating")
          .in("faculty_id", facultyIds),
        (() => {
          let q = supabase
            .from("course_enrollments")
            .select("user_id, status")
            .in("user_id", facultyIds);
          if (startDate && endDate) {
            q = q.gte("enrolled_at", startDate).lte("enrolled_at", endDate);
          }
          return q;
        })(),
      ]);

      const newAlerts: AlertItem[] = [];

      // 1. Missing documents — faculty with zero verified documents
      const docsPerUser: Record<string, number> = {};
      (docsRes.data || []).forEach((d) => {
        if (d.status === "verified") {
          docsPerUser[d.user_id] = (docsPerUser[d.user_id] || 0) + 1;
        }
      });
      facultyIds.forEach((uid) => {
        if (!docsPerUser[uid]) {
          const f = facultyMap[uid];
          newAlerts.push({
            id: `doc-${uid}`,
            facultyName: f.full_name,
            avatarUrl: f.avatar_url,
            type: "missing_documents",
            detail: "No verified documents uploaded",
            priority: "medium",
          });
        }
      });

      // 2. Low feedback — average rating below 3 out of 5
      const feedbackPerUser: Record<string, number[]> = {};
      (feedbackRes.data || []).forEach((fb) => {
        if (!feedbackPerUser[fb.faculty_id]) feedbackPerUser[fb.faculty_id] = [];
        feedbackPerUser[fb.faculty_id].push(fb.rating);
      });
      Object.entries(feedbackPerUser).forEach(([uid, ratings]) => {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        if (avg < 3) {
          const f = facultyMap[uid];
          if (!f) return;
          newAlerts.push({
            id: `fb-${uid}`,
            facultyName: f.full_name,
            avatarUrl: f.avatar_url,
            type: "low_feedback",
            detail: `Average rating: ${avg.toFixed(1)}/5`,
            priority: avg < 2 ? "high" : "medium",
          });
        }
      });

      // 3. Incomplete trainings — enrolled/in_progress but not completed
      const enrollPerUser: Record<string, { total: number; incomplete: number }> = {};
      (enrollRes.data || []).forEach((e) => {
        if (!enrollPerUser[e.user_id]) enrollPerUser[e.user_id] = { total: 0, incomplete: 0 };
        enrollPerUser[e.user_id].total++;
        if (e.status !== "completed") enrollPerUser[e.user_id].incomplete++;
      });
      Object.entries(enrollPerUser).forEach(([uid, counts]) => {
        if (counts.incomplete > 0) {
          const f = facultyMap[uid];
          if (!f) return;
          newAlerts.push({
            id: `train-${uid}`,
            facultyName: f.full_name,
            avatarUrl: f.avatar_url,
            type: "incomplete_training",
            detail: `${counts.incomplete} of ${counts.total} trainings incomplete`,
            priority: counts.incomplete >= 3 ? "high" : "medium",
          });
        }
      });

      // Sort: high priority first
      newAlerts.sort((a, b) => (a.priority === "high" ? -1 : 1) - (b.priority === "high" ? -1 : 1));
      setAlerts(newAlerts);
    } catch (err) {
      console.error("Error fetching department alerts:", err);
    } finally {
      setLoading(false);
    }
  }, [department, selectedYear, getDateRangeForYear]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Department Alerts
        </CardTitle>
        <CardDescription>
          {alerts.length > 0
            ? `${alerts.length} alert${alerts.length !== 1 ? "s" : ""} requiring attention`
            : "No alerts — everything looks good!"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <p className="text-sm">All faculty are on track</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {alerts.map((alert, idx) => {
              const config = ALERT_CONFIG[alert.type];
              const Icon = config.icon;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={alert.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(alert.facultyName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{alert.facultyName}</p>
                    <p className="text-xs text-muted-foreground">{alert.detail}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-[10px] ${config.color}`}>
                      <Icon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        alert.priority === "high"
                          ? "border-red-300 text-red-700 dark:border-red-800 dark:text-red-400"
                          : "border-yellow-300 text-yellow-700 dark:border-yellow-800 dark:text-yellow-400"
                      }`}
                    >
                      {alert.priority === "high" ? "High" : "Medium"}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DepartmentAlerts;
