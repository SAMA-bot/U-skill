import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  User,
  Download,
  BookOpen,
  Video,
  FileText,
  Play,
  CheckCircle2,
  Award,
  FileIcon,
  Loader2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Star,
  Flame,
  Trophy,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SmartEmptyState from "@/components/dashboard/SmartEmptyState";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { useCourseEnrollments } from "@/hooks/useCourseEnrollments";
import { getVideoSignedUrl, getDocumentSignedUrl } from "@/lib/storageUtils";
import { TRACKS, getDifficultyFromDuration } from "@/components/faculty/LearningTracks";
import LearningPathCard from "@/components/faculty/LearningPathCard";
import type { NodeState } from "@/components/faculty/LearningPathNode";
import { ExternalLink } from "lucide-react";

// Domains known to block iframe embedding
const BLOCKED_EMBED_DOMAINS = [
  "udemy.com", "coursera.org", "edx.org", "linkedin.com",
  "skillshare.com", "pluralsight.com", "udacity.com",
  "codecademy.com", "khanacademy.org", "masterclass.com",
];

const isEmbeddableUrl = (url: string | null): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname.includes("supabase.co") || parsed.pathname.includes("/storage/v1/")) return true;
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be") || hostname.includes("youtube-nocookie.com")) return true;
    if (BLOCKED_EMBED_DOMAINS.some((d) => hostname.includes(d))) return false;
    return false;
  } catch {
    return true;
  }
};

const getYouTubeEmbedUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname.includes("youtube.com") && parsed.pathname === "/watch") {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    }
    if (hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.slice(1);
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    }
    if (hostname.includes("youtube.com") && parsed.pathname.startsWith("/embed/")) return url;
    return null;
  } catch { return null; }
};

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string;
  duration_hours: number | null;
  instructor_name: string | null;
  thumbnail_url: string | null;
  course_url: string | null;
  video_url: string | null;
  document_url: string | null;
  course_type: string;
  content_type: string;
  is_published: boolean;
}

