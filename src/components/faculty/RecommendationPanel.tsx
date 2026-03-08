import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, GraduationCap, BookOpen, TrendingDown, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePerformanceScore } from "@/hooks/usePerformanceScore";

interface Recommendation {
  id: string;
  type: "training" | "activity";
  title: string;
  reason: string;
  category: string;
  priority: "high" | "medium" | "low";
  duration?: string;
}

interface RecommendationPanelProps {
  onNavigate?: (section: string) => void;
}

const RecommendationPanel = ({ onNavigate }: RecommendationPanelProps) => {
  const { user } = useAuth();
  const scoreData = usePerformanceScore(user?.id);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const recommendations: Recommendation[] = [];

  if (!scoreData.loading) {
    // Training recommendations based on low training score
    if (scoreData.trainingScore < 70) {
      const remaining = Math.max(0, 10 - scoreData.trainingsCount);
      recommendations.push({
        id: "train-1",
        type: "activity",
        title: "Attend More Workshops & Trainings",
        reason: `Training score is ${scoreData.trainingScore}/100. Complete ${remaining} more to reach target.`,
        category: "workshop",
        priority: scoreData.trainingScore < 40 ? "high" : "medium",
      });
    }

    // Feedback recommendations
    if (scoreData.feedbackScore < 70) {
      recommendations.push({
        id: "feedback-1",
        type: "training",
        title: "Enroll in Pedagogy Enhancement Course",
        reason: `Student feedback score is ${scoreData.feedbackScore}/100. Improve teaching methods.`,
        category: "pedagogy",
        priority: scoreData.feedbackScore < 40 ? "high" : "medium",
      });
      recommendations.push({
        id: "feedback-2",
        type: "activity",
        title: "Start Peer Teaching Observation",
        reason: "Learn from peers to improve classroom engagement and delivery.",
        category: "teaching",
        priority: "medium",
      });
    }

    // Publication recommendations
    if (scoreData.publicationScore < 70) {
      const remaining = Math.max(0, 5 - scoreData.publicationsCount);
      recommendations.push({
        id: "pub-1",
        type: "activity",
        title: "Submit Research Paper for Publication",
        reason: `Publication score is ${scoreData.publicationScore}/100. Publish ${remaining} more papers.`,
        category: "research",
        priority: scoreData.publicationScore < 40 ? "high" : "medium",
      });
      recommendations.push({
        id: "pub-2",
        type: "training",
        title: "Join Research Methodology Workshop",
        reason: "Strengthen research skills to increase publication output.",
        category: "research",
        priority: "low",
      });
    }

    // If all scores are good
    if (scoreData.trainingScore >= 70 && scoreData.feedbackScore >= 70 && scoreData.publicationScore >= 70) {
      recommendations.push({
        id: "maintain-1",
        type: "activity",
        title: "Mentor Junior Faculty Members",
        reason: "Your performance is strong. Share your expertise with others!",
        category: "mentoring",
        priority: "low",
      });
      recommendations.push({
        id: "maintain-2",
        type: "training",
        title: "Explore Advanced Research Topics",
        reason: "Keep growing by diving into cutting-edge areas in your field.",
        category: "research",
        priority: "low",
      });
    }
  }

  useEffect(() => {
    if (!scoreData.loading) fetchRelevantCourses();
  }, [scoreData.loading]);

  const fetchRelevantCourses = async () => {
    try {
      const categories: string[] = [];
      if (scoreData.feedbackScore < 70) categories.push("pedagogy", "teaching");
      if (scoreData.publicationScore < 70) categories.push("research", "technical");
      if (scoreData.trainingScore < 70) categories.push("general", "technology");

      let query = supabase
        .from("courses_public")
        .select("id, title, category, duration_hours, course_type")
        .eq("is_published", true)
        .limit(4);

      if (categories.length > 0) {
        query = query.in("category", categories);
      }

      const { data } = await query;
      setCourses(data || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getTypeIcon = (type: string) => {
    return type === "training" ? GraduationCap : BookOpen;
  };

  if (scoreData.loading || loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Smart Recommendations
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Personalized suggestions based on your performance metrics
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {recommendations.slice(0, 5).map((rec, idx) => {
            const Icon = getTypeIcon(rec.type);
            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-medium text-foreground">{rec.title}</h4>
                    <Badge variant="outline" className={`text-[10px] ${getPriorityStyle(rec.priority)}`}>
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Suggested Courses */}
        {courses.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Recommended Courses
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="p-2.5 rounded-md border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onNavigate?.("courses")}
                >
                  <p className="text-sm font-medium text-foreground line-clamp-1">{course.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{course.category}</Badge>
                    {course.duration_hours && (
                      <span className="text-[10px] text-muted-foreground">{course.duration_hours}h</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onNavigate?.("courses")}
          >
            Browse Trainings
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onNavigate?.("activities")}
          >
            Log Activity
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecommendationPanel;
