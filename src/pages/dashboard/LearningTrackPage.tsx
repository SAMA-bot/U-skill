import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Award,
  PlayCircle,
  TrendingUp,
  BookOpen,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import SmartEmptyState from "@/components/dashboard/SmartEmptyState";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCourseEnrollments } from "@/hooks/useCourseEnrollments";
import { useToast } from "@/hooks/use-toast";
import {
  TRACKS,
  getDifficultyFromDuration,
  type Course,
} from "@/components/faculty/LearningTracks";

const LearningTrackPage = () => {
  const { trackKey } = useParams<{ trackKey: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    enrollInCourse,
    startCourse,
    completeCourse,
    getEnrollment,
    isEnrolled,
    isCompleted,
  } = useCourseEnrollments();

  const track = TRACKS.find((t) => t.key === trackKey);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (track) fetchCourses();
  }, [track]);

  const fetchCourses = async () => {
    if (!track) return;
    try {
      const { data, error } = await supabase
        .from("courses_public" as any)
        .select("*")
        .in("category", track.categories)
        .order("created_at", { ascending: true });

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

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <SmartEmptyState
          icon={BookOpen}
          title="Track not found"
          description="The learning track you're looking for doesn't exist."
          actionLabel="Back to Dashboard"
          onAction={() => navigate("/dashboard")}
        />
      </div>
    );
  }

  const completedCount = courses.filter((c) => isCompleted(c.id)).length;
  const totalCount = courses.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const Icon = track.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${track.iconBgClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-tight">{track.label}</h1>
              <p className="text-xs text-muted-foreground">{totalCount} course{totalCount !== 1 ? "s" : ""} in this track</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Track Progress Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border ${track.accentClass} bg-card p-5 sm:p-6`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Track Progress</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {completedCount} of {totalCount} courses completed
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">{completedCount} Done</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span className="font-medium">{totalCount - completedCount} Remaining</span>
              </div>
            </div>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2 text-right">{progressPercent}% complete</p>
        </motion.div>

        {/* Course Playlist */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <SmartEmptyState
            icon={BookOpen}
            title="No courses in this track yet"
            description="Courses will appear here once your admin publishes training programs for this category."
            actionLabel="Back to Courses"
            onAction={() => navigate("/dashboard")}
          />
        ) : (
          <div className="space-y-3">
            {courses.map((course, index) => {
              const enrollment = getEnrollment(course.id);
              const enrolled = isEnrolled(course.id);
              const completed = isCompleted(course.id);
              const difficulty = getDifficultyFromDuration(course.duration_hours);

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={`group flex gap-4 rounded-xl border bg-card p-4 sm:p-5 transition-all duration-300 hover:shadow-md ${
                    completed
                      ? "border-success/40 bg-success/5"
                      : enrollment?.status === "in_progress"
                      ? "border-primary/30"
                      : "border-border hover:border-primary/20"
                  }`}
                >
                  {/* Order Number */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                        completed
                          ? "bg-success text-success-foreground"
                          : enrollment?.status === "in_progress"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {completed ? <CheckCircle2 className="h-4.5 w-4.5" /> : index + 1}
                    </div>
                    {index < courses.length - 1 && (
                      <div className={`w-0.5 flex-1 min-h-[20px] ${completed ? "bg-success/40" : "bg-border"}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-foreground text-sm sm:text-base leading-snug">
                        {course.title}
                      </h3>
                      {completed && (
                        <Badge className="bg-success/15 text-success border-success/30 flex-shrink-0 text-[10px]">
                          Completed
                        </Badge>
                      )}
                    </div>

                    {course.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {course.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${difficulty.color}`}>
                        {difficulty.label}
                      </Badge>
                      {course.duration_hours && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />
                          {course.duration_hours}h
                        </Badge>
                      )}
                      {course.duration_hours && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-primary border-primary/30">
                          <Award className="h-2.5 w-2.5 mr-0.5" />
                          +{Math.min(course.duration_hours * 5, 25)} pts
                        </Badge>
                      )}
                      {course.instructor_name && (
                        <span className="text-xs text-muted-foreground">by {course.instructor_name}</span>
                      )}
                    </div>

                    {enrollment?.status === "in_progress" && (
                      <div className="max-w-xs space-y-1">
                        <Progress value={enrollment.progress_percentage} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground">{enrollment.progress_percentage}% complete</p>
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0 flex items-center">
                    {completed ? (
                      <Button variant="outline" size="sm" disabled className="text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-success" />
                        Done
                      </Button>
                    ) : enrollment?.status === "in_progress" ? (
                      <Button size="sm" className="text-xs" onClick={() => completeCourse(course.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Complete
                      </Button>
                    ) : enrolled ? (
                      <Button size="sm" className="text-xs" onClick={() => startCourse(course.id)}>
                        <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                        Start
                      </Button>
                    ) : (
                      <Button size="sm" className="text-xs" onClick={() => enrollInCourse(course.id)}>
                        <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                        Enroll
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default LearningTrackPage;
