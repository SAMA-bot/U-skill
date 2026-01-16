import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeData } from "@/hooks/useRealtimeData";

export interface Notification {
  id: string;
  type: "goal_deadline" | "performance_change" | "goal_achieved" | "goal_at_risk";
  title: string;
  message: string;
  severity: "info" | "warning" | "success" | "error";
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface PerformanceGoal {
  id: string;
  category: "teaching" | "research" | "service";
  target_score: number;
  current_score: number;
  deadline: string;
  notes: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
  refreshNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
};

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const generateNotifications = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const newNotifications: Notification[] = [];

    try {
      // Check goal deadlines
      const storedGoals = localStorage.getItem(`goals_${user.id}`);
      if (storedGoals) {
        const goals: PerformanceGoal[] = JSON.parse(storedGoals);
        const now = new Date();

        goals.forEach((goal) => {
          const deadline = new Date(goal.deadline);
          const daysUntilDeadline = Math.ceil(
            (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          const progress = (goal.current_score / goal.target_score) * 100;

          // Goal achieved
          if (progress >= 100) {
            newNotifications.push({
              id: `achieved_${goal.id}`,
              type: "goal_achieved",
              title: "Goal Achieved! 🎉",
              message: `You've reached your ${goal.category} target of ${goal.target_score}.`,
              severity: "success",
              timestamp: now,
              read: false,
              data: { goalId: goal.id },
            });
          }
          // Deadline approaching (within 7 days)
          else if (daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
            newNotifications.push({
              id: `deadline_${goal.id}`,
              type: "goal_deadline",
              title: "Goal Deadline Approaching",
              message: `${goal.category} goal deadline in ${daysUntilDeadline} day${daysUntilDeadline !== 1 ? "s" : ""}.`,
              severity: daysUntilDeadline <= 3 ? "warning" : "info",
              timestamp: now,
              read: false,
              data: { goalId: goal.id, daysLeft: daysUntilDeadline },
            });
          }
          // Goal overdue
          else if (daysUntilDeadline < 0 && progress < 100) {
            newNotifications.push({
              id: `overdue_${goal.id}`,
              type: "goal_at_risk",
              title: "Goal Overdue",
              message: `${goal.category} goal is ${Math.abs(daysUntilDeadline)} day${Math.abs(daysUntilDeadline) !== 1 ? "s" : ""} overdue.`,
              severity: "error",
              timestamp: now,
              read: false,
              data: { goalId: goal.id },
            });
          }
          // Goal at risk
          else if (progress < 50 && daysUntilDeadline > 0 && daysUntilDeadline <= 14) {
            newNotifications.push({
              id: `risk_${goal.id}`,
              type: "goal_at_risk",
              title: "Goal At Risk",
              message: `${goal.category} goal at ${Math.round(progress)}% with ${daysUntilDeadline} days left.`,
              severity: "warning",
              timestamp: now,
              read: false,
              data: { goalId: goal.id },
            });
          }
        });
      }

      // Check for performance score changes
      const { data: metricsData } = await supabase
        .from("performance_metrics")
        .select("*")
        .eq("user_id", user.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(2);

      if (metricsData && metricsData.length >= 2) {
        const latest = metricsData[0];
        const previous = metricsData[1];

        const checkScoreChange = (
          category: string,
          latestScore: number,
          previousScore: number
        ) => {
          const change = latestScore - previousScore;
          const threshold = 5;

          if (Math.abs(change) >= threshold) {
            newNotifications.push({
              id: `score_change_${category}_${Date.now()}`,
              type: "performance_change",
              title: `${category} Score ${change > 0 ? "Up" : "Down"}`,
              message: `${change > 0 ? "+" : ""}${change} points (${previousScore} → ${latestScore})`,
              severity: change > 0 ? "success" : "warning",
              timestamp: new Date(),
              read: false,
              data: { category, change, latest: latestScore, previous: previousScore },
            });
          }
        };

        checkScoreChange("Teaching", latest.teaching_score || 0, previous.teaching_score || 0);
        checkScoreChange("Research", latest.research_score || 0, previous.research_score || 0);
        checkScoreChange("Service", latest.service_score || 0, previous.service_score || 0);
      }

      // Sort by severity and timestamp
      const severityOrder = { error: 0, warning: 1, success: 2, info: 3 };
      newNotifications.sort((a, b) => {
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });

      setNotifications(newNotifications);
    } catch (error) {
      console.error("Error generating notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      generateNotifications();
    }
  }, [user, generateNotifications]);

  // Listen for realtime performance changes
  useRealtimeData({
    table: "performance_metrics",
    userId: user?.id,
    onChange: () => {
      if (user) generateNotifications();
    },
  });

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        clearAll,
        refreshNotifications: generateNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};
