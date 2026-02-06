import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

export interface PerformanceScoreData {
  trainingScore: number; // normalized 0-100
  feedbackScore: number; // normalized 0-100
  publicationScore: number; // normalized 0-100
  compositeScore: number; // weighted total out of 100
  badge: "Excellent" | "Good" | "Needs Improvement";
  trainingsCount: number;
  publicationsCount: number;
  avgFeedback: number;
  loading: boolean;
}

const WEIGHTS = {
  training: 0.3,
  feedback: 0.4,
  publication: 0.3,
};

// Normalization targets
const TRAINING_TARGET = 10; // 10 completed trainings = 100%
const PUBLICATION_TARGET = 5; // 5 publications = 100%

const getBadge = (score: number): PerformanceScoreData["badge"] => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  return "Needs Improvement";
};

export const usePerformanceScore = (userId?: string) => {
  const [data, setData] = useState<PerformanceScoreData>({
    trainingScore: 0,
    feedbackScore: 0,
    publicationScore: 0,
    compositeScore: 0,
    badge: "Needs Improvement",
    trainingsCount: 0,
    publicationsCount: 0,
    avgFeedback: 0,
    loading: true,
  });

  const { selectedYear, getDateRangeForYear } = useAcademicYear();

  useEffect(() => {
    if (userId) fetchScore();
  }, [userId, selectedYear]);

  const fetchScore = async () => {
    if (!userId) return;

    const dateRange = getDateRangeForYear(selectedYear);
    const startDate = dateRange?.start.toISOString();
    const endDate = dateRange?.end.toISOString();
    const academicStartYear = parseInt(selectedYear.split("-")[0]);

    try {
      // 1. Trainings attended (completed course enrollments + completed training activities)
      let enrollQuery = supabase
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed");
      if (startDate && endDate) {
        enrollQuery = enrollQuery.gte("enrolled_at", startDate).lte("enrolled_at", endDate);
      }
      const { count: enrollCount } = await enrollQuery;

      let activityTrainingQuery = supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed")
        .in("activity_type", ["workshop", "seminar", "conference", "training"]);
      if (startDate && endDate) {
        activityTrainingQuery = activityTrainingQuery
          .gte("created_at", startDate)
          .lte("created_at", endDate);
      }
      const { count: activityTrainingCount } = await activityTrainingQuery;

      const trainingsCount = (enrollCount || 0) + (activityTrainingCount || 0);
      const trainingScore = Math.min(Math.round((trainingsCount / TRAINING_TARGET) * 100), 100);

      // 2. Average student feedback rating (using teaching_score from performance_metrics)
      const { data: perfData } = await supabase
        .from("performance_metrics")
        .select("teaching_score")
        .eq("user_id", userId)
        .or(`year.eq.${academicStartYear},year.eq.${academicStartYear + 1}`);

      let avgFeedback = 0;
      if (perfData && perfData.length > 0) {
        const total = perfData.reduce((sum, p) => sum + (p.teaching_score || 0), 0);
        avgFeedback = Math.round(total / perfData.length);
      }
      const feedbackScore = avgFeedback; // already 0-100

      // 3. Publications count
      let pubQuery = supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed")
        .in("activity_type", ["publication", "research"]);
      if (startDate && endDate) {
        pubQuery = pubQuery.gte("created_at", startDate).lte("created_at", endDate);
      }
      const { count: pubCount } = await pubQuery;

      const publicationsCount = pubCount || 0;
      const publicationScore = Math.min(
        Math.round((publicationsCount / PUBLICATION_TARGET) * 100),
        100
      );

      // Composite score
      const compositeScore = Math.round(
        trainingScore * WEIGHTS.training +
          feedbackScore * WEIGHTS.feedback +
          publicationScore * WEIGHTS.publication
      );

      setData({
        trainingScore,
        feedbackScore,
        publicationScore,
        compositeScore,
        badge: getBadge(compositeScore),
        trainingsCount,
        publicationsCount,
        avgFeedback,
        loading: false,
      });
    } catch (error) {
      console.error("Error calculating performance score:", error);
      setData((prev) => ({ ...prev, loading: false }));
    }
  };

  return data;
};
