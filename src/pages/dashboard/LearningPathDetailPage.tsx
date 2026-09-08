import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, BookOpen, CheckCircle2, Clock, Flame, Lock, Play,
  Signal, Star, Trophy, Loader2, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import SmartEmptyState from "@/components/dashboard/SmartEmptyState";
import { ThemeToggle } from "@/components/ThemeToggle";
import LessonViewerDialog, { type ViewerLesson } from "@/components/faculty/LessonViewerDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { getPathThumbnail } from "@/lib/thumbnailUtils";
import { cn } from "@/lib/utils";

interface LearningPath {
  id: string; title: string; description: string | null;
  icon: string; color: string; is_published: boolean; thumbnail_url: string | null;
  difficulty: string | null; estimated_hours: number | null; target_audience: string | null;
}
interface LearningModule {
  id: string; path_id: string; title: string; description: string | null; sort_order: number;
}
interface Lesson {
  id: string; module_id: string; title: string; description: string | null;
  xp_reward: number; sort_order: number; duration_minutes?: number | null;
}

type NodeState = "locked" | "available" | "in_progress" | "completed";

const difficultyClass = (difficulty: string | null) => {
  switch (difficulty) {
    case "advanced": return "text-destructive border-destructive/30";
    case "intermediate": return "text-warning border-warning/30";
    default: return "text-success border-success/30";
  }
};

