import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, BookOpen, TrendingDown, GraduationCap, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePerformanceScore } from "@/hooks/usePerformanceScore";

interface SuggestedCourse {
  id: string;
  title: string;
  category: string;
  duration_hours: number | null;
  course_type: string;
}

interface WeakArea {
  area: string;
  score: number;
  weight: string;
  icon: typeof BookOpen;
  suggestion: string;
  relatedCategories: string[];
}

const AreasToImprove = () => {
  const { user } = useAuth();
  const scoreData = usePerformanceScore(user?.id);
  const [suggestedCourses, setSuggestedCourses] = useState<SuggestedCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const weakAreas: WeakArea[] = [];

  if (!scoreData.loading) {
    if (scoreData.trainingScore < 70) {
      weakAreas.push({
        area: "Trainings Attended",
        score: scoreData.trainingScore,
        weight: "30%",
        icon: GraduationCap,
        suggestion: `Complete ${Math.max(0, 10 - scoreData.trainingsCount)} more trainings to reach target`,
        relatedCategories: ["pedagogy", "technical", "general"],
      });
    }
    if (scoreData.feedbackScore < 70) {
      weakAreas.push({
        area: "Student Feedback",
        score: scoreData.feedbackScore,
        weight: "40%",
        icon: TrendingDown,
        suggestion: "Improve teaching methods — consider pedagogy workshops",
        relatedCategories: ["pedagogy", "teaching"],
      });
    }
    if (scoreData.publicationScore < 70) {
      weakAreas.push({
        area: "Publications",
        score: scoreData.publicationScore,
        weight: "30%",
        icon: BookOpen,
        suggestion: `Publish ${Math.max(0, 5 - scoreData.publicationsCount)} more papers to reach target`,
        relatedCategories: ["research", "technical"],
      });
    }
  }

  useEffect(() => {
    if (weakAreas.length > 0) {
      fetchSuggestedCourses();
    } else {
      setLoadingCourses(false);
    }
  }, [scoreData.loading]);

  const fetchSuggestedCourses = async () => {
    try {
      const allCategories = weakAreas.flatMap((w) => w.relatedCategories);
      const unique = [...new Set(allCategories)];

      const { data } = await supabase
        .from("courses_public")
        .select("id, title, category, duration_hours, course_type")
        .eq("is_published", true)
        .in("category", unique)
        .limit(6);

      // If not enough category matches, fill with any published courses
      if (!data || data.length < 3) {
        const { data: fallback } = await supabase
          .from("courses_public")
          .select("id, title, category, duration_hours, course_type")
          .eq("is_published", true)
          .limit(6);
        setSuggestedCourses(fallback || []);
      } else {
        setSuggestedCourses(data);
      }
    } catch (err) {
      console.error("Error fetching suggested courses:", err);
    } finally {
      setLoadingCourses(false);
    }
  };

  if (scoreData.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-6">
      {/* Areas to Improve */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Areas to Improve
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weakAreas.length === 0 ? (
            <div className="text-center py-6">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-sm">
                All areas on track!
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Your performance scores are above 70% in all categories.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {weakAreas.map((area, idx) => (
                <motion.div
                  key={area.area}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-3 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <area.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{area.area}</span>
                      <span className="text-xs text-muted-foreground">({area.weight})</span>
                    </div>
                    <span className={`text-sm font-bold ${getScoreColor(area.score)}`}>
                      {area.score}/100
                    </span>
                  </div>
                  <Progress value={area.score} className="h-1.5 mb-2" />
                  <p className="text-xs text-muted-foreground">{area.suggestion}</p>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggested Trainings */}
      {weakAreas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Suggested Trainings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCourses ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : suggestedCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No matching courses available yet. Check back later!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <h4 className="text-sm font-medium text-foreground line-clamp-2">
                      {course.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {course.category}
                      </Badge>
                      {course.duration_hours && (
                        <span className="text-xs text-muted-foreground">
                          {course.duration_hours}h
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AreasToImprove;
