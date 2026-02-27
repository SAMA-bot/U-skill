import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  History,
  Loader2,
  BookOpen,
  GraduationCap,
  Award,
  FileText,
  CheckCircle,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

interface TimelineEvent {
  id: string;
  date: string;
  type: "activity" | "course" | "document" | "assessment";
  title: string;
  detail: string;
  status?: string;
}

const ICON_MAP = {
  activity: Activity,
  course: GraduationCap,
  document: FileText,
  assessment: Award,
};

const COLOR_MAP = {
  activity: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  course: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  document: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  assessment: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const PerformanceTimeline = () => {
  const { user } = useAuth();
  const { selectedYear, getDateRangeForYear } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (user) fetchTimeline();
  }, [user, selectedYear]);

  const fetchTimeline = async () => {
    if (!user) return;
    setLoading(true);

    const dateRange = getDateRangeForYear(selectedYear);
    const startDate = dateRange?.start.toISOString();
    const endDate = dateRange?.end.toISOString();

    try {
      const results: TimelineEvent[] = [];

      // Fetch completed activities
      let actQuery = supabase
        .from("activities")
        .select("id, title, activity_type, status, completed_at, created_at")
        .eq("user_id", user.id)
        .eq("status", "completed");
      if (startDate && endDate) {
        actQuery = actQuery.gte("created_at", startDate).lte("created_at", endDate);
      }
      const { data: activities } = await actQuery.order("completed_at", { ascending: false }).limit(20);

      (activities || []).forEach((a) => {
        results.push({
          id: `act-${a.id}`,
          date: a.completed_at || a.created_at,
          type: "activity",
          title: a.title,
          detail: `${a.activity_type || "activity"} completed`,
          status: a.status,
        });
      });

      // Fetch completed course enrollments
      let courseQuery = supabase
        .from("course_enrollments")
        .select("id, course_id, completed_at, enrolled_at, status")
        .eq("user_id", user.id)
        .eq("status", "completed");
      if (startDate && endDate) {
        courseQuery = courseQuery.gte("enrolled_at", startDate).lte("enrolled_at", endDate);
      }
      const { data: enrollments } = await courseQuery.limit(20);

      // Fetch course titles
      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map((e) => e.course_id);
        const { data: courses } = await supabase
          .from("courses")
          .select("id, title")
          .in("id", courseIds);

        const courseMap = new Map((courses || []).map((c) => [c.id, c.title]));

        enrollments.forEach((e) => {
          results.push({
            id: `course-${e.id}`,
            date: e.completed_at || e.enrolled_at,
            type: "course",
            title: courseMap.get(e.course_id) || "Course",
            detail: "Course completed",
            status: e.status,
          });
        });
      }

      // Fetch approved documents
      let docQuery = supabase
        .from("faculty_documents")
        .select("id, title, document_type, status, reviewed_at, created_at")
        .eq("user_id", user.id)
        .eq("status", "approved");
      if (startDate && endDate) {
        docQuery = docQuery.gte("created_at", startDate).lte("created_at", endDate);
      }
      const { data: docs } = await docQuery.limit(20);

      (docs || []).forEach((d) => {
        results.push({
          id: `doc-${d.id}`,
          date: d.reviewed_at || d.created_at,
          type: "document",
          title: d.title,
          detail: `${d.document_type} approved`,
          status: d.status,
        });
      });

      // Sort by date descending
      results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents(results.slice(0, 30));
    } catch (err) {
      console.error("Error fetching timeline:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Performance History — {selectedYear}
        </CardTitle>
        <CardDescription>Timeline of your achievements and milestones</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No performance events recorded for this academic year yet.
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {events.map((event, idx) => {
                const Icon = ICON_MAP[event.type];
                const colorClass = COLOR_MAP[event.type];

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="relative flex items-start gap-4 pl-2"
                  >
                    <div
                      className={`relative z-10 flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${colorClass}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-medium text-foreground truncate">
                          {event.title}
                        </h4>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(event.date)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceTimeline;
