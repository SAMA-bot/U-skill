import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeData } from "@/hooks/useRealtimeData";

type EnrollmentStatus = "enrolled" | "in_progress" | "completed";

interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  status: string;
  progress_percentage: number;
}

export const useCourseEnrollments = () => {
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedYear, getDateRangeForYear } = useAcademicYear();

  const fetchEnrollments = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch ALL enrollments (no date filter) so enrollment status checks work correctly
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("*")
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false });

      if (error) throw error;
      setEnrollments((data || []) as CourseEnrollment[]);
    } catch (error: any) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Realtime subscription for enrollment changes
  useRealtimeData({
    table: "course_enrollments" as any,
    userId: user?.id,
    onChange: fetchEnrollments,
  });

  const enrollInCourse = async (courseId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to enroll in courses.",
        variant: "destructive",
      });
      return null;
    }

    // Check locally first for duplicate
    const existing = enrollments.find((e) => e.course_id === courseId);
    if (existing) {
      toast({
        title: "Already enrolled",
        description: "You are already enrolled in this course.",
      });
      return existing;
    }

    try {
      // Double-check in DB to prevent race conditions
      const { data: dbExisting } = await supabase
        .from("course_enrollments")
        .select("id, course_id, user_id, enrolled_at, completed_at, status, progress_percentage")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();

      if (dbExisting) {
        // Already exists in DB — sync local state
        setEnrollments((prev) =>
          prev.some((e) => e.course_id === courseId) ? prev : [dbExisting as CourseEnrollment, ...prev]
        );
        toast({
          title: "Already enrolled",
          description: "You are already enrolled in this course.",
        });
        return dbExisting as CourseEnrollment;
      }

      const { data, error } = await supabase
        .from("course_enrollments")
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: "enrolled",
          progress_percentage: 0,
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation (duplicate)
        if (error.code === "23505") {
          toast({
            title: "Already enrolled",
            description: "You are already enrolled in this course.",
          });
          return null;
        }
        throw error;
      }

      const enrollment = data as CourseEnrollment;
      setEnrollments((prev) => [enrollment, ...prev]);
      toast({
        title: "✅ Successfully enrolled!",
        description: "This course has been added to your My Learning tab.",
      });
      return enrollment;
    } catch (error: any) {
      console.error("Enrollment failed:", error);
      toast({
        title: "Enrollment failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const startCourse = async (courseId: string) => {
    if (!user) return null;

    try {
      const existing = enrollments.find((e) => e.course_id === courseId);

      if (!existing) {
        // Auto-enroll and start
        const { data, error } = await supabase
          .from("course_enrollments")
          .insert({
            user_id: user.id,
            course_id: courseId,
            status: "in_progress",
            progress_percentage: 10,
          })
          .select()
          .single();

        if (error) throw error;
        const enrollment = data as CourseEnrollment;
        setEnrollments((prev) => [enrollment, ...prev]);
        toast({
          title: "🚀 Course started!",
          description: "Good luck with your learning journey.",
        });
        return enrollment;
      }

      const { data, error } = await supabase
        .from("course_enrollments")
        .update({
          status: "in_progress",
          progress_percentage: Math.max(existing.progress_percentage || 0, 10),
        })
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .select()
        .single();

      if (error) throw error;
      const enrollment = data as CourseEnrollment;
      setEnrollments((prev) =>
        prev.map((e) => (e.course_id === courseId ? enrollment : e))
      );
      toast({
        title: "🚀 Course started!",
        description: "Good luck with your learning journey.",
      });
      return enrollment;
    } catch (error: any) {
      console.error("Failed to start course:", error);
      toast({
        title: "Failed to start course",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const completeCourse = async (courseId: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("course_enrollments")
        .update({
          status: "completed",
          progress_percentage: 100,
          completed_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Not enrolled",
          description: "You need to enroll in this course first.",
          variant: "destructive",
        });
        return null;
      }

      const enrollment = data as CourseEnrollment;
      setEnrollments((prev) =>
        prev.map((e) => (e.course_id === courseId ? enrollment : e))
      );
      toast({
        title: "🎉 Training Completed!",
        description: "Congratulations! Your skill points and capacity score have been updated.",
      });
      return enrollment;
    } catch (error: any) {
      console.error("Failed to complete course:", error);
      toast({
        title: "Failed to complete course",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateProgress = async (courseId: string, percentage: number) => {
    if (!user) return null;

    try {
      const safePercentage = Math.min(100, Math.max(0, percentage));
      const isComplete = safePercentage >= 100;

      const { data, error } = await supabase
        .from("course_enrollments")
        .update({
          progress_percentage: safePercentage,
          status: isComplete ? "completed" : "in_progress",
          completed_at: isComplete ? new Date().toISOString() : null,
        })
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .select()
        .single();

      if (error) throw error;

      const enrollment = data as CourseEnrollment;
      setEnrollments((prev) =>
        prev.map((e) => (e.course_id === courseId ? enrollment : e))
      );

      if (isComplete) {
        toast({
          title: "🎉 Course completed!",
          description: "Congratulations! Your skill points have been updated.",
        });
      }
      return enrollment;
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
