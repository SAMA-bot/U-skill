import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, RefreshCw, Users, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/relativeTime";

export interface LessonProgressRow {
  id: string;
  user_id: string;
  learner: string;
  department: string;
  lesson: string;
  path: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  last_activity: string;
  xp_earned: number;
}

/** Active = any lesson activity in the last 7 days. */
export const ACTIVE_WINDOW_DAYS = 7;

export function countActiveLearners(rows: Pick<LessonProgressRow, "user_id" | "last_activity">[], now = Date.now()) {
  const cutoff = now - ACTIVE_WINDOW_DAYS * 86_400_000;
  return new Set(rows.filter(r => new Date(r.last_activity).getTime() >= cutoff).map(r => r.user_id)).size;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

interface Props {
  /** "self" shows the signed-in user's own history; "all" shows every learner (admins only, enforced by access rules). */
  scope: "self" | "all";
}

export default function LessonProgressTable({ scope }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<LessonProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let q = supabase
          .from("lesson_progress")
          .select("id, user_id, lesson_id, status, created_at, updated_at, completed_at, xp_earned")
          .order("updated_at", { ascending: false })
          .limit(1000);
        if (scope === "self") q = q.eq("user_id", user.id);
        const { data: progress, error: pErr } = await q;
        if (pErr) throw pErr;

        const lessonIds = [...new Set((progress ?? []).map(p => p.lesson_id))];
        const userIds = [...new Set((progress ?? []).map(p => p.user_id))];
        const [lessonsRes, profilesRes] = await Promise.all([
          lessonIds.length
            ? supabase.from("lessons").select("id, title, learning_modules(path_id, learning_paths(title))").in("id", lessonIds)
            : Promise.resolve({ data: [], error: null }),
          scope === "all" && userIds.length
            ? supabase.from("profiles").select("user_id, full_name, department").in("user_id", userIds)
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (lessonsRes.error) throw lessonsRes.error;
        if (profilesRes.error) throw profilesRes.error;

        type LessonJoin = { id: string; title: string; learning_modules: { learning_paths: { title: string } | null } | null };
        const lessons = new Map((lessonsRes.data as unknown as LessonJoin[]).map(l => [l.id, l]));
        const profiles = new Map(
          (profilesRes.data as { user_id: string; full_name: string; department: string | null }[]).map(p => [p.user_id, p]),
        );

        if (cancelled) return;
        setRows((progress ?? []).map(p => {
          const l = lessons.get(p.lesson_id);
          const prof = profiles.get(p.user_id);
          return {
            id: p.id,
            user_id: p.user_id,
            learner: scope === "self" ? "You" : prof?.full_name ?? "Unknown",
            department: prof?.department ?? "—",
            lesson: l?.title ?? "Removed lesson",
            path: l?.learning_modules?.learning_paths?.title ?? "—",
            status: p.status,
            started_at: p.created_at,
            completed_at: p.completed_at,
            last_activity: p.updated_at,
            xp_earned: p.xp_earned,
          };
        }));
      } catch (e) {
        console.error("Failed to load lesson progress:", e);
        if (!cancelled) setError("We couldn't load lesson progress. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, scope, reload]);

  const stats = useMemo(() => ({
    completed: rows.filter(r => r.status === "completed").length,
    inProgress: rows.filter(r => r.status !== "completed").length,
    learners: new Set(rows.map(r => r.user_id)).size,
    active: countActiveLearners(rows),
  }), [rows]);

  const columns: DataTableColumn<LessonProgressRow>[] = [
    ...(scope === "all" ? [
      { id: "learner", header: "Faculty", accessor: (r: LessonProgressRow) => r.learner, sortable: true },
      { id: "department", header: "Department", accessor: (r: LessonProgressRow) => r.department, sortable: true, filterable: true },
    ] : []),
    { id: "lesson", header: "Lesson", accessor: r => r.lesson, sortable: true },
    { id: "path", header: "Learning path", accessor: r => r.path, sortable: true, filterable: true },
    {
      id: "status", header: "Status", accessor: r => (r.status === "completed" ? "Completed" : "In progress"),
      sortable: true, filterable: true,
      cell: r => r.status === "completed"
        ? <Badge variant="outline" className="border-success/40 text-success gap-1"><CheckCircle2 className="h-3 w-3" aria-hidden /> Completed</Badge>
        : <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" aria-hidden /> In progress</Badge>,
    },
    { id: "started", header: "Started", accessor: r => r.started_at, sortable: true, excludeFromSearch: true, cell: r => fmt(r.started_at) },
    { id: "completed", header: "Completed", accessor: r => r.completed_at ?? "", sortable: true, excludeFromSearch: true, cell: r => fmt(r.completed_at) },
    {
      id: "activity", header: "Last activity", accessor: r => r.last_activity, sortable: true, excludeFromSearch: true,
      cell: r => <span title={fmt(r.last_activity)}>{formatRelativeTime(new Date(r.last_activity))}</span>,
    },
    { id: "xp", header: "XP", accessor: r => r.xp_earned, sortable: true, align: "right", excludeFromSearch: true },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-lg">{scope === "self" ? "My lesson history" : "Learner activity"}</CardTitle>
          <CardDescription>
            {scope === "self"
              ? "Every lesson you've started or completed, with dates."
              : `Lesson progress across all faculty. Active = activity in the last ${ACTIVE_WINDOW_DAYS} days.`}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => setReload(n => n + 1)} disabled={loading} aria-label="Refresh lesson progress">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={() => setReload(n => n + 1)}>Try again</Button>
          </div>
        ) : (
          <>
            {!loading && (
              <dl className="grid gap-3 grid-cols-2 sm:grid-cols-4 text-sm">
                {scope === "all" && (
                  <div className="rounded-lg border p-3"><dt className="text-muted-foreground flex items-center gap-1"><Activity className="h-3.5 w-3.5" aria-hidden /> Active learners</dt><dd className="text-xl font-semibold tabular-nums">{stats.active}</dd></div>
                )}
                {scope === "all" && (
                  <div className="rounded-lg border p-3"><dt className="text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden /> Learners</dt><dd className="text-xl font-semibold tabular-nums">{stats.learners}</dd></div>
                )}
                <div className="rounded-lg border p-3"><dt className="text-muted-foreground">Completed</dt><dd className="text-xl font-semibold tabular-nums">{stats.completed}</dd></div>
                <div className="rounded-lg border p-3"><dt className="text-muted-foreground">In progress</dt><dd className="text-xl font-semibold tabular-nums">{stats.inProgress}</dd></div>
              </dl>
            )}
            <DataTable
              data={rows}
              columns={columns}
              getRowId={r => r.id}
              isLoading={loading}
              searchPlaceholder={scope === "all" ? "Search faculty or lessons…" : "Search lessons…"}
              pageSize={10}
              maxHeight="480px"
              emptyState={<p className="text-sm text-muted-foreground py-6 text-center">
                {scope === "self" ? "You haven't started any lessons yet." : "No lesson activity yet."}
              </p>}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
