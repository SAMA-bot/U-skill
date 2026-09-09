import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, CheckCircle2, Play, Video, FileText, Link2, Type,
  ChevronDown, Star, Flame, Trophy, Zap, Loader2, ArrowLeft,
  BookOpen, ExternalLink, Download, Clock, Signal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import SmartEmptyState from "@/components/dashboard/SmartEmptyState";
import { NoCoursesSVG } from "@/components/dashboard/EmptyStateIllustrations";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import { StatCardSkeleton, ListSkeleton } from "@/components/ui/skeleton";
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
  thumbnail_url: string | null;
  difficulty: string | null; estimated_hours: number | null; target_audience: string | null;
}
interface LearningModule {
  id: string; path_id: string; title: string; description: string | null; sort_order: number;
}
interface Lesson {
  id: string; module_id: string; title: string; description: string | null;
  xp_reward: number; sort_order: number; duration_minutes?: number | null;
}
interface LessonContentItem {
  id: string; lesson_id: string; content_type: string; title: string;
  text_content: string | null; video_url: string | null;
  document_url: string | null; external_url: string | null; sort_order: number;
}

type NodeState = "locked" | "available" | "in_progress" | "completed";

const difficultyClass = (difficulty: string | null) => {
  switch (difficulty) {
    case "advanced": return "text-destructive border-destructive/30";
    case "intermediate": return "text-warning border-warning/30";
    default: return "text-success border-success/30";
  }
};

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

  const overallPercent = totalXpAvailable > 0 ? Math.round((earnedXp / totalXpAvailable) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <ListSkeleton items={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Capacity building"
        title="Learning Paths"
        icon={Zap}
        description="Complete lessons in order to unlock the next one. Every lesson you finish adds XP to your profile."
      />

      {/* Progress summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Star} label="XP earned" value={earnedXp} index={0} />
        <StatCard icon={Trophy} label="Lessons completed" value={completedCount} index={1} />
        <StatCard icon={Flame} label="Overall progress" value={overallPercent} suffix="%" index={2}>
          <Progress value={overallPercent} className="h-1.5" animated={false} />
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {earnedXp} of {totalXpAvailable} XP available
          </p>
        </StatCard>
      </div>


      {/* Learning Paths */}
      {paths.length === 0 ? (
          <SmartEmptyState
            icon={BookOpen}
            title="No learning paths available"
            description="Learning paths will appear here once your admin publishes them."
            illustration={<NoCoursesSVG />}
          />
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
                  "rounded-xl border bg-card overflow-hidden transition-all duration-200",
                  isPathComplete
                    ? "border-success/40"
                    : "border-border hover:border-primary/30 hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.35)]"
                )}
              >
                {/* Path thumbnail + header */}
                <div className="relative h-24 sm:h-28 overflow-hidden">
                  <img
                    src={getPathThumbnail(path)}
                    alt={`${path.title} learning path cover`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  {isPathComplete && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-success/15 text-success border border-success/30 text-[10px]">
                        <Trophy className="h-3 w-3 mr-0.5" /> Complete
                      </Badge>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/learning-paths/${path.id}`)}
                  className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold tracking-tight text-foreground text-[15px] truncate">{path.title}</h3>
                    {path.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{path.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge variant="outline" className={cn("text-[10px] capitalize gap-1", difficultyClass(path.difficulty))}>
                        <Signal className="h-3 w-3" />{path.difficulty || "beginner"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {path.estimated_hours && path.estimated_hours > 0
                          ? `${path.estimated_hours}h`
                          : `${Math.max(1, Math.round(pathLessons.reduce((s, l) => s + (l.duration_minutes || 15), 0) / 60))}h`}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                        <BookOpen className="h-3 w-3" />{pathLessons.length} lessons
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1 text-primary border-primary/30 tabular-nums">
                        <Star className="h-3 w-3" />{pathEarnedXp}/{pathTotalXp} XP
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground tabular-nums">{pathCompletedCount}/{pathLessons.length} lessons done</span>
                    </div>
                    <Progress value={pathPercent} className="h-1.5 mt-2" animated={false} />
                  </div>
                  <span className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">
                    {isPathComplete ? "Review" : pathCompletedCount > 0 ? "Resume" : "Start learning"}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default CoursesViewer;