const LearningPathDetailPage = () => {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [path, setPath] = useState<LearningPath | null>(null);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({});
  const [loading, setLoading] = useState(true);
  const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null);

  const { isLessonCompleted, getLessonStatus, completeLesson, startLesson } = useLessonProgress();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!pathId) return;
    const load = async () => {
      try {
        const { data: pathData, error } = await supabase
          .from("learning_paths").select("*").eq("id", pathId).maybeSingle();
        if (error) throw error;
        if (!pathData) { setPath(null); return; }
        setPath(pathData as LearningPath);

        const { data: mods } = await supabase
          .from("learning_modules").select("*")
          .eq("path_id", pathId).order("sort_order", { ascending: true });
        const moduleList = (mods || []) as LearningModule[];
        setModules(moduleList);

        if (moduleList.length > 0) {
          const { data: allLessons } = await supabase
            .from("lessons").select("*")
            .in("module_id", moduleList.map(m => m.id))
            .order("sort_order", { ascending: true });
          const grouped: Record<string, Lesson[]> = {};
          for (const l of (allLessons || []) as Lesson[]) {
            (grouped[l.module_id] ||= []).push(l);
          }
          setLessonsByModule(grouped);
        }
      } catch (err: any) {
        toast({ title: "Error loading path", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pathId]);

  const allLessons: Lesson[] = modules.flatMap(m => lessonsByModule[m.id] || []);
  const completedLessons = allLessons.filter(l => isLessonCompleted(l.id));
  const totalXp = allLessons.reduce((s, l) => s + l.xp_reward, 0);
  const earnedXp = completedLessons.reduce((s, l) => s + l.xp_reward, 0);
  const percent = allLessons.length > 0 ? Math.round((completedLessons.length / allLessons.length) * 100) : 0;
  const isPathComplete = allLessons.length > 0 && completedLessons.length === allLessons.length;
  const nextLesson = allLessons.find(l => !isLessonCompleted(l.id));
  const hasStarted = completedLessons.length > 0 || allLessons.some(l => getLessonStatus(l.id) === "in_progress");

  const getState = (lesson: Lesson, index: number): NodeState => {
    const status = getLessonStatus(lesson.id);
    if (status === "completed") return "completed";
    if (status === "in_progress") return "in_progress";
    if (index === 0) return "available";
    const prev = allLessons[index - 1];
    return prev && isLessonCompleted(prev.id) ? "available" : "locked";
  };

  const openLesson = async (lesson: Lesson, state: NodeState) => {
    if (state === "locked") return;
    await startLesson(lesson.id);
    setViewingLesson(lesson);
  };

  const handleCta = () => {
    const target = isPathComplete ? allLessons[0] : nextLesson;
    if (target) openLesson(target, isPathComplete ? "completed" : getState(target, allLessons.indexOf(target)));
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!path) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <SmartEmptyState
          icon={BookOpen}
          title="Course not found"
          description="This learning path doesn't exist or is no longer published."
          actionLabel="Back to Learning Paths"
          onAction={() => navigate("/dashboard")}
        />
      </div>
    );
  }

  const ctaLabel = isPathComplete ? "Review course" : hasStarted ? "Resume learning" : "Start learning";
  const CtaIcon = isPathComplete ? RotateCcw : Play;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-foreground leading-tight truncate">{path.title}</h1>
              <p className="text-xs text-muted-foreground">
                {allLessons.length} lesson{allLessons.length !== 1 ? "s" : ""} · {modules.length} chapter{modules.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          <div className="relative h-36 sm:h-44">
            <img
              src={getPathThumbnail(path)}
              alt={`${path.title} course cover`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
            {isPathComplete && (
              <Badge className="absolute top-3 right-3 bg-success/15 text-success border border-success/30 text-[10px]">
                <Trophy className="h-3 w-3 mr-0.5" /> Completed
              </Badge>
            )}
          </div>
          <div className="p-5 space-y-4">
            {path.description && <p className="text-sm text-muted-foreground">{path.description}</p>}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={cn("text-[10px] capitalize gap-1", difficultyClass(path.difficulty))}>
                <Signal className="h-3 w-3" />{path.difficulty || "beginner"}
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {path.estimated_hours && path.estimated_hours > 0
                  ? `${path.estimated_hours}h`
                  : `${Math.max(1, Math.round(allLessons.reduce((s, l) => s + (l.duration_minutes || 15), 0) / 60))}h`}
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1 text-primary border-primary/30 tabular-nums">
                <Star className="h-3 w-3" />{earnedXp}/{totalXp} XP
              </Badge>
              {path.target_audience && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">{path.target_audience}</Badge>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground tabular-nums">
                  {completedLessons.length} of {allLessons.length} lessons completed
                </span>
                <span className="font-semibold text-foreground tabular-nums">{percent}%</span>
              </div>
              <Progress value={percent} className="h-2" animated={false} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Button className="gap-2" onClick={handleCta} disabled={allLessons.length === 0}>
                <CtaIcon className="h-4 w-4" /> {ctaLabel}
              </Button>
              {!isPathComplete && nextLesson && (
                <p className="text-xs text-muted-foreground truncate">
                  Next up: <span className="text-foreground font-medium">{nextLesson.title}</span> · +{nextLesson.xp_reward} XP
                </p>
              )}
              {isPathComplete && (
                <p className="text-xs text-success flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5" /> You earned all {totalXp} XP in this course.
                </p>
              )}
            </div>
          </div>
        </motion.section>

        {/* Chapters */}
        {allLessons.length === 0 ? (
          <SmartEmptyState
            icon={BookOpen}
            title="No lessons yet"
            description="This course doesn't have any chapters published yet. Check back soon."
          />
        ) : (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Course content</h2>
            {modules.map((mod, mi) => {
              const modLessons = lessonsByModule[mod.id] || [];
              const modDone = modLessons.filter(l => isLessonCompleted(l.id)).length;
              const priorCount = modules.slice(0, mi).reduce((s, m) => s + (lessonsByModule[m.id] || []).length, 0);

              return (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: mi * 0.05 }}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
                    <div className="h-7 w-7 rounded-md bg-accent/15 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-accent-foreground">{mi + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground truncate">{mod.title}</h3>
                      {mod.description && <p className="text-xs text-muted-foreground truncate">{mod.description}</p>}
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{modDone}/{modLessons.length}</span>
                  </div>

                  <ul className="divide-y divide-border/50">
                    {modLessons.map((lesson, li) => {
                      const state = getState(lesson, priorCount + li);
                      const locked = state === "locked";
                      const Icon = state === "completed" ? CheckCircle2 : locked ? Lock : Play;
                      return (
                        <li key={lesson.id}>
                          <button
                            disabled={locked}
                            onClick={() => openLesson(lesson, state)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                              locked ? "cursor-not-allowed opacity-60" : "hover:bg-muted/40"
                            )}
                          >
                            <span className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center border shrink-0",
                              state === "completed" ? "bg-success/15 border-success/40 text-success"
                                : state === "in_progress" ? "bg-accent/15 border-accent/40 text-accent-foreground"
                                : locked ? "bg-muted border-border text-muted-foreground"
                                : "bg-primary/10 border-primary/40 text-primary"
                            )}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-foreground truncate">{lesson.title}</span>
                              <span className="block text-[11px] text-muted-foreground">
                                {lesson.duration_minutes ? `${lesson.duration_minutes} min · ` : ""}
                                {state === "completed" ? "Completed" : state === "in_progress" ? "In progress" : locked ? "Locked" : "Not started"}
                              </span>
                            </span>
                            <span className={cn(
                              "text-[11px] font-bold shrink-0 tabular-nums",
                              state === "completed" ? "text-success" : locked ? "text-muted-foreground/50" : "text-primary"
                            )}>
                              +{lesson.xp_reward} XP
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              );
            })}
          </section>
        )}
      </main>

      <LessonViewerDialog
        lesson={viewingLesson as ViewerLesson | null}
        isCompleted={viewingLesson ? isLessonCompleted(viewingLesson.id) : false}
        onClose={() => setViewingLesson(null)}
        onComplete={async (l) => { await completeLesson(l.id, l.xp_reward); }}
      />
    </div>
  );
};

export default LearningPathDetailPage;
