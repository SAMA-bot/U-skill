import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Trophy, Flame, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import LearningPathNode, { type NodeState } from "./LearningPathNode";
import { cn } from "@/lib/utils";
import type { TrackDefinition } from "./LearningTracks";

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string;
  duration_hours: number | null;
  instructor_name: string | null;
  content_type: string;
  video_url: string | null;
  document_url: string | null;
  course_url: string | null;
}

interface LearningPathCardProps {
  track: TrackDefinition;
  courses: Course[];
  getEnrollment: (courseId: string) => any;
  isCompleted: (courseId: string) => boolean;
  onLessonClick: (course: Course, state: NodeState) => void;
}

const LearningPathCard = ({ track, courses, getEnrollment, isCompleted, onLessonClick }: LearningPathCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = track.icon;

  // Determine each lesson's state based on sequential progression
  const getLessonStates = (): NodeState[] => {
    return courses.map((course, i) => {
      const enrollment = getEnrollment(course.id);
      if (enrollment?.status === "completed") return "completed";
      if (enrollment?.status === "in_progress") return "in_progress";
      if (enrollment?.status === "enrolled") return "available";
      
      // If no enrollment: available only if previous is completed (or first lesson)
      if (i === 0) return "available";
      const prevCompleted = isCompleted(courses[i - 1].id);
      return prevCompleted ? "available" : "locked";
    });
  };

  const states = getLessonStates();
  const completedCount = states.filter(s => s === "completed").length;
  const totalCount = courses.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalXp = courses.reduce((sum, c) => sum + Math.min((c.duration_hours || 2) * 5, 25), 0);
  const earnedXp = courses.reduce((sum, c, i) => {
    if (states[i] === "completed") return sum + Math.min((c.duration_hours || 2) * 5, 25);
    return sum;
  }, 0);

  const isPathComplete = completedCount === totalCount && totalCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border bg-card overflow-hidden transition-all duration-300",
        isPathComplete ? "border-success/40 shadow-[0_0_30px_hsl(var(--success)/0.1)]" : "border-border/50",
      )}
    >
      {/* Path header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
      >
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl shrink-0", track.iconBgClass)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-foreground text-base truncate">{track.label}</h3>
            {isPathComplete && (
              <Badge className="bg-success/15 text-success border-success/30 text-[10px]">
                <Trophy className="h-3 w-3 mr-0.5" /> Complete
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground">{completedCount}/{totalCount} lessons</span>
            <span className="text-xs font-semibold text-primary flex items-center gap-0.5">
              <Star className="h-3 w-3" /> {earnedXp}/{totalXp} XP
            </span>
          </div>
          <Progress value={progressPercent} className="h-2 mt-2" animated={false} />
        </div>
        <ChevronDown className={cn(
          "h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-300",
          expanded && "rotate-180"
        )} />
      </button>

      {/* Roadmap nodes */}
      <AnimatePresence>
        {expanded && (
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
                  <span className="text-sm font-bold text-foreground">{earnedXp} XP earned</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-muted-foreground">{progressPercent}% complete</span>
                </div>
              </div>

              {/* Vertical path */}
              <div className="flex flex-col items-center gap-1">
                {courses.map((course, i) => {
                  const xp = Math.min((course.duration_hours || 2) * 5, 25);
                  return (
                    <div key={course.id} className="flex flex-col items-center">
                      <LearningPathNode
                        title={course.title}
                        state={states[i]}
                        contentType={course.content_type}
                        xp={xp}
                        index={i}
                        onClick={() => onLessonClick(course, states[i])}
                      />
                      {/* Connector line */}
                      {i < courses.length - 1 && (
                        <div className="flex flex-col items-center my-1">
                          {[0, 1, 2].map(dot => (
                            <div
                              key={dot}
                              className={cn(
                                "w-1 h-1 rounded-full my-0.5",
                                states[i] === "completed" ? "bg-success/60" : "bg-border"
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Path completion badge */}
                {isPathComplete && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mt-4 flex flex-col items-center gap-2"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-success to-success/70 flex items-center justify-center border-[3px] border-success/40 shadow-[0_0_24px_hsl(var(--success)/0.3)]">
                      <Trophy className="h-7 w-7 text-success-foreground" />
                    </div>
                    <span className="text-xs font-bold text-success">Path Mastered!</span>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LearningPathCard;
