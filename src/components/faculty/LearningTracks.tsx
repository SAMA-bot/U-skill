import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Brain,
  Database,
  Cloud,
  GraduationCap,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
  Award,
  Signal,
  BookOpen,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import SmartEmptyState from "@/components/dashboard/SmartEmptyState";
import { useCourseEnrollments } from "@/hooks/useCourseEnrollments";
import { LucideIcon } from "lucide-react";

export interface Course {
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
  content_type?: string;
  is_published: boolean;
  tags?: string[] | null;
}

export interface TrackDefinition {
  key: string;
  label: string;
  icon: LucideIcon;
  categories: string[];
  accentClass: string;
  iconBgClass: string;
}

export const TRACKS: TrackDefinition[] = [
  {
    key: "cyber-security",
    label: "Cyber Security",
    icon: Shield,
    categories: ["technology"],
    accentClass: "border-primary/40",
    iconBgClass: "bg-primary/10 text-primary",
  },
  {
    key: "ai-ml",
    label: "AI & Machine Learning",
    icon: Brain,
    categories: ["technology", "research"],
    accentClass: "border-accent/40",
    iconBgClass: "bg-accent/10 text-accent-foreground",
  },
  {
    key: "data-science",
    label: "Data Science",
    icon: Database,
    categories: ["research"],
    accentClass: "border-info/40",
    iconBgClass: "bg-info/10 text-info",
  },
  {
    key: "cloud-computing",
    label: "Cloud Computing",
    icon: Cloud,
    categories: ["technology"],
    accentClass: "border-success/40",
    iconBgClass: "bg-success/10 text-success",
  },
  {
    key: "teaching-skills",
    label: "Teaching Skills",
    icon: GraduationCap,
    categories: ["teaching"],
    accentClass: "border-destructive/20",
    iconBgClass: "bg-destructive/10 text-destructive",
  },
  {
    key: "leadership",
    label: "Leadership & Management",
    icon: Layers,
    categories: ["leadership"],
    accentClass: "border-muted-foreground/30",
    iconBgClass: "bg-muted text-muted-foreground",
  },
  {
    key: "communication",
    label: "Communication Skills",
    icon: Signal,
    categories: ["communication"],
    accentClass: "border-primary/30",
    iconBgClass: "bg-secondary text-secondary-foreground",
  },
  {
    key: "general",
    label: "General Development",
    icon: BookOpen,
    categories: ["general", "professional-development"],
    accentClass: "border-border",
    iconBgClass: "bg-muted text-foreground",
  },
];

export const getDifficultyFromDuration = (hours: number | null): { label: string; color: string } => {
  if (!hours || hours <= 2) return { label: "Beginner", color: "bg-success/15 text-success border-success/30" };
  if (hours <= 5) return { label: "Intermediate", color: "bg-accent/15 text-accent-foreground border-accent/30" };
  return { label: "Advanced", color: "bg-destructive/15 text-destructive border-destructive/30" };
};

interface LearningTracksProps {
  courses: Course[];
}

