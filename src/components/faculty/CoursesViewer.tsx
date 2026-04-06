import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, CheckCircle2, Play, Video, FileText, Link2, Type,
  ChevronDown, Star, Flame, Trophy, Zap, Loader2, ArrowLeft,
  BookOpen, ExternalLink, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import SmartEmptyState from "@/components/dashboard/SmartEmptyState";
import { NoCoursesSVG } from "@/components/dashboard/EmptyStateIllustrations";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { getVideoSignedUrl, getDocumentSignedUrl } from "@/lib/storageUtils";
import { getPathThumbnail } from "@/lib/thumbnailUtils";
import { cn } from "@/lib/utils";

// Types
interface LearningPath {
  id: string; title: string; description: string | null;
  icon: string; color: string; is_published: boolean;
}
interface LearningModule {
  id: string; path_id: string; title: string; description: string | null; sort_order: number;
}
interface Lesson {
  id: string; module_id: string; title: string; description: string | null;
  xp_reward: number; sort_order: number;
}
interface LessonContentItem {
  id: string; lesson_id: string; content_type: string; title: string;
  text_content: string | null; video_url: string | null;
  document_url: string | null; external_url: string | null; sort_order: number;
}

type NodeState = "locked" | "available" | "in_progress" | "completed";

const getContentTypeIcon = (type: string) => {
  switch (type) {
    case "platform_video": return <Video className="h-3.5 w-3.5 text-primary" />;
    case "pdf": return <FileText className="h-3.5 w-3.5 text-destructive" />;
    case "external_url": return <Link2 className="h-3.5 w-3.5 text-info" />;
    case "text": return <Type className="h-3.5 w-3.5" />;
    default: return <BookOpen className="h-3.5 w-3.5" />;
  }
};

const getYouTubeEmbedUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const h = parsed.hostname.toLowerCase();
    if (h.includes("youtube.com") && parsed.pathname === "/watch") {
      const v = parsed.searchParams.get("v");
      return v ? `https://www.youtube-nocookie.com/embed/${v}` : null;
    }
    if (h.includes("youtu.be")) return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
    if (h.includes("youtube.com") && parsed.pathname.startsWith("/embed/")) return url;
    return null;
  } catch { return null; }
};

