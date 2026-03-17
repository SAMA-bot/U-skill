import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Play, CheckCircle2, Clock, Award, User,
  ExternalLink, FileText, Video, Loader2, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCourseEnrollments } from "@/hooks/useCourseEnrollments";
import { useToast } from "@/hooks/use-toast";
import { getVideoSignedUrl, getDocumentSignedUrl } from "@/lib/storageUtils";
import { getDifficultyFromDuration } from "@/components/faculty/LearningTracks";

interface CourseData {
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
  tags: string[] | null;
}

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

const isSupabaseStorageUrl = (url: string): boolean => {
  return url.includes("/storage/v1/object/");
};

const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const {
    enrollInCourse, startCourse, completeCourse,
    getEnrollment, isEnrolled, isCompleted,
  } = useCourseEnrollments();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedVideoUrl, setSignedVideoUrl] = useState<string | null>(null);
  const [signedDocUrl, setSignedDocUrl] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (courseId) fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    if (!courseId) return;
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, category, duration_hours, instructor_name, thumbnail_url, course_url, video_url, document_url, course_type, content_type, is_published, tags")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast({ title: "Course not found", description: "This course may have been removed.", variant: "destructive" });
        navigate("/dashboard");
        return;
      }
      setCourse(data as CourseData);
    } catch (err: any) {
      console.error("[CourseDetailPage] Error fetching course:", err);
      toast({ title: "Error loading course", description: err.message, variant: "destructive" });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!course) return;
    setEnrolling(true);
    await enrollInCourse(course.id);
    setEnrolling(false);
  };

  const handleStartLearning = async () => {
    if (!course) return;
    await startCourse(course.id);
    await launchContent();
  };

  const handleContinueLearning = async () => {
    if (!course) return;
    await launchContent();
  };

  const launchContent = async () => {
    if (!course) return;
    setLoadingMedia(true);

    const contentType = course.content_type;

    if (contentType === "external_url" && course.course_url) {
      window.open(course.course_url, "_blank", "noopener,noreferrer");
      setLoadingMedia(false);
      return;
    }

    if (contentType === "platform_video" && course.video_url) {
      const ytEmbed = getYouTubeEmbedUrl(course.video_url);
      if (ytEmbed) {
        setSignedVideoUrl(ytEmbed);
      } else if (isSupabaseStorageUrl(course.video_url)) {
        const signed = await getVideoSignedUrl(course.video_url);
        setSignedVideoUrl(signed);
      } else {
        setSignedVideoUrl(course.video_url);
      }
    }

    if (contentType === "pdf" && course.document_url) {
      if (isSupabaseStorageUrl(course.document_url)) {
        const signed = await getDocumentSignedUrl(course.document_url);
        setSignedDocUrl(signed);
      } else {
        setSignedDocUrl(course.document_url);
      }
    }

    setLoadingMedia(false);
  };

  const handleMarkComplete = async () => {
    if (!course) return;
    await completeCourse(course.id);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) return null;

  const enrollment = getEnrollment(course.id);
  const enrolled = isEnrolled(course.id);
  const completed = isCompleted(course.id);
  const difficulty = getDifficultyFromDuration(course.duration_hours);
  const isYouTube = course.video_url ? !!getYouTubeEmbedUrl(course.video_url) : false;

  const getContentTypeLabel = () => {
    switch (course.content_type) {
      case "platform_video": return "Video Course";
      case "pdf": return "PDF Course";
      case "external_url": return "External Resource";
      default: return "Course";
    }
  };

  const getContentTypeIcon = () => {
    switch (course.content_type) {
      case "platform_video": return <Video className="h-4 w-4" />;
      case "pdf": return <FileText className="h-4 w-4" />;
      case "external_url": return <ExternalLink className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground group"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm text-muted-foreground truncate">{course.title}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Course Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/40 bg-card overflow-hidden"
        >
          {/* Thumbnail */}
          {course.thumbnail_url && (
            <div className="aspect-[3/1] w-full overflow-hidden bg-muted">
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1 text-xs">
                {getContentTypeIcon()}
                {getContentTypeLabel()}
              </Badge>
              <Badge variant="outline" className={`text-xs ${difficulty.color}`}>
                {difficulty.label}
              </Badge>
              {course.tags && course.tags.length > 0 && course.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {completed && (
                <Badge className="bg-success/15 text-success border-success/30 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                </Badge>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{course.title}</h1>

            {course.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {course.instructor_name && (
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4" /> {course.instructor_name}
                </span>
              )}
              {course.duration_hours && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {course.duration_hours}h duration
                </span>
              )}
              {course.duration_hours && (
                <span className="flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-primary" /> +{Math.min(course.duration_hours * 5, 50)} skill points
                </span>
              )}
            </div>

            {/* Progress bar for in-progress */}
            {enrollment?.status === "in_progress" && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium text-primary">{enrollment.progress_percentage}%</span>
                </div>
                <Progress value={enrollment.progress_percentage} className="h-2" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              {completed ? (
                <Button onClick={handleContinueLearning} disabled={loadingMedia}>
                  {loadingMedia ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  View Course Again
                </Button>
              ) : enrollment?.status === "in_progress" ? (
                <>
                  <Button onClick={handleContinueLearning} disabled={loadingMedia}>
                    {loadingMedia ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                    Continue Learning
                  </Button>
                  <Button variant="outline" onClick={handleMarkComplete}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                </>
              ) : enrolled ? (
                <Button onClick={handleStartLearning} disabled={loadingMedia}>
                  {loadingMedia ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Start Learning
                </Button>
              ) : (
                <Button onClick={handleEnroll} disabled={enrolling}>
                  {enrolling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BookOpen className="h-4 w-4 mr-2" />}
                  Enroll Now
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Video Player */}
        {signedVideoUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/40 bg-card overflow-hidden"
          >
            <div className="p-4 border-b border-border/30 flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Video Player</h3>
            </div>
            <div className="aspect-video">
              {isYouTube || getYouTubeEmbedUrl(signedVideoUrl) ? (
                <iframe
                  src={signedVideoUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={course.title}
                />
              ) : (
                <video
                  src={signedVideoUrl}
                  controls
                  className="w-full h-full bg-black"
                />
              )}
            </div>
          </motion.div>
        )}

        {/* PDF Viewer */}
        {signedDocUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/40 bg-card overflow-hidden"
          >
            <div className="p-4 border-b border-border/30 flex items-center gap-2">
              <FileText className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold text-foreground">Document Viewer</h3>
            </div>
            <iframe
              src={signedDocUrl}
              className="w-full h-[600px]"
              title={course.title}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CourseDetailPage;
