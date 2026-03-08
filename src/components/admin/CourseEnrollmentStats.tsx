import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, CheckCircle2, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EnrolledUser {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  department: string | null;
  status: string;
  progress_percentage: number;
  enrolled_at: string;
  completed_at: string | null;
}

interface CourseStats {
  courseId: string;
  enrolled: number;
  completed: number;
  inProgress: number;
  avgProgress: number;
}

interface Props {
  courseId: string;
  courseTitle: string;
}

export default function CourseEnrollmentStats({ courseId, courseTitle }: Props) {
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [enrolledUsers, setEnrolledUsers] = useState<EnrolledUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: enrollments, error } = await supabase
        .from("course_enrollments")
        .select("user_id, status, progress_percentage, enrolled_at, completed_at")
        .eq("course_id", courseId);

      if (error) throw error;

      const enrolled = enrollments?.length || 0;
      const completed = enrollments?.filter((e) => e.status === "completed").length || 0;
      const inProgress = enrolled - completed;
      const avgProgress =
        enrolled > 0
          ? Math.round(
              (enrollments?.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) || 0) /
                enrolled
            )
          : 0;

      setStats({ courseId, enrolled, completed, inProgress, avgProgress });

      // Fetch user profiles for enrolled users
      if (enrollments && enrollments.length > 0) {
        const userIds = enrollments.map((e) => e.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url, department")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
        const users: EnrolledUser[] = enrollments.map((e) => {
          const profile = profileMap.get(e.user_id);
          return {
            user_id: e.user_id,
            full_name: profile?.full_name || "Unknown",
            email: profile?.email || "",
            avatar_url: profile?.avatar_url || null,
            department: profile?.department || null,
            status: e.status,
            progress_percentage: e.progress_percentage || 0,
            enrolled_at: e.enrolled_at,
            completed_at: e.completed_at,
          };
        });
        setEnrolledUsers(users);
      }
    } catch (err) {
      console.error("Error fetching enrollment stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [courseId]);

  if (loading || !stats) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-auto py-1 px-2">
          <Users className="h-3.5 w-3.5" />
          <span>{stats.enrolled}</span>
          {stats.completed > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
              {stats.completed} done
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{courseTitle} — Enrollment Details</DialogTitle>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-3 my-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold text-foreground">{stats.enrolled}</p>
            <p className="text-[11px] text-muted-foreground">Enrolled</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
            <p className="text-xl font-bold text-foreground">{stats.completed}</p>
            <p className="text-[11px] text-muted-foreground">Completed</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-amber-500" />
            <p className="text-xl font-bold text-foreground">{stats.inProgress}</p>
            <p className="text-[11px] text-muted-foreground">In Progress</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-xl font-bold text-foreground">{stats.avgProgress}%</p>
            <p className="text-[11px] text-muted-foreground">Avg Progress</p>
          </div>
        </div>

        {/* Completion Rate Bar */}
        {stats.enrolled > 0 && (
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Completion Rate</span>
              <span>{Math.round((stats.completed / stats.enrolled) * 100)}%</span>
            </div>
            <Progress value={(stats.completed / stats.enrolled) * 100} className="h-2" />
          </div>
        )}

        {/* Enrolled Faculty Table */}
        {enrolledUsers.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolledUsers.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {getInitials(u.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{u.full_name}</p>
                          <p className="text-[11px] text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.department || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress value={u.progress_percentage} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground w-8">
                          {u.progress_percentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          u.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        }
                      >
                        {u.status === "completed" ? "Completed" : "In Progress"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No faculty enrolled yet</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
