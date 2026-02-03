import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { getUserFriendlyError } from "@/lib/errorMessages";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

type EnrollmentStatus = "enrolled" | "in_progress" | "completed";

interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  status: EnrollmentStatus;
  progress_percentage: number;
}

interface CourseActionResponse {
  success?: boolean;
  data?: CourseEnrollment;
  error?: string;
  message?: string;
  retryAfter?: number;
}

export const useCourseEnrollments = () => {
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedYear, getDateRangeForYear } = useAcademicYear();

  const fetchEnrollments = useCallback(async () => {
    if (!user) return;

    // Get date range for selected academic year
    const dateRange = getDateRangeForYear(selectedYear);
    const startDate = dateRange?.start.toISOString();
    const endDate = dateRange?.end.toISOString();

    try {
      let query = supabase
        .from("course_enrollments")
        .select("*")
        .eq("user_id", user.id);
      
      // Filter by academic year date range
      if (startDate && endDate) {
        query = query.gte("enrolled_at", startDate).lte("enrolled_at", endDate);
      }
      
      const { data, error } = await query.order("enrolled_at", { ascending: false });

      if (error) throw error;
      setEnrollments((data || []) as CourseEnrollment[]);
    } catch (error: any) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedYear, getDateRangeForYear]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Realtime subscription
  useRealtimeData({
    table: "courses" as any,
    userId: user?.id,
    onChange: fetchEnrollments,
  });

  const callCourseAction = async (
    action: string,
    courseId: string,
    progressPercentage?: number
  ): Promise<CourseEnrollment | null> => {
    try {
      const { data, error } = await supabase.functions.invoke<CourseActionResponse>(
        "course-actions",
        {
          body: { action, courseId, progressPercentage },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        // Handle rate limit
        if (data.error === "Rate Limit Exceeded") {
          const retryMinutes = Math.ceil((data.retryAfter || 3600) / 60);
          toast({
            title: "Too many requests",
            description: `Please wait ${retryMinutes} minutes before trying again.`,
            variant: "destructive",
          });
          return null;
        }

        throw new Error(data.message || "Action failed");
      }

      return data?.data || null;
    } catch (error: any) {
      console.error(`Course action ${action} failed:`, error);
      throw error;
    }
  };

  const enrollInCourse = async (courseId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to enroll in courses",
        variant: "destructive",
      });
      return null;
    }

    try {
      const result = await callCourseAction("enroll", courseId);

      if (result) {
        setEnrollments((prev) => [result, ...prev]);
        toast({
          title: "Enrolled successfully!",
          description: "You have been enrolled in this course",
        });
      }

      return result;
    } catch (error: any) {
      if (error.message?.includes("already enrolled")) {
        toast({
          title: "Already enrolled",
          description: "You are already enrolled in this course",
        });
      } else {
        toast({
          title: "Enrollment failed",
          description: getUserFriendlyError(error, "general"),
          variant: "destructive",
        });
      }
      return null;
    }
  };

  const startCourse = async (courseId: string) => {
    if (!user) return null;

    try {
      const result = await callCourseAction("start", courseId);

      if (result) {
        setEnrollments((prev) =>
          prev.some((e) => e.course_id === courseId)
            ? prev.map((e) => (e.course_id === courseId ? result : e))
            : [result, ...prev]
        );

        toast({
          title: "Course started!",
          description: "Good luck with your learning journey",
        });
      }

      return result;
    } catch (error: any) {
      toast({
        title: "Failed to start course",
        description: getUserFriendlyError(error, "general"),
        variant: "destructive",
      });
      return null;
    }
  };

  const completeCourse = async (courseId: string) => {
    if (!user) return null;

    try {
      const result = await callCourseAction("complete", courseId);

      if (result) {
        setEnrollments((prev) =>
          prev.map((e) => (e.course_id === courseId ? result : e))
        );

        toast({
          title: "🎉 Course completed!",
          description: "Congratulations! Your skill points have been updated.",
        });
      }

      return result;
    } catch (error: any) {
      toast({
        title: "Failed to complete course",
        description: getUserFriendlyError(error, "general"),
        variant: "destructive",
      });
      return null;
    }
  };

  const updateProgress = async (courseId: string, percentage: number) => {
    if (!user) return null;

    try {
      const result = await callCourseAction("progress", courseId, percentage);

      if (result) {
        setEnrollments((prev) =>
          prev.map((e) => (e.course_id === courseId ? result : e))
        );

        if (percentage >= 100) {
          toast({
            title: "🎉 Course completed!",
            description: "Congratulations! Your skill points have been updated.",
          });
        }
      }

      return result;
    } catch (error: any) {
      console.error("Failed to update progress:", error);
      return null;
    }
  };

  const getEnrollment = (courseId: string) => {
    return enrollments.find((e) => e.course_id === courseId);
  };

  const isEnrolled = (courseId: string) => {
    return enrollments.some((e) => e.course_id === courseId);
  };

  const isCompleted = (courseId: string) => {
    const enrollment = getEnrollment(courseId);
    return enrollment?.status === "completed";
  };

  const getCompletedCount = () => {
    return enrollments.filter((e) => e.status === "completed").length;
  };

  const getInProgressCount = () => {
    return enrollments.filter((e) => e.status === "in_progress").length;
  };

  return {
    enrollments,
    loading,
    enrollInCourse,
    startCourse,
    completeCourse,
    updateProgress,
    getEnrollment,
    isEnrolled,
    isCompleted,
    getCompletedCount,
    getInProgressCount,
    refetch: fetchEnrollments,
  };
};