const CoursesViewer = () => {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [modules, setModules] = useState<Record<string, LearningModule[]>>({});
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [contentItems, setContentItems] = useState<Record<string, LessonContentItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
  const [fallbackCourses, setFallbackCourses] = useState<Course[]>([]);

  // Lesson viewer state
  const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null);
  const [lessonContent, setLessonContent] = useState<LessonContentItem[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [viewedContentIds, setViewedContentIds] = useState<Set<string>>(new Set());
  const [autoCompleting, setAutoCompleting] = useState(false);

  const { toast } = useToast();
  const {
    isLessonCompleted, getLessonStatus, completeLesson, startLesson,
    getTotalXp, getCompletedCount,
  } = useLessonProgress();

  useEffect(() => { fetchPaths(); }, []);

  const fetchPaths = async () => {
    try {
      const { data, error } = await supabase
        .from("learning_paths")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const pathList = (data || []) as LearningPath[];
      setPaths(pathList);
      // Pre-fetch modules for all paths
      for (const p of pathList) fetchModules(p.id);

      // If no learning paths, fetch published courses as fallback
      if (pathList.length === 0) {
        console.log("[CoursesViewer] No learning paths found, fetching published courses as fallback...");
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("id, title, description, category, duration_hours, instructor_name, thumbnail_url, course_url, video_url, document_url, course_type, content_type, is_published, tags")
          .eq("is_published", true)
          .order("created_at", { ascending: false });
        if (coursesError) {
          console.error("[CoursesViewer] Error fetching fallback courses:", coursesError);
        } else {
          console.log(`[CoursesViewer] Found ${coursesData?.length || 0} published courses as fallback`);
          setFallbackCourses((coursesData || []) as Course[]);
        }
      }
    } catch (error: any) {
      toast({ title: "Error loading paths", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async (pathId: string) => {
    const { data } = await supabase
      .from("learning_modules").select("*")
      .eq("path_id", pathId).order("sort_order", { ascending: true });
    if (data) {
      setModules(prev => ({ ...prev, [pathId]: data as LearningModule[] }));
      for (const m of data) fetchLessons(m.id);
    }
  };

  const fetchLessons = async (moduleId: string) => {
    const { data } = await supabase
      .from("lessons").select("*")
      .eq("module_id", moduleId).order("sort_order", { ascending: true });
    if (data) setLessons(prev => ({ ...prev, [moduleId]: data as Lesson[] }));
  };

  const fetchContentForLesson = async (lessonId: string) => {
    const { data } = await supabase
      .from("lesson_content").select("*")
      .eq("lesson_id", lessonId).order("sort_order", { ascending: true });
    if (data) {
      setContentItems(prev => ({ ...prev, [lessonId]: data as LessonContentItem[] }));
      return data as LessonContentItem[];
    }
    return [];
  };

  // Get all lessons for a path in order (flat)
  const getPathLessons = (pathId: string): Lesson[] => {
    const pathModules = modules[pathId] || [];
    return pathModules.flatMap(m => lessons[m.id] || []);
  };

  // Determine lesson state based on sequential progression
  const getLessonNodeState = (lesson: Lesson, index: number, allLessons: Lesson[]): NodeState => {
    const status = getLessonStatus(lesson.id);
    if (status === "completed") return "completed";
    if (status === "in_progress") return "in_progress";
    // First lesson is always available
    if (index === 0) return "available";
    // Available if previous lesson is completed
    const prevLesson = allLessons[index - 1];
    if (prevLesson && isLessonCompleted(prevLesson.id)) return "available";
    return "locked";
  };

  const markContentViewed = (contentId: string) => {
    setViewedContentIds(prev => {
      const next = new Set(prev);
      next.add(contentId);
      return next;
    });
  };

  // Auto-complete when all content items are viewed
  useEffect(() => {
    if (!viewingLesson || lessonContent.length === 0 || loadingMedia || autoCompleting) return;
    if (isLessonCompleted(viewingLesson.id)) return;
    const allViewed = lessonContent.every(item => viewedContentIds.has(item.id));
    if (allViewed) {
      setAutoCompleting(true);
      completeLesson(viewingLesson.id, viewingLesson.xp_reward).then(() => {
        setAutoCompleting(false);
      });
    }
  }, [viewedContentIds, lessonContent, viewingLesson, loadingMedia]);

  const handleLessonClick = async (lesson: Lesson, state: NodeState) => {
    if (state === "locked") return;
    await startLesson(lesson.id);
    setViewingLesson(lesson);
    setViewedContentIds(new Set());
    setLoadingMedia(true);
    const content = await fetchContentForLesson(lesson.id);
    setLessonContent(content);

    // Auto-mark text content as viewed immediately (no interaction needed beyond reading)
    const autoViewedIds = new Set<string>();
    
    const urls: Record<string, string> = {};
    for (const item of content) {
      if (item.content_type === "text") {
        autoViewedIds.add(item.id);
      }
      if (item.content_type === "platform_video" && item.video_url) {
        const ytEmbed = getYouTubeEmbedUrl(item.video_url);
        if (ytEmbed) { urls[item.id] = ytEmbed; }
        else {
          const signed = await getVideoSignedUrl(item.video_url);
          if (signed) urls[item.id] = signed;
        }
      }
      if (item.content_type === "pdf" && item.document_url) {
        const signed = await getDocumentSignedUrl(item.document_url);
        if (signed) urls[item.id] = signed;
      }
    }
    setSignedUrls(urls);
    setViewedContentIds(autoViewedIds);
    setLoadingMedia(false);
  };

  const handleCompleteLesson = async () => {
    if (!viewingLesson) return;
    await completeLesson(viewingLesson.id, viewingLesson.xp_reward);
    setViewingLesson(null);
  };

  // Calculate total stats
  const allLessons = paths.flatMap(p => getPathLessons(p.id));
  const totalXpAvailable = allLessons.reduce((sum, l) => sum + l.xp_reward, 0);
  const earnedXp = getTotalXp();
  const completedCount = getCompletedCount();

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Gamified Header */}
      <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-md p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" /> Learning Paths
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Complete lessons in order to unlock the next. Earn XP as you go!
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-center min-w-[80px]">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 text-primary" />
                <span className="text-xl font-bold text-primary">{earnedXp}</span>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">XP Earned</div>
            </div>
            <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-center min-w-[80px]">
              <div className="flex items-center justify-center gap-1">
                <Trophy className="h-4 w-4 text-success" />
                <span className="text-xl font-bold text-success">{completedCount}</span>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">Completed</div>
            </div>
          </div>
        </div>
        {totalXpAvailable > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Total Progress</span>
              <span className="font-semibold text-primary">{earnedXp} / {totalXpAvailable} XP</span>
            </div>
            <Progress value={totalXpAvailable > 0 ? (earnedXp / totalXpAvailable) * 100 : 0} className="h-3" showGlow />
          </div>
        )}
      </div>

      {/* Learning Paths or Fallback Courses */}
      {paths.length === 0 ? (
        fallbackCourses.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/40 bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                Showing available training courses. Structured learning paths will appear once your admin configures them.
              </p>
            </div>
            <LearningTracks courses={fallbackCourses} />
          </div>
        ) : (
          <SmartEmptyState
            icon={BookOpen}
            title="No learning paths available"
            description="Learning paths will appear here once your admin publishes them."
            illustration={<NoCoursesSVG />}
          />
        )
      ) : (
        <div className="space-y-4">
          {paths.map((path, pi) => {
            const pathLessons = getPathLessons(path.id);
            const pathModules = modules[path.id] || [];
            const pathCompletedCount = pathLessons.filter(l => isLessonCompleted(l.id)).length;
            const pathTotalXp = pathLessons.reduce((s, l) => s + l.xp_reward, 0);
            const pathEarnedXp = pathLessons.filter(l => isLessonCompleted(l.id)).reduce((s, l) => s + l.xp_reward, 0);
            const pathPercent = pathLessons.length > 0 ? Math.round((pathCompletedCount / pathLessons.length) * 100) : 0;
            const isExpanded = expandedPaths.includes(path.id);
            const isPathComplete = pathCompletedCount === pathLessons.length && pathLessons.length > 0;

            return (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: pi * 0.08 }}
                className={cn(
                  "rounded-2xl border bg-card overflow-hidden transition-all duration-300",
                  isPathComplete ? "border-success/40 shadow-[0_0_30px_hsl(var(--success)/0.1)]" : "border-border/50"
                )}
              >
                {/* Path header */}
                <button
                  onClick={() => setExpandedPaths(prev =>
                    prev.includes(path.id) ? prev.filter(id => id !== path.id) : [...prev, path.id]
                  )}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl shrink-0", `bg-${path.color}/10`)}>
                    <BookOpen className={`h-6 w-6 text-${path.color}`} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground text-base truncate">{path.title}</h3>
                      {isPathComplete && (
                        <Badge className="bg-success/15 text-success border-success/30 text-[10px]">
                          <Trophy className="h-3 w-3 mr-0.5" /> Complete
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{pathCompletedCount}/{pathLessons.length} lessons</span>
                      <span className="text-xs font-semibold text-primary flex items-center gap-0.5">
                        <Star className="h-3 w-3" /> {pathEarnedXp}/{pathTotalXp} XP
                      </span>
                    </div>
                    <Progress value={pathPercent} className="h-2 mt-2" animated={false} />
                  </div>
                  <ChevronDown className={cn("h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-300", isExpanded && "rotate-180")} />
                </button>

                {/* Expanded: Modules + Lessons Roadmap */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-6 pt-2">
                        {/* XP summary bar */}
                        <div className="flex items-center justify-center gap-4 mb-6 py-3 rounded-lg bg-muted/40 border border-border/30">
                          <div className="flex items-center gap-1.5">
                            <Star className="h-4 w-4 text-primary" />
                            <span className="text-sm font-bold text-foreground">{pathEarnedXp} XP earned</span>
                          </div>
                          <div className="h-4 w-px bg-border" />
                          <div className="flex items-center gap-1.5">
                            <Flame className="h-4 w-4 text-destructive" />
                            <span className="text-sm text-muted-foreground">{pathPercent}% complete</span>
                          </div>
                        </div>

                        {/* Modules as sections */}
                        {pathModules.map((mod, mi) => {
                          const modLessons = lessons[mod.id] || [];
                          // Calculate flat index for sequential progression across modules
                          const previousModulesLessonCount = pathModules.slice(0, mi).reduce((s, m) => s + (lessons[m.id] || []).length, 0);

                          return (
                            <div key={mod.id} className="mb-6 last:mb-0">
                              {/* Module label */}
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-6 w-6 rounded-md bg-accent/15 flex items-center justify-center">
                                  <span className="text-xs font-bold text-accent-foreground">{mi + 1}</span>
                                </div>
                                <h4 className="text-sm font-semibold text-foreground">{mod.title}</h4>
                                <span className="text-[10px] text-muted-foreground">
                                  {modLessons.filter(l => isLessonCompleted(l.id)).length}/{modLessons.length}
                                </span>
                              </div>

                              {/* Lesson nodes - vertical path */}
                              <div className="flex flex-col items-center gap-1">
                                {modLessons.map((lesson, li) => {
                                  const globalIndex = previousModulesLessonCount + li;
                                  const state = getLessonNodeState(lesson, globalIndex, pathLessons);
                                  const offsetX = li % 2 === 0 ? -40 : 40;

                                  const stateStyles = {
                                    locked: { bg: "bg-muted/60", border: "border-border/50", iconColor: "text-muted-foreground/50" },
                                    available: { bg: "bg-gradient-to-br from-primary to-primary/80", border: "border-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.3)]", iconColor: "text-primary-foreground" },
                                    in_progress: { bg: "bg-gradient-to-br from-accent to-accent/80", border: "border-accent/60 shadow-[0_0_20px_hsl(var(--accent)/0.3)]", iconColor: "text-accent-foreground" },
                                    completed: { bg: "bg-gradient-to-br from-success to-success/80", border: "border-success/60", iconColor: "text-success-foreground" },
                                  };
                                  const style = stateStyles[state];
                                  const isInteractive = state !== "locked";
                                  const NodeIcon = state === "completed" ? CheckCircle2 : state === "locked" ? Lock : Play;

                                  return (
                                    <div key={lesson.id} className="flex flex-col items-center">
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: li * 0.06, type: "spring", stiffness: 200 }}
                                        className="flex flex-col items-center"
                                        style={{ transform: `translateX(${offsetX}px)` }}
                                      >
                                        <motion.button
                                          whileHover={isInteractive ? { scale: 1.12 } : undefined}
                                          whileTap={isInteractive ? { scale: 0.95 } : undefined}
                                          disabled={!isInteractive}
                                          onClick={() => handleLessonClick(lesson, state)}
                                          className={cn(
                                            "relative flex items-center justify-center w-16 h-16 rounded-full border-[3px] transition-all duration-300",
                                            style.bg, style.border,
                                            isInteractive ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                                          )}
                                        >
                                          {(state === "available" || state === "in_progress") && (
                                            <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-current" />
                                          )}
                                          <NodeIcon className={cn("h-6 w-6 relative z-10", style.iconColor)} />
                                        </motion.button>
                                        <div className="mt-2 text-center max-w-[140px]">
                                          <p className={cn("text-xs font-semibold leading-tight line-clamp-2", state === "locked" ? "text-muted-foreground/50" : "text-foreground")}>
                                            {lesson.title}
                                          </p>
                                          <span className={cn("text-[10px] font-bold", state === "completed" ? "text-success" : state === "locked" ? "text-muted-foreground/40" : "text-primary")}>
                                            +{lesson.xp_reward} XP
                                          </span>
                                        </div>
                                      </motion.div>

                                      {/* Connector dots */}
                                      {li < modLessons.length - 1 && (
                                        <div className="flex flex-col items-center my-1">
                                          {[0, 1, 2].map(dot => (
                                            <div key={dot} className={cn("w-1 h-1 rounded-full my-0.5", state === "completed" ? "bg-success/60" : "bg-border")} />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {/* Path completion trophy */}
                        {isPathComplete && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-success to-success/70 flex items-center justify-center border-[3px] border-success/40 shadow-[0_0_24px_hsl(var(--success)/0.3)]">
                              <Trophy className="h-7 w-7 text-success-foreground" />
                            </div>
                            <span className="text-xs font-bold text-success">Path Mastered!</span>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Lesson Viewer Dialog */}
      <Dialog open={!!viewingLesson} onOpenChange={open => { if (!open) setViewingLesson(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground group" onClick={() => setViewingLesson(null)}>
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back
            </Button>
            <DialogTitle className="text-sm font-medium text-foreground truncate max-w-[60%]">
              {viewingLesson?.title}
            </DialogTitle>
            <Badge variant="outline" className="text-primary border-primary/30 text-xs">
              <Star className="h-3 w-3 mr-1" /> {viewingLesson?.xp_reward} XP
            </Badge>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loadingMedia ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : lessonContent.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No content in this lesson yet.</p>
              </div>
            ) : (
              lessonContent.map((item, i) => (
                <div key={item.id} className="space-y-2">
                  {/* Content header */}
                  <div className="flex items-center gap-2">
                    {getContentTypeIcon(item.content_type)}
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  </div>

                  {/* Render by type */}
                  {item.content_type === "text" && item.text_content && (
                    <div className="prose prose-sm max-w-none text-foreground bg-muted/30 rounded-lg p-4 border border-border/30">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{item.text_content}</div>
                    </div>
                  )}

                  {item.content_type === "platform_video" && (
                    signedUrls[item.id] ? (
                      getYouTubeEmbedUrl(item.video_url || "") ? (
                        <div className="aspect-video rounded-lg overflow-hidden border">
                          <iframe src={signedUrls[item.id]} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={item.title} onLoad={() => markContentViewed(item.id)} />
                        </div>
                      ) : (
                        <div className="aspect-video rounded-lg overflow-hidden border">
                          <video src={signedUrls[item.id]} controls className="w-full h-full" onPlay={() => markContentViewed(item.id)} />
                        </div>
                      )
                    ) : (
                      <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">Unable to load video</p>
                      </div>
                    )
                  )}

                  {item.content_type === "pdf" && (
                    signedUrls[item.id] ? (
                      <iframe src={signedUrls[item.id]} className="w-full h-[500px] rounded-lg border" title={item.title} onLoad={() => markContentViewed(item.id)} />
                    ) : (
                      <div className="h-[200px] rounded-lg bg-muted flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">Unable to load document</p>
                      </div>
                    )
                  )}

                  {item.content_type === "external_url" && item.external_url && (
                    <div className="bg-info/5 border border-info/20 rounded-lg p-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate flex-1 mr-3">{item.external_url}</p>
                      <Button variant="outline" size="sm" onClick={() => { markContentViewed(item.id); window.open(item.external_url!, "_blank", "noopener,noreferrer"); }}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Link
                      </Button>
                    </div>
                  )}

                  {/* Progress indicator per content item */}
                  {!isLessonCompleted(viewingLesson!.id) && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {viewedContentIds.has(item.id) ? (
                        <span className="text-[10px] text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Viewed</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Not viewed yet</span>
                      )}
                    </div>
                  )}

                  {i < lessonContent.length - 1 && <div className="border-t border-border/30 mt-4" />}
                </div>
              ))
            )}
          </div>

          {/* Footer: progress + auto-complete status */}
          {viewingLesson && !isLessonCompleted(viewingLesson.id) && (
            <div className="border-t border-border/40 bg-card/95 backdrop-blur-md px-4 py-3 space-y-2">
              {lessonContent.length > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {viewedContentIds.size}/{lessonContent.length} content items viewed
                  </span>
                  <Progress value={lessonContent.length > 0 ? (viewedContentIds.size / lessonContent.length) * 100 : 0} className="h-1.5 w-24" />
                </div>
              )}
              {autoCompleting ? (
                <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium py-1">
                  <Loader2 className="h-4 w-4 animate-spin" /> Completing lesson...
                </div>
              ) : (
                <Button className="w-full" variant="outline" onClick={handleCompleteLesson}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Complete (+{viewingLesson.xp_reward} XP)
                </Button>
              )}
            </div>
          )}
          {viewingLesson && isLessonCompleted(viewingLesson.id) && (
            <div className="border-t border-border/40 bg-success/5 px-4 py-3 text-center">
              <span className="text-sm text-success font-medium flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Lesson Completed
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoursesViewer;
