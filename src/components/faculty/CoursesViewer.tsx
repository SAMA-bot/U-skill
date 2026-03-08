import { useState, useEffect, useCallback } from "react";
import LearningTracks from "@/components/faculty/LearningTracks";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Clock, 
  User, 
  Download,
  BookOpen,
  Filter,
  Video,
  FileText,
  Play,
  CheckCircle2,
  PlayCircle,
  Award,
  TrendingUp,
  FileIcon,
  X,
  Loader2,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SmartEmptyState from "@/components/dashboard/SmartEmptyState";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { useCourseEnrollments } from "@/hooks/useCourseEnrollments";
import { getVideoSignedUrl, getDocumentSignedUrl } from "@/lib/storageUtils";
import { getDifficultyFromDuration } from "@/components/faculty/LearningTracks";
import { ExternalLink } from "lucide-react";

// Domains known to block iframe embedding
const BLOCKED_EMBED_DOMAINS = [
  "udemy.com",
  "coursera.org",
  "edx.org",
  "linkedin.com",
  "skillshare.com",
  "pluralsight.com",
  "udacity.com",
  "codecademy.com",
  "khanacademy.org",
  "masterclass.com",
];

const isEmbeddableUrl = (url: string | null): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    // YouTube embed links are safe
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be") || hostname.includes("youtube-nocookie.com")) {
      return true;
    }
    // Check against blocked domains
    if (BLOCKED_EMBED_DOMAINS.some((d) => hostname.includes(d))) {
      return false;
    }
    // Default: assume external URLs are not embeddable
    return false;
  } catch {
    // Not a valid URL (likely a storage path) — embeddable via signed URL
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
    if (hostname.includes("youtube.com") && parsed.pathname.startsWith("/embed/")) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
};

// Course interface without sensitive created_by field (using public view)
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
  is_published: boolean;
}