const CoursesViewer = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [signedVideoUrl, setSignedVideoUrl] = useState<string | null>(null);
  const [signedDocumentUrl, setSignedDocumentUrl] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const { toast } = useToast();
  const {
    enrollments,
    enrollInCourse,
    startCourse,
    completeCourse,
    getEnrollment,
    isEnrolled,
    isCompleted,
    getCompletedCount,
    getInProgressCount,
  } = useCourseEnrollments();

  useEffect(() => { fetchCourses(); }, []);

  useRealtimeData({
    table: "courses",
    onInsert: (newCourse) => {
      if (newCourse.is_published) {
        setCourses((prev) => [newCourse, ...prev]);
        toast({ title: "New course available!", description: `"${newCourse.title}" has been added.` });
      }
    },
    onUpdate: (updatedCourse) => {
      setCourses((prev) => {
        if (!updatedCourse.is_published) return prev.filter((c) => c.id !== updatedCourse.id);
        const exists = prev.find((c) => c.id === updatedCourse.id);
        if (exists) return prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c));
        return [updatedCourse, ...prev];
      });
    },
    onDelete: (deletedCourse) => {
      setCourses((prev) => prev.filter((c) => c.id !== deletedCourse.id));
    },
  });

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses_public" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setCourses((data || []) as unknown as Course[]);
    } catch (error: any) {
      toast({ title: "Error loading courses", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayVideo = async (course: Course) => {
    if (!course.video_url) return;
    setSelectedCourse(course);
    setLoadingMedia(true);
    setVideoModalOpen(true);
    const ytEmbed = getYouTubeEmbedUrl(course.video_url);
    if (ytEmbed) { setSignedVideoUrl(ytEmbed); setLoadingMedia(false); return; }
    const signedUrl = await getVideoSignedUrl(course.video_url);
    setSignedVideoUrl(signedUrl);
    setLoadingMedia(false);
  };

  const isYouTubeUrl = (url: string | null): boolean => {
    if (!url) return false;
    try { const h = new URL(url).hostname.toLowerCase(); return h.includes("youtube") || h.includes("youtu.be"); }
    catch { return false; }
  };

  const handleViewDocument = async (course: Course) => {
    if (!course.document_url) return;
    setSelectedCourse(course);
    setLoadingMedia(true);
    setDocumentModalOpen(true);
    const signedUrl = await getDocumentSignedUrl(course.document_url);
    setSignedDocumentUrl(signedUrl);
    setLoadingMedia(false);
  };

  const handleVideoModalClose = (open: boolean) => {
    setVideoModalOpen(open);
    if (!open) { setSignedVideoUrl(null); setSelectedCourse(null); }
  };

  const handleDocumentModalClose = (open: boolean) => {
    setDocumentModalOpen(open);
    if (!open) { setSignedDocumentUrl(null); setSelectedCourse(null); }
  };

  const handleEnrollWithLoading = async (courseId: string) => {
    setEnrollingId(courseId);
    try { await enrollInCourse(courseId); } finally { setEnrollingId(null); }
  };

  const getDocumentType = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext || '')) return 'word';
    return 'unknown';
  };

  const getDocumentIcon = (url: string) => {
    const type = getDocumentType(url);
    if (type === 'pdf') return <FileIcon className="h-4 w-4 text-destructive" />;
    return <FileText className="h-4 w-4" />;
  };

  // Handle lesson node click from roadmap
  const handleLessonClick = async (course: Course, state: NodeState) => {
    if (state === "locked") return;

    // If not enrolled, enroll + start
    const enrollment = getEnrollment(course.id);
    if (!enrollment) {
      await enrollInCourse(course.id);
      await startCourse(course.id);
    } else if (enrollment.status === "enrolled") {
      await startCourse(course.id);
    }

    // Open content
    if (course.content_type === "platform_video" && course.video_url) {
      if (isEmbeddableUrl(course.video_url)) {
        handlePlayVideo(course);
      } else {
        window.open(course.video_url, '_blank', 'noopener,noreferrer');
      }
    } else if (course.content_type === "pdf_course" && course.document_url) {
      handleViewDocument(course);
    } else if (course.content_type === "external_url" && course.course_url) {
      window.open(course.course_url, '_blank', 'noopener,noreferrer');
    } else {
      // Show detail sheet as fallback
      setDetailCourse(course);
    }
  };

  // Stats
  const totalXp = courses.reduce((sum, c) => sum + Math.min((c.duration_hours || 2) * 5, 25), 0);
  const earnedXp = courses.reduce((sum, c) => {
    if (isCompleted(c.id)) return sum + Math.min((c.duration_hours || 2) * 5, 25);
    return sum;
  }, 0);

  const tracksWithCourses = TRACKS.map((track) => ({
    track,
    courses: courses.filter((c) => track.categories.includes(c.category)),
  })).filter((t) => t.courses.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gamified Header */}
      <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-md p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Learning Paths
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
                <span className="text-xl font-bold text-success">{getCompletedCount()}</span>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">Completed</div>
            </div>
            <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-center min-w-[80px]">
              <div className="flex items-center justify-center gap-1">
                <Flame className="h-4 w-4 text-destructive" />
                <span className="text-xl font-bold text-accent-foreground">{getInProgressCount()}</span>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">In Progress</div>
            </div>
          </div>
        </div>

        {/* Overall XP bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Total Progress</span>
            <span className="font-semibold text-primary">{earnedXp} / {totalXp} XP</span>
          </div>
          <Progress value={totalXp > 0 ? (earnedXp / totalXp) * 100 : 0} className="h-3" showGlow />
        </div>
      </div>

      {/* Learning Path Roadmaps */}
      {tracksWithCourses.length === 0 ? (
        <SmartEmptyState
          icon={BookOpen}
          title="No learning paths available"
          description="Courses will be organized into learning paths once your admin publishes training programs."
        />
      ) : (
        <div className="space-y-4">
          {tracksWithCourses.map(({ track, courses: trackCourses }, i) => (
            <motion.div
              key={track.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <LearningPathCard
                track={track}
                courses={trackCourses}
                getEnrollment={getEnrollment}
                isCompleted={isCompleted}
                onLessonClick={handleLessonClick}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Course Detail Sheet (fallback) */}
      {detailCourse && (() => {
        const enrollment = getEnrollment(detailCourse.id);
        const enrolled = isEnrolled(detailCourse.id);
        const completed = isCompleted(detailCourse.id);
        const difficulty = getDifficultyFromDuration(detailCourse.duration_hours);
        const isEnrollingThis = enrollingId === detailCourse.id;
        return (
          <Sheet open={!!detailCourse} onOpenChange={(open) => { if (!open) setDetailCourse(null); }}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader className="text-left">
                <SheetTitle className="text-xl leading-snug pr-6">{detailCourse.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-5">
                {detailCourse.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{detailCourse.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={difficulty.color}>{difficulty.label}</Badge>
                  {detailCourse.duration_hours && (
                    <Badge variant="outline" className="text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />{detailCourse.duration_hours}h
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-primary border-primary/30">
                    <Star className="h-3 w-3 mr-1" />+{Math.min((detailCourse.duration_hours || 2) * 5, 25)} XP
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-3">
                  {completed ? (
                    <Button variant="outline" className="w-full" disabled>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-success" /> Completed
                    </Button>
                  ) : enrollment?.status === "in_progress" ? (
                    <Button className="w-full" onClick={() => { completeCourse(detailCourse.id); setDetailCourse(null); }}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Complete
                    </Button>
                  ) : (
                    <Button className="w-full" disabled={isEnrollingThis} onClick={() => handleEnrollWithLoading(detailCourse.id)}>
                      {isEnrollingThis ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                      {isEnrollingThis ? "Enrolling..." : "Start Lesson"}
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        );
      })()}

      {/* Video Modal */}
      <Dialog open={videoModalOpen} onOpenChange={handleVideoModalClose}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden flex flex-col">
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground transition-colors group" onClick={() => handleVideoModalClose(false)}>
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to Courses
            </Button>
            <DialogTitle className="text-sm font-medium text-foreground truncate max-w-[50%] flex items-center gap-2">
              <Video className="h-4 w-4 shrink-0" />{selectedCourse?.title}
            </DialogTitle>
            <div className="w-[120px]" />
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {loadingMedia ? (
              <div className="aspect-video flex items-center justify-center bg-muted rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : signedVideoUrl && isYouTubeUrl(selectedCourse?.video_url ?? null) ? (
              <div className="aspect-video">
                <iframe src={signedVideoUrl} className="w-full h-full rounded-lg" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={selectedCourse?.title} />
              </div>
            ) : signedVideoUrl ? (
              <div className="aspect-video">
                <video src={signedVideoUrl} controls className="w-full h-full rounded-lg" autoPlay />
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center bg-muted rounded-lg">
                <p className="text-muted-foreground">Unable to load video.</p>
              </div>
            )}
            {selectedCourse?.description && <p className="text-sm text-muted-foreground">{selectedCourse.description}</p>}
            {/* Mark complete button inside video modal */}
            {selectedCourse && !isCompleted(selectedCourse.id) && getEnrollment(selectedCourse.id) && (
              <Button className="w-full" onClick={() => { completeCourse(selectedCourse.id); handleVideoModalClose(false); }}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Lesson Complete
              </Button>
            )}
          </div>
          {selectedCourse && (() => {
            const sameCourses = courses.filter(c => c.content_type === selectedCourse.content_type && c.video_url);
            const currentIdx = sameCourses.findIndex(c => c.id === selectedCourse.id);
            const prevCourse = currentIdx > 0 ? sameCourses[currentIdx - 1] : null;
            const nextCourse = currentIdx < sameCourses.length - 1 ? sameCourses[currentIdx + 1] : null;
            if (!prevCourse && !nextCourse) return null;
            return (
              <div className="border-t border-border/40 bg-card/95 backdrop-blur-md px-4 py-3 flex items-center justify-between">
                <Button variant="outline" size="sm" disabled={!prevCourse} className="gap-2" onClick={() => prevCourse && handlePlayVideo(prevCourse)}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="text-xs text-muted-foreground">{currentIdx + 1} / {sameCourses.length}</span>
                <Button variant="outline" size="sm" disabled={!nextCourse} className="gap-2" onClick={() => nextCourse && handlePlayVideo(nextCourse)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Document Modal */}
      <Dialog open={documentModalOpen} onOpenChange={handleDocumentModalClose}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden flex flex-col">
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground transition-colors group" onClick={() => handleDocumentModalClose(false)}>
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to Courses
            </Button>
            <DialogTitle className="text-sm font-medium text-foreground truncate max-w-[50%] flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0" />{selectedCourse?.title}
            </DialogTitle>
            <div className="w-[120px]" />
          </div>
          <div className="flex-1 p-4 overflow-hidden">
            {loadingMedia ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : signedDocumentUrl && selectedCourse?.document_url ? (
              getDocumentType(selectedCourse.document_url) === 'pdf' ? (
                <iframe src={signedDocumentUrl} className="w-full h-full rounded-lg border" title={selectedCourse.title} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
                  <div className="bg-muted rounded-full p-8">
                    {getDocumentIcon(selectedCourse.document_url)}
                    <FileIcon className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Document Preview</h3>
                    <p className="text-muted-foreground mb-4">This document type cannot be previewed in the browser.</p>
                    <Button onClick={() => window.open(signedDocumentUrl, '_blank')}><Download className="h-4 w-4 mr-2" /> Download Document</Button>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Unable to load document.</p></div>
            )}
          </div>
          {/* Mark complete inside doc modal */}
          {selectedCourse && !isCompleted(selectedCourse.id) && getEnrollment(selectedCourse.id) && (
            <div className="border-t border-border/40 bg-card/95 backdrop-blur-md px-4 py-3">
              <Button className="w-full" onClick={() => { completeCourse(selectedCourse.id); handleDocumentModalClose(false); }}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Lesson Complete
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoursesViewer;
