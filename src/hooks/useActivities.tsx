import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

export type ActivityType = 
  | "teaching" 
  | "research" 
  | "workshop" 
  | "conference" 
  | "publication" 
  | "mentoring" 
  | "technology" 
  | "service";

export type ActivityStatus = "pending" | "in_progress" | "completed";

export interface Activity {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  activity_type: ActivityType | null;
  status: ActivityStatus | null;
  created_at: string;
  completed_at: string | null;
}

export interface CreateActivityData {
  title: string;
  description?: string;
  activity_type: ActivityType;
}

export interface UpdateActivityData {
  title?: string;
  description?: string;
  activity_type?: ActivityType;
  status?: ActivityStatus;
}

export const ACTIVITY_TYPES: { value: ActivityType; label: string; description: string }[] = [
  { value: "teaching", label: "Teaching", description: "Lectures, course development, student mentoring" },
  { value: "research", label: "Research", description: "Research projects, experiments, data analysis" },
  { value: "publication", label: "Publication", description: "Papers, articles, book chapters" },
  { value: "conference", label: "Conference", description: "Presentations, panels, networking" },
  { value: "workshop", label: "Workshop", description: "Training sessions, skill development" },
  { value: "mentoring", label: "Mentoring", description: "Student guidance, peer mentoring" },
  { value: "technology", label: "Technology", description: "Tech adoption, digital tools, innovation" },
  { value: "service", label: "Service", description: "Committee work, community service" },
];

export function useActivities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedYear, getDateRangeForYear } = useAcademicYear();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    if (!user) return;

    // Get date range for selected academic year
    const dateRange = getDateRangeForYear(selectedYear);
    const startDate = dateRange?.start.toISOString();
    const endDate = dateRange?.end.toISOString();

    try {
      let query = supabase
        .from("activities")
        .select("*")
        .eq("user_id", user.id);
      
      // Filter by academic year date range
      if (startDate && endDate) {
        query = query.gte("created_at", startDate).lte("created_at", endDate);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setActivities(data as Activity[]);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedYear, getDateRangeForYear]);

  // Subscribe to realtime changes
  useRealtimeData({
    table: "activities",
    userId: user?.id,
    onChange: fetchActivities,
  });

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const createActivity = async (data: CreateActivityData): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase.from("activities").insert({
        user_id: user.id,
        title: data.title,
        description: data.description || null,
        activity_type: data.activity_type,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Activity Created",
        description: "Your activity has been logged successfully.",
      });

      return true;
    } catch (error) {
      console.error("Error creating activity:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create activity. Please try again.",
      });
      return false;
    }
  };

  const updateActivity = async (id: string, data: UpdateActivityData): Promise<boolean> => {
    if (!user) return false;

    try {
      const updateData: any = { ...data };
      
      // If marking as completed, set completed_at
      if (data.status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("activities")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Activity Updated",
        description: data.status === "completed" 
          ? "Congratulations! Activity completed and your skills have been updated." 
          : "Activity updated successfully.",
      });

      return true;
    } catch (error) {
      console.error("Error updating activity:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update activity. Please try again.",
      });
      return false;
    }
  };

  const deleteActivity = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("activities")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Activity Deleted",
        description: "Activity has been removed.",
      });

      return true;
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete activity. Please try again.",
      });
      return false;
    }
  };

  const completeActivity = async (id: string): Promise<boolean> => {
    return updateActivity(id, { status: "completed" });
  };

  const startActivity = async (id: string): Promise<boolean> => {
    return updateActivity(id, { status: "in_progress" });
  };

  // Stats calculations
  const stats = {
    total: activities.length,
    completed: activities.filter(a => a.status === "completed").length,
    inProgress: activities.filter(a => a.status === "in_progress").length,
    pending: activities.filter(a => a.status === "pending").length,
  };

  return {
    activities,
    loading,
    stats,
    createActivity,
    updateActivity,
    deleteActivity,
    completeActivity,
    startActivity,
    refetch: fetchActivities,
  };
}