const TrackRow = ({ track, courses }: { track: TrackDefinition; courses: Course[] }) => {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const {
    enrollInCourse,
    startCourse,
    completeCourse,
    getEnrollment,
    isEnrolled,
    isCompleted,
  } = useCourseEnrollments();

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -amount : amount,
        behavior: "smooth",
      });
    }
  };

  const Icon = track.icon;
  const displayCourses = expanded ? courses : courses.slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${track.accentClass} bg-card overflow-hidden`}
    >
      {/* Track Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(`/learning-track/${track.key}`)}
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${track.iconBgClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground hover:text-primary transition-colors">{track.label}</h3>
            <p className="text-xs text-muted-foreground">{courses.length} course{courses.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scroll("left")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scroll("right")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {courses.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 text-xs text-muted-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Collapse" : "View All"}
              {expanded ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
            </Button>
          )}
        </div>
      </div>

      {/* Horizontal Scroll or Expanded Grid */}
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {displayCourses.map((course, i) => (
              <TrackCourseCard
                key={course.id}
                course={course}
                index={i}
                enrollInCourse={enrollInCourse}
                startCourse={startCourse}
                completeCourse={completeCourse}
                getEnrollment={getEnrollment}
                isEnrolled={isEnrolled}
                isCompleted={isCompleted}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div key="scroll" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto p-4 scrollbar-hide"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {displayCourses.map((course, i) => (
                <div key={course.id} className="flex-shrink-0 w-[260px]">
                  <TrackCourseCard
                    course={course}
                    index={i}
                    enrollInCourse={enrollInCourse}
                    startCourse={startCourse}
                    completeCourse={completeCourse}
                    getEnrollment={getEnrollment}
                    isEnrolled={isEnrolled}
                    isCompleted={isCompleted}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface TrackCourseCardProps {
  course: Course;
  index: number;
  enrollInCourse: (courseId: string) => void;
  startCourse: (courseId: string) => void;
  completeCourse: (courseId: string) => void;
  getEnrollment: (courseId: string) => any;
  isEnrolled: (courseId: string) => boolean;
  isCompleted: (courseId: string) => boolean;
}

const TrackCourseCard = ({
  course,
  index,
  enrollInCourse,
  startCourse,
  completeCourse,
  getEnrollment,
  isEnrolled,
  isCompleted,
}: TrackCourseCardProps) => {
  const navigate = useNavigate();
  const enrollment = getEnrollment(course.id);
  const enrolled = isEnrolled(course.id);
  const completed = isCompleted(course.id);
  const difficulty = getDifficultyFromDuration(course.duration_hours);

  const handleCardClick = () => {
    navigate(`/courses/${course.id}`);
  };

  const handleEnroll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await enrollInCourse(course.id);
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/courses/${course.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={handleCardClick}
      className={`group flex flex-col rounded-lg border bg-card shadow-sm transition-all duration-300 hover:shadow-lg cursor-pointer ${
        completed ? "border-success/50" : "border-border hover:border-primary/30"
      }`}
    >
      {/* Card Top */}
      <div className="p-4 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-snug">{course.title}</h4>
          {completed && <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />}
        </div>

        <div className="flex flex-wrap gap-1.5">
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
        </div>

        {enrollment?.status === "in_progress" && (
          <div className="space-y-1">
            <Progress value={enrollment.progress_percentage} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">{enrollment.progress_percentage}% complete</p>
          </div>
        )}
      </div>

      {/* Card Action */}
      <div className="px-4 pb-4">
        {completed ? (
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleAction}>
            <PlayCircle className="h-3.5 w-3.5 mr-1.5 text-success" />
            View Again
          </Button>
        ) : enrollment?.status === "in_progress" ? (
          <Button size="sm" className="w-full text-xs" onClick={handleAction}>
            <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
            Continue Learning
          </Button>
        ) : enrolled ? (
          <Button size="sm" className="w-full text-xs" onClick={handleAction}>
            <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
            Start Learning
          </Button>
        ) : (
          <Button size="sm" className="w-full text-xs" onClick={handleEnroll}>
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            Enroll Now
          </Button>
        )}
      </div>
    </motion.div>
  );
};

const LearningTracks = ({ courses }: LearningTracksProps) => {
  const tracksWithCourses = TRACKS.map((track) => ({
    track,
    courses: courses.filter((c) => track.categories.includes(c.category)),
  })).filter((t) => t.courses.length > 0);

  if (tracksWithCourses.length === 0) {
    return (
      <SmartEmptyState
        icon={Layers}
        title="No learning tracks available"
        description="Courses will be organized into learning tracks once your admin publishes training programs."
      />
    );
  }

  return (
    <div className="space-y-6">
      {tracksWithCourses.map(({ track, courses: trackCourses }, i) => (
        <motion.div
          key={track.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <TrackRow track={track} courses={trackCourses} />
        </motion.div>
      ))}
    </div>
  );
};

export default LearningTracks;
