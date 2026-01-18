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
  status: EnrollmentStatus;
  progress_percentage: number;
}

export const useCourseEnrollments = () => {
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchEnrollments = useCallback(async () => {
    if (!user) return;

    try {
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

  // Realtime subscription
  useRealtimeData({
    table: "courses" as any, // Using courses as proxy since course_enrollments isn't in TableName type yet
    userId: user?.id,
    onChange: fetchEnrollments,
  });

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
      const { data, error } = await supabase
        .from("course_enrollments")
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: "enrolled",
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already enrolled",
            description: "You are already enrolled in this course",
          });
          return null;
        }
        throw error;
      }

      setEnrollments((prev) => [data as CourseEnrollment, ...prev]);
      toast({
        title: "Enrolled successfully!",
        description: "You have been enrolled in this course",
      });

      return data as CourseEnrollment;
    } catch (error: any) {
      toast({
        title: "Enrollment failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const startCourse = async (courseId: string) => {
    if (!user) return null;

    const enrollment = enrollments.find((e) => e.course_id === courseId);
    if (!enrollment) {
      // Enroll first if not enrolled
      const newEnrollment = await enrollInCourse(courseId);
      if (!newEnrollment) return null;
    }

    try {
      const { data, error } = await supabase
        .from("course_enrollments")
        .update({
          status: "in_progress",
          progress_percentage: 10,
        })
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .select()
        .single();

      if (error) throw error;

      setEnrollments((prev) =>
        prev.map((e) => (e.course_id === courseId ? (data as CourseEnrollment) : e))
      );

      toast({
        title: "Course started!",
        description: "Good luck with your learning journey",
      });

      return data as CourseEnrollment;
    } catch (error: any) {
      toast({
        title: "Failed to start course",
        description: error.message,
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

      setEnrollments((prev) =>
        prev.map((e) => (e.course_id === courseId ? (data as CourseEnrollment) : e))
      );

      toast({
        title: "🎉 Course completed!",
        description: "Congratulations! Your skill points have been updated.",
      });

      return data as CourseEnrollment;
    } catch (error: any) {
      toast({
        title: "Failed to complete course",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateProgress = async (courseId: string, percentage: number) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("course_enrollments")
        .update({
          progress_percentage: Math.min(100, Math.max(0, percentage)),
          status: percentage >= 100 ? "completed" : "in_progress",
          completed_at: percentage >= 100 ? new Date().toISOString() : null,
        })
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .select()
        .single();

      if (error) throw error;

      setEnrollments((prev) =>
        prev.map((e) => (e.course_id === courseId ? (data as CourseEnrollment) : e))
      );

      if (percentage >= 100) {
        toast({
          title: "🎉 Course completed!",
          description: "Congratulations! Your skill points have been updated.",
        });
      }

      return data as CourseEnrollment;
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