const CoursesViewer = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
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
    getInProgressCount
  } = useCourseEnrollments();

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "teaching", label: "Teaching & Pedagogy" },
    { value: "research", label: "Research & Publications" },
    { value: "technology", label: "Technology & Digital Skills" },
    { value: "leadership", label: "Leadership & Management" },
    { value: "communication", label: "Communication Skills" },
    { value: "general", label: "General Development" },
  ];

  // Initial fetch
  useEffect(() => {
    fetchCourses();
  }, []);

  // Realtime subscription for courses
  useRealtimeData({
    table: "courses",
    onInsert: (newCourse) => {
      if (newCourse.is_published) {
        setCourses((prev) => [newCourse, ...prev]);
        toast({
          title: "New course available!",
          description: `"${newCourse.title}" has been added.`,
        });
      }
    },
    onUpdate: (updatedCourse) => {
      setCourses((prev) => {
        if (!updatedCourse.is_published) {
          return prev.filter((c) => c.id !== updatedCourse.id);
        }
        const exists = prev.find((c) => c.id === updatedCourse.id);
        if (exists) {
          return prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c));
        }
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourses((data || []) as unknown as Course[]);
    } catch (error: any) {
      toast({
        title: "Error loading courses",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter by search and type only (used for category tab counts)
  const filteredByTypeAndSearch = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || course.course_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Full filter including category
  const filteredCourses = filteredByTypeAndSearch.filter((course) => {
    return categoryFilter === "all" || course.category === categoryFilter;
  });

  const videoCourses = filteredCourses.filter(c => c.course_type === 'video');
  const regularCourses = filteredCourses.filter(c => c.course_type === 'regular');

  // My Learning: courses the user is enrolled in
  const myLearningCourses = courses.filter((c) => isEnrolled(c.id));

  const handlePlayVideo = async (course: Course) => {
    if (!course.video_url) return;
    setSelectedCourse(course);
    setLoadingMedia(true);
    setVideoModalOpen(true);

    // Check if it's a YouTube URL — use embed URL directly
    const ytEmbed = getYouTubeEmbedUrl(course.video_url);
    if (ytEmbed) {
      setSignedVideoUrl(ytEmbed);
      setLoadingMedia(false);
      return;
    }

    const signedUrl = await getVideoSignedUrl(course.video_url);
    setSignedVideoUrl(signedUrl);
    setLoadingMedia(false);
  };

  const isYouTubeUrl = (url: string | null): boolean => {
    if (!url) return false;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname.includes("youtube") || hostname.includes("youtu.be");
    } catch {
      return false;
    }
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
    try {
      await enrollInCourse(courseId);
    } finally {
      setEnrollingId(null);
    }
  };

  const getDocumentType = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(extension || '')) return 'word';
    if (['txt', 'rtf'].includes(extension || '')) return 'text';
    return 'unknown';
  };

  const getDocumentIcon = (url: string) => {
    const type = getDocumentType(url);
    switch (type) {
      case 'pdf': return <FileIcon className="h-4 w-4 text-destructive" />;
      case 'word': return <FileIcon className="h-4 w-4 text-info" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (value: string) => {
    return categories.find((c) => c.value === value)?.label || value;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      teaching: "bg-primary/15 text-primary border-primary/25",
      research: "bg-info/15 text-info border-info/25",
      technology: "bg-success/15 text-success border-success/25",
      leadership: "bg-accent/15 text-accent border-accent/25",
      communication: "bg-destructive/15 text-destructive border-destructive/25",
      general: "bg-muted text-muted-foreground border-border",
      "professional-development": "bg-primary/15 text-primary border-primary/25",
    };
    return colors[category] || colors.general;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      teaching: "📚",
      research: "🔬",
      technology: "💻",
      leadership: "🎯",
      communication: "💬",
      general: "📖",
      "professional-development": "🚀",
    };
    return icons[category] || "📖";
  };

  const getDifficultyColor = (hours: number | null) => {
    if (!hours || hours <= 2) return "bg-success/10 text-success border-success/20";
    if (hours <= 5) return "bg-accent/10 text-accent border-accent/20";
    return "bg-destructive/10 text-destructive border-destructive/20";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderCourseCard = (course: Course, index: number) => {
    const enrollment = getEnrollment(course.id);
    const enrolled = isEnrolled(course.id);
    const completed = isCompleted(course.id);
    const isEnrolling = enrollingId === course.id;

    return (
      <motion.div
        key={course.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -6, scale: 1.02, transition: { type: "spring", stiffness: 300, damping: 20 } }}
        transition={{ delay: index * 0.05 }}
        className={`relative overflow-hidden rounded-xl cursor-pointer group transition-colors duration-300 ${
          completed
            ? "border border-success/30 bg-card/60 backdrop-blur-md shadow-[0_4px_24px_-6px_hsl(var(--success)/0.15)] hover:shadow-[0_16px_40px_-8px_hsl(var(--success)/0.25)] hover:border-success/50"
            : "border border-border/40 bg-card/50 backdrop-blur-md shadow-[0_4px_24px_-6px_hsl(var(--foreground)/0.06)] hover:shadow-[0_16px_40px_-8px_hsl(var(--accent)/0.22)] hover:border-accent/40 hover:bg-card/70"
        }`}
        onClick={() => setDetailCourse(course)}
      >
        {/* Subtle top-edge gradient glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        {/* Thumbnail */}
        <div className="aspect-video bg-muted/50 relative">
          {course.thumbnail_url ? (
            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/60 to-muted/30">
              {course.course_type === 'video' ? (
                <Video className="h-12 w-12 text-muted-foreground/60" />
              ) : (
                <BookOpen className="h-12 w-12 text-muted-foreground/60" />
              )}
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-2">
            <Badge className={`backdrop-blur-sm ${getCategoryColor(course.category)}`}>
              {getCategoryLabel(course.category)}
            </Badge>
            {course.course_type === 'video' && (
              <Badge variant="secondary" className="bg-destructive/15 text-destructive backdrop-blur-sm border-0">
                <Video className="h-3 w-3 mr-1" />
                Video
              </Badge>
            )}
          </div>
          {completed && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-success/90 text-success-foreground backdrop-blur-sm border-0 shadow-sm">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-foreground/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
            <div className="bg-card/80 backdrop-blur-md rounded-full px-4 py-2 text-sm font-medium text-foreground shadow-lg border border-border/30 flex items-center gap-1.5">
              View Details <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-foreground line-clamp-2">{course.title}</h3>
          
          {course.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
          )}

          {/* Skill tags row */}
          <div className="flex flex-wrap gap-1.5 overflow-hidden">
            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 h-auto leading-tight font-semibold border whitespace-nowrap shrink-0 ${getCategoryColor(course.category)}`}>
              <span className="mr-1">{getCategoryIcon(course.category)}</span>
              {getCategoryLabel(course.category)}
            </Badge>
            {(() => {
              const difficulty = getDifficultyFromDuration(course.duration_hours);
              return (
                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 h-auto leading-tight font-semibold border whitespace-nowrap shrink-0 ${getDifficultyColor(course.duration_hours)}`}>
                  {difficulty.label}
                </Badge>
              );
            })()}
            {course.duration_hours && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-auto leading-tight text-muted-foreground border-border/50 whitespace-nowrap shrink-0">
                <Clock className="h-2.5 w-2.5 mr-1 shrink-0" />
                {course.duration_hours}h
              </Badge>
            )}
            {course.duration_hours && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-auto leading-tight font-semibold text-primary border-primary/20 bg-primary/5 whitespace-nowrap shrink-0">
                <Award className="h-2.5 w-2.5 mr-1 shrink-0" />
                +{Math.min(course.duration_hours * 5, 25)} pts
              </Badge>
            )}
          </div>

          {course.instructor_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>{course.instructor_name}</span>
            </div>
          )}

          {/* Progress indicator for enrolled courses */}
          {enrollment && enrollment.status === "in_progress" && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">Progress</span>
                <span className="font-semibold text-primary">{enrollment.progress_percentage}%</span>
              </div>
              <Progress value={enrollment.progress_percentage} className="h-2.5" showGlow />
            </div>
          )}
          {enrollment && enrollment.status === "completed" && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-success">Completed</span>
                <span className="font-semibold text-success">100%</span>
              </div>
              <Progress value={100} animated={false} className="h-2 [&>div:first-child]:bg-gradient-to-r [&>div:first-child]:from-success [&>div:first-child]:to-success/70" />
            </div>
          )}
          {enrollment && enrollment.status === "enrolled" && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="font-medium flex items-center gap-1"><BookOpen className="h-3 w-3" /> Not started</span>
                <span>0%</span>
              </div>
              <Progress value={0} animated={false} className="h-2" />
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            {completed ? (
              <Button variant="outline" className="w-full" disabled>
                <CheckCircle2 className="h-4 w-4 mr-2 text-success" />
                Completed
              </Button>
            ) : enrollment?.status === "in_progress" ? (
              <Button variant="default" className="w-full" onClick={(e) => { e.stopPropagation(); completeCourse(course.id); }}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Complete
              </Button>
            ) : enrolled ? (
              <Button variant="default" className="w-full" onClick={(e) => { e.stopPropagation(); startCourse(course.id); }}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Continue Learning
              </Button>
            ) : (
              <Button
                variant="default"
                className="w-full"
                disabled={isEnrolling}
                onClick={(e) => { e.stopPropagation(); handleEnrollWithLoading(course.id); }}
              >
                {isEnrolling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-2" />
                )}
                {isEnrolling ? "Enrolling..." : "Enroll Now"}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // Course Detail Sheet
  const renderDetailSheet = () => {
    if (!detailCourse) return null;
    const enrollment = getEnrollment(detailCourse.id);
    const enrolled = isEnrolled(detailCourse.id);
    const completed = isCompleted(detailCourse.id);
    const difficulty = getDifficultyFromDuration(detailCourse.duration_hours);
    const isEnrolling = enrollingId === detailCourse.id;

    return (
      <Sheet open={!!detailCourse} onOpenChange={(open) => { if (!open) setDetailCourse(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="text-xl leading-snug pr-6">{detailCourse.title}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-5">
            {/* Thumbnail */}
            <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
              {detailCourse.thumbnail_url ? (
                <img src={detailCourse.thumbnail_url} alt={detailCourse.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {detailCourse.course_type === 'video' ? (
                    <Video className="h-16 w-16 text-muted-foreground" />
                  ) : (
                    <BookOpen className="h-16 w-16 text-muted-foreground" />
                  )}
                </div>
              )}
              {completed && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className={getCategoryColor(detailCourse.category)}>
                {getCategoryLabel(detailCourse.category)}
              </Badge>
              <Badge variant="outline" className={difficulty.color}>
                {difficulty.label}
              </Badge>
              {detailCourse.course_type === 'video' && (
                <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                  <Video className="h-3 w-3 mr-1" />Video
                </Badge>
              )}
            </div>

            {/* Description */}
            {detailCourse.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{detailCourse.description}</p>
            )}

            <Separator />

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {detailCourse.instructor_name && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Instructor</p>
                  <p className="font-medium text-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{detailCourse.instructor_name}</p>
                </div>
              )}
              {detailCourse.duration_hours && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Duration</p>
                  <p className="font-medium text-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{detailCourse.duration_hours} hours</p>
                </div>
              )}
              {detailCourse.duration_hours && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Skill Points</p>
                  <p className="font-medium text-primary flex items-center gap-1.5"><Award className="h-3.5 w-3.5" />+{Math.min(detailCourse.duration_hours * 5, 25)} pts</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Type</p>
                <p className="font-medium text-foreground capitalize">{detailCourse.course_type}</p>
              </div>
            </div>

            {/* Progress */}
            {enrollment?.status === "in_progress" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Your Progress</span>
                    <span className="font-medium text-foreground">{enrollment.progress_percentage}%</span>
                  </div>
                  <Progress value={enrollment.progress_percentage} className="h-2.5" />
                </div>
              </>
            )}

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              {completed ? (
                <Button variant="outline" className="w-full" disabled>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-success" />
                  Course Completed
                </Button>
              ) : enrollment?.status === "in_progress" ? (
                <Button className="w-full" onClick={() => { completeCourse(detailCourse.id); setDetailCourse(null); }}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Complete
                </Button>
              ) : enrolled ? (
                <Button className="w-full" onClick={() => { startCourse(detailCourse.id); setDetailCourse(null); }}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Continue Learning
                </Button>
              ) : (
                <Button
                  className="w-full"
                  disabled={isEnrolling}
                  onClick={async () => {
                    await handleEnrollWithLoading(detailCourse.id);
                  }}
                >
                  {isEnrolling ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TrendingUp className="h-4 w-4 mr-2" />
                  )}
                  {isEnrolling ? "Enrolling..." : "Enroll in this Course"}
                </Button>
              )}

              {/* Media buttons */}
              {detailCourse.course_type === 'video' && detailCourse.video_url && (
                isEmbeddableUrl(detailCourse.video_url) ? (
                  <Button variant="outline" className="w-full" onClick={() => { handlePlayVideo(detailCourse); setDetailCourse(null); }}>
                    <Play className="h-4 w-4 mr-2" />
                    Watch Video
                  </Button>
                ) : (
                  <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                    <p className="text-sm text-muted-foreground">This course is hosted externally. Click below to continue learning.</p>
                    <Button variant="outline" className="w-full" onClick={() => window.open(detailCourse.video_url!, '_blank', 'noopener,noreferrer')}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Course
                    </Button>
                  </div>
                )
              )}
              {detailCourse.course_url && !detailCourse.video_url && (
                <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">This course is hosted externally. Click below to continue learning.</p>
                  <Button variant="outline" className="w-full" onClick={() => window.open(detailCourse.course_url!, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Course
                  </Button>
                </div>
              )}
              {detailCourse.course_type === 'regular' && detailCourse.document_url && (
                <Button variant="outline" className="w-full" onClick={() => { handleViewDocument(detailCourse); setDetailCourse(null); }}>
                  {getDocumentIcon(detailCourse.document_url)}
                  <span className="ml-2">View Document</span>
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Capacity Building Courses</h2>
          <p className="text-muted-foreground mt-1">
            Browse and complete courses to earn skill points
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-primary/10 rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-bold text-primary">{getCompletedCount()}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="bg-accent/10 rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-bold text-accent-foreground">{getInProgressCount()}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="bg-secondary rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-bold text-secondary-foreground">{myLearningCourses.length}</div>
            <div className="text-xs text-muted-foreground">Enrolled</div>
          </div>
        </div>
      </div>

      {/* Search + Type filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="regular">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Regular
              </div>
            </SelectItem>
            <SelectItem value="video">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = cat.value === "all"
            ? filteredByTypeAndSearch.length
            : filteredByTypeAndSearch.filter((c) => c.category === cat.value).length;
          return (
            <Button
              key={cat.value}
              variant={categoryFilter === cat.value ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs"
              onClick={() => setCategoryFilter(cat.value)}
            >
              {cat.label}
              <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px] rounded-full">
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* Courses Tabs */}
      <Tabs defaultValue="tracks" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="tracks" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Tracks
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            All ({filteredCourses.length})
          </TabsTrigger>
          <TabsTrigger value="my-learning" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            My Learning ({myLearningCourses.length})
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Videos ({videoCourses.length})
          </TabsTrigger>
          <TabsTrigger value="regular" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Courses ({regularCourses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracks" className="mt-6">
          <LearningTracks courses={filteredCourses} />
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {filteredCourses.length === 0 ? (
            <SmartEmptyState
              icon={BookOpen}
              title={searchQuery || categoryFilter !== "all" || typeFilter !== "all" ? "No matching courses" : "No courses available yet"}
              description={searchQuery || categoryFilter !== "all" || typeFilter !== "all"
                ? "Try adjusting your search or filter criteria to find what you're looking for."
                : "Courses will appear here once your admin creates training programs. Check back soon!"}
              actionLabel={searchQuery || categoryFilter !== "all" ? "Clear Filters" : undefined}
              onAction={searchQuery || categoryFilter !== "all" ? () => { setSearchQuery(""); setCategoryFilter("all"); setTypeFilter("all"); } : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course, index) => renderCourseCard(course, index))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-learning" className="mt-6">
          {myLearningCourses.length === 0 ? (
            <SmartEmptyState
              icon={GraduationCap}
              title="No courses enrolled yet"
              description="Browse available courses and enroll to start your learning journey. Your enrolled courses will appear here."
              actionLabel="Browse Courses"
              onAction={() => {}}
            />
          ) : (
            <div className="space-y-6">
              {/* Overall progress summary */}
              {(() => {
                const total = myLearningCourses.length;
                const completedCount = myLearningCourses.filter(c => isCompleted(c.id)).length;
                const inProgressCount = myLearningCourses.filter(c => getEnrollment(c.id)?.status === "in_progress").length;
                const overallPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
                const avgProgress = total > 0
                  ? Math.round(myLearningCourses.reduce((sum, c) => sum + (getEnrollment(c.id)?.progress_percentage || 0), 0) / total)
                  : 0;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-md p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Overall Learning Progress</h3>
                      <span className="text-xs text-muted-foreground">{completedCount}/{total} courses completed</span>
                    </div>
                    <Progress value={avgProgress} className="h-3" showGlow />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-primary">{inProgressCount}</p>
                        <p className="text-[11px] text-muted-foreground">In Progress</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-success">{completedCount}</p>
                        <p className="text-[11px] text-muted-foreground">Completed</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-accent">{overallPercent}%</p>
                        <p className="text-[11px] text-muted-foreground">Completion Rate</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}

              {/* In Progress section */}
              {(() => {
                const inProgress = myLearningCourses.filter(c => getEnrollment(c.id)?.status === "in_progress");
                if (inProgress.length === 0) return null;
                return (
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                      <PlayCircle className="h-4 w-4 text-primary" />
                      In Progress ({inProgress.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {inProgress.map((course, index) => renderCourseCard(course, index))}
                    </div>
                  </div>
                );
              })()}
              {/* Enrolled (not started) */}
              {(() => {
                const justEnrolled = myLearningCourses.filter(c => getEnrollment(c.id)?.status === "enrolled");
                if (justEnrolled.length === 0) return null;
                return (
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      Not Started ({justEnrolled.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {justEnrolled.map((course, index) => renderCourseCard(course, index))}
                    </div>
                  </div>
                );
              })()}
              {/* Completed */}
              {(() => {
                const done = myLearningCourses.filter(c => isCompleted(c.id));
                if (done.length === 0) return null;
                return (
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Completed ({done.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {done.map((course, index) => renderCourseCard(course, index))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </TabsContent>

        <TabsContent value="video" className="mt-6">
          {videoCourses.length === 0 ? (
            <SmartEmptyState
              icon={Video}
              title="No video courses yet"
              description="Video-based training courses will appear here once they're published by your admin."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videoCourses.map((course, index) => renderCourseCard(course, index))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="regular" className="mt-6">
          {regularCourses.length === 0 ? (
            <SmartEmptyState
              icon={FileText}
              title="No regular courses yet"
              description="Document-based courses and training materials will appear here when available."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularCourses.map((course, index) => renderCourseCard(course, index))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Course Detail Sheet */}
      {renderDetailSheet()}

      {/* Video Modal */}
      <Dialog open={videoModalOpen} onOpenChange={handleVideoModalClose}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              {selectedCourse?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {loadingMedia ? (
              <div className="aspect-video flex items-center justify-center bg-muted rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : signedVideoUrl && isYouTubeUrl(selectedCourse?.video_url ?? null) ? (
              <div className="aspect-video">
                <iframe
                  src={signedVideoUrl}
                  className="w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={selectedCourse?.title}
                />
              </div>
            ) : signedVideoUrl ? (
              <div className="aspect-video">
                <video src={signedVideoUrl} controls className="w-full h-full rounded-lg" autoPlay />
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center bg-muted rounded-lg">
                <p className="text-muted-foreground">Unable to load video. Please enroll in this course first.</p>
              </div>
            )}
            {selectedCourse?.description && (
              <p className="mt-4 text-muted-foreground">{selectedCourse.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {selectedCourse?.instructor_name && (
                <div className="flex items-center gap-1"><User className="h-4 w-4" /><span>{selectedCourse.instructor_name}</span></div>
              )}
              {selectedCourse?.duration_hours && (
                <div className="flex items-center gap-1"><Clock className="h-4 w-4" /><span>{selectedCourse.duration_hours} hours</span></div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Modal */}
      <Dialog open={documentModalOpen} onOpenChange={handleDocumentModalClose}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 pb-0 flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedCourse?.title}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-4 overflow-hidden">
            {loadingMedia ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : signedDocumentUrl && selectedCourse?.document_url ? (
              <>
                {getDocumentType(selectedCourse.document_url) === 'pdf' ? (
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
                      <Button onClick={() => window.open(signedDocumentUrl, '_blank')}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Document
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Unable to load document. Please enroll in this course first.</p>
              </div>
            )}
            {selectedCourse?.description && (
              <p className="mt-4 text-muted-foreground">{selectedCourse.description}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoursesViewer;
