import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useRealtimeData } from "@/hooks/useRealtimeData";

export type NotificationType =
  | "goal_deadline"
  | "performance_change"
  | "goal_achieved"
  | "goal_at_risk"
  | "course_enrolled"
  | "course_completed"
  | "course_started"
  | "achievement_earned"
  | "document_approved"
  | "document_rejected"
  | "document_pending"
  | "training_reminder"
  | "activity_event"
  | "system";

export type NotificationCategory = "alert" | "course" | "achievement" | "document" | "activity";

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
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

const defaultContext: NotificationsContextType = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  markAsRead: () => {},
  markAllAsRead: () => {},
  dismissNotification: () => {},
  clearAll: () => {},
  refreshNotifications: () => {},
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  return context ?? defaultContext;
};
// Group notifications of the same type that occur on the same day
const groupSimilarNotifications = (items: Notification[]): Notification[] => {
  const groupKeys: Record<string, Notification[]> = {};

  items.forEach((n) => {
    const dayKey = n.timestamp.toISOString().slice(0, 10);
    const key = `${n.type}_${n.category}_${dayKey}`;

    if (!groupKeys[key]) {
      groupKeys[key] = [];
    }
    groupKeys[key].push(n);
  });

  const result: Notification[] = [];

  Object.values(groupKeys).forEach((group) => {
    if (group.length <= 1) {
      result.push(...group);
      return;
    }

    const latest = group.reduce((a, b) =>
      a.timestamp.getTime() > b.timestamp.getTime() ? a : b
    );

    const typeLabels: Record<string, string> = {
      course_completed: "course",
      course_started: "course",
      course_enrolled: "course",
      goal_achieved: "goal",
      goal_deadline: "goal deadline",
      goal_at_risk: "goal alert",
      achievement_earned: "badge",
      performance_change: "score change",
      document_approved: "document approval",
      document_rejected: "document rejection",
      training_reminder: "training reminder",
    };

    const label = typeLabels[latest.type] || "notification";
    const count = group.length;

    const titleMap: Record<string, string> = {
      course_completed: `${count} Courses Completed 🎓`,
      course_started: `${count} Courses In Progress`,
      course_enrolled: `${count} New Courses Enrolled`,
      goal_achieved: `${count} Goals Achieved! 🎉`,
      goal_deadline: `${count} Goal Deadlines Approaching`,
      goal_at_risk: `${count} Goals At Risk`,
      achievement_earned: `${count} Badges Earned 🏆`,
      performance_change: `${count} Score Changes`,
      document_approved: `${count} Documents Approved`,
      document_rejected: `${count} Documents Rejected`,
      training_reminder: `${count} Upcoming Trainings`,
    };

    result.push({
      id: `grouped_${latest.type}_${latest.timestamp.getTime()}`,
      type: latest.type,
      category: latest.category,
      title: titleMap[latest.type] || `${count} ${label}s`,
      message: `You have ${count} ${label}${count !== 1 ? "s" : ""} today.`,
      severity: latest.severity,
      timestamp: latest.timestamp,
      read: group.every((n) => n.read),
      data: { grouped: true, count, items: group.map((n) => n.data) },
    });
  });

  return result;
};

// Role-specific audit log action types for notification integration
const ADMIN_AUDIT_ACTIONS = [
  "USER_CREATED", "ROLE_ASSIGNED", "ROLE_CHANGED", "ROLE_REMOVED",
  "COURSE_CREATED", "COURSE_PUBLISHED", "COURSE_UNPUBLISHED", "COURSE_UPDATED", "COURSE_DELETED",
];
const FACULTY_AUDIT_ACTIONS = [
  "COURSE_COMPLETED", "COURSE_ENROLLED", "DOCUMENT_UPLOADED", "DOCUMENT_APPROVED", "DOCUMENT_REJECTED",
];
const HOD_AUDIT_ACTIONS = [
  "DOCUMENT_APPROVED", "DOCUMENT_REJECTED", "COURSE_COMPLETED",
];

const getAuditActionsForRole = (role: string | null): string[] => {
  switch (role) {
    case "admin": return ADMIN_AUDIT_ACTIONS;
    case "hod": return HOD_AUDIT_ACTIONS;
    default: return FACULTY_AUDIT_ACTIONS;
  }
};

const auditActionToNotification = (
  actionType: string,
  metadata: Record<string, any>
): { title: string; message: string; severity: "info" | "warning" | "success" | "error"; category: NotificationCategory } => {
  const m = metadata || {};
  switch (actionType) {
    case "COURSE_COMPLETED":
      return { title: "Course Completed", message: `Completed: ${m.course_title || "a course"}`, severity: "success", category: "course" };
    case "COURSE_CREATED":
      return { title: "Course Created", message: `New course: ${m.title || "Unknown"}`, severity: "info", category: "activity" };
    case "COURSE_PUBLISHED":
      return { title: "Course Published", message: `Published: ${m.title || "Unknown"}`, severity: "success", category: "activity" };
    case "COURSE_DELETED":
      return { title: "Course Deleted", message: `Deleted: ${m.title || "Unknown"}`, severity: "warning", category: "activity" };
    case "USER_CREATED":
      return { title: "New User Registered", message: `${m.full_name || m.email || "A user"} joined`, severity: "info", category: "activity" };
    case "ROLE_ASSIGNED":
      return { title: "Role Assigned", message: `${m.user_name || "User"} assigned as ${m.role}`, severity: "info", category: "activity" };
    case "ROLE_CHANGED":
      return { title: "Role Changed", message: `${m.user_name || "User"}: ${m.old_role} → ${m.new_role}`, severity: "warning", category: "activity" };
    case "ROLE_REMOVED":
      return { title: "Role Removed", message: `Role removed for ${m.user_name || "a user"}`, severity: "error", category: "activity" };
    case "DOCUMENT_APPROVED":
      return { title: "Document Approved", message: `Document approved`, severity: "success", category: "document" };
    case "DOCUMENT_REJECTED":
      return { title: "Document Rejected", message: `Document rejected`, severity: "error", category: "document" };
    case "DOCUMENT_UPLOADED":
      return { title: "Document Uploaded", message: `New document uploaded`, severity: "info", category: "document" };
    default:
      return { title: actionType.replace(/_/g, " "), message: "Activity recorded", severity: "info", category: "activity" };
  }
};

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { role } = useUserRole();

  const generateNotifications = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const newNotifications: Notification[] = [];

    try {
      // === GOAL NOTIFICATIONS ===
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

          if (progress >= 100) {
            newNotifications.push({
              id: `achieved_${goal.id}`,
              type: "goal_achieved",
              category: "alert",
              title: "Goal Achieved! 🎉",
              message: `You've reached your ${goal.category} target of ${goal.target_score}.`,
              severity: "success",
              timestamp: now,
              read: false,
              data: { goalId: goal.id },
            });
          } else if (daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
            newNotifications.push({
              id: `deadline_${goal.id}`,
              type: "goal_deadline",
              category: "alert",
              title: "Goal Deadline Approaching",
              message: `${goal.category} goal deadline in ${daysUntilDeadline} day${daysUntilDeadline !== 1 ? "s" : ""}.`,
              severity: daysUntilDeadline <= 3 ? "warning" : "info",
              timestamp: now,
              read: false,
              data: { goalId: goal.id, daysLeft: daysUntilDeadline },
            });
          } else if (daysUntilDeadline < 0 && progress < 100) {
            newNotifications.push({
              id: `overdue_${goal.id}`,
              type: "goal_at_risk",
              category: "alert",
              title: "Goal Overdue",
              message: `${goal.category} goal is ${Math.abs(daysUntilDeadline)} day${Math.abs(daysUntilDeadline) !== 1 ? "s" : ""} overdue.`,
              severity: "error",
              timestamp: now,
              read: false,
              data: { goalId: goal.id },
            });
          } else if (progress < 50 && daysUntilDeadline > 0 && daysUntilDeadline <= 14) {
            newNotifications.push({
              id: `risk_${goal.id}`,
              type: "goal_at_risk",
              category: "alert",
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

      // === PERFORMANCE SCORE CHANGES ===
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
              category: "alert",
              title: `${category} Score ${change > 0 ? "Improved" : "Declined"}`,
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

      // === COURSE ENROLLMENT NOTIFICATIONS ===
      const { data: enrollments } = await supabase
        .from("course_enrollments")
        .select("id, status, enrolled_at, completed_at, course_id, courses(title)")
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false })
        .limit(10);

      if (enrollments) {
        const now = new Date();
        enrollments.forEach((enrollment) => {
          const courseTitle = (enrollment.courses as any)?.title || "a course";
          const enrolledAt = new Date(enrollment.enrolled_at);
          const daysSinceEnroll = Math.floor((now.getTime() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24));

          if (enrollment.status === "completed" && enrollment.completed_at) {
            const completedAt = new Date(enrollment.completed_at);
            const daysSinceComplete = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceComplete <= 7) {
              newNotifications.push({
                id: `course_completed_${enrollment.id}`,
                type: "course_completed",
                category: "course",
                title: "Course Completed! 🎓",
                message: `You completed "${courseTitle}". Great work!`,
                severity: "success",
                timestamp: completedAt,
                read: daysSinceComplete > 1,
                data: { courseId: enrollment.course_id },
              });
            }
          } else if (enrollment.status === "in_progress" && daysSinceEnroll <= 3) {
            newNotifications.push({
              id: `course_started_${enrollment.id}`,
              type: "course_started",
              category: "course",
              title: "Course In Progress",
              message: `You started "${courseTitle}". Keep going!`,
              severity: "info",
              timestamp: enrolledAt,
              read: daysSinceEnroll > 0,
              data: { courseId: enrollment.course_id },
            });
          } else if (enrollment.status === "enrolled" && daysSinceEnroll <= 3) {
            newNotifications.push({
              id: `course_enrolled_${enrollment.id}`,
              type: "course_enrolled",
              category: "course",
              title: "New Course Enrolled",
              message: `You enrolled in "${courseTitle}". Ready to start?`,
              severity: "info",
              timestamp: enrolledAt,
              read: daysSinceEnroll > 0,
              data: { courseId: enrollment.course_id },
            });
          }
        });
      }

      // === ACHIEVEMENT BADGES ===
      const { data: badges } = await supabase
        .from("achievement_badges")
        .select("id, badge_name, description, earned_at")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false })
        .limit(5);

      if (badges) {
        const now = new Date();
        badges.forEach((badge) => {
          const earnedAt = new Date(badge.earned_at);
          const daysSinceEarned = Math.floor((now.getTime() - earnedAt.getTime()) / (1000 * 60 * 60 * 24));

          if (daysSinceEarned <= 14) {
            newNotifications.push({
              id: `badge_${badge.id}`,
              type: "achievement_earned",
              category: "achievement",
              title: `Badge Earned: ${badge.badge_name} 🏆`,
              message: badge.description || `You earned the "${badge.badge_name}" badge!`,
              severity: "success",
              timestamp: earnedAt,
              read: daysSinceEarned > 1,
              data: { badgeId: badge.id },
            });
          }
        });
      }

      // === DOCUMENT APPROVAL NOTIFICATIONS ===
      const { data: documents } = await supabase
        .from("faculty_documents")
        .select("id, title, status, reviewed_at, rejection_reason, updated_at")
        .eq("user_id", user.id)
        .in("status", ["approved", "rejected", "pending"])
        .order("updated_at", { ascending: false })
        .limit(10);

      if (documents) {
        const now = new Date();
        documents.forEach((doc) => {
          const updatedAt = new Date(doc.updated_at);
          const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

          if (doc.status === "approved" && doc.reviewed_at && daysSinceUpdate <= 14) {
            newNotifications.push({
              id: `doc_approved_${doc.id}`,
              type: "document_approved",
              category: "document",
              title: "Document Approved ✅",
              message: `Your document "${doc.title}" has been approved.`,
              severity: "success",
              timestamp: new Date(doc.reviewed_at),
              read: daysSinceUpdate > 1,
              data: { documentId: doc.id },
            });
          } else if (doc.status === "rejected" && doc.reviewed_at && daysSinceUpdate <= 14) {
            newNotifications.push({
              id: `doc_rejected_${doc.id}`,
              type: "document_rejected",
              category: "document",
              title: "Document Rejected",
              message: doc.rejection_reason
                ? `"${doc.title}" was rejected: ${doc.rejection_reason}`
                : `Your document "${doc.title}" was rejected.`,
              severity: "error",
              timestamp: new Date(doc.reviewed_at),
              read: daysSinceUpdate > 1,
              data: { documentId: doc.id },
            });
          }
        });
      }

      // === TRAINING REMINDER NOTIFICATIONS ===
      const { data: upcomingCourses } = await supabase
        .from("courses")
        .select("id, title, training_date")
        .eq("is_published", true)
        .not("training_date", "is", null);

      if (upcomingCourses) {
        const now = new Date();
        upcomingCourses.forEach((course) => {
          if (!course.training_date) return;
          const trainingDate = new Date(course.training_date);
          const daysUntil = Math.ceil((trainingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntil > 0 && daysUntil <= 7) {
            newNotifications.push({
              id: `training_reminder_${course.id}`,
              type: "training_reminder",
              category: "course",
              title: "Upcoming Training",
              message: `"${course.title}" starts in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}.`,
              severity: daysUntil <= 2 ? "warning" : "info",
              timestamp: now,
              read: false,
              data: { courseId: course.id },
            });
          }
        });
      }

      // === AUDIT LOG / ACTIVITY TIMELINE NOTIFICATIONS ===
      const auditActions = getAuditActionsForRole(role);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: auditLogs } = await supabase
        .from("audit_logs")
        .select("id, action_type, metadata, created_at")
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(20);

      if (auditLogs) {
        auditLogs.forEach((log) => {
          if (!auditActions.includes(log.action_type)) return;

          // Skip types already covered by dedicated notification sections
          const skipDuplicateTypes = ["COURSE_COMPLETED", "DOCUMENT_APPROVED", "DOCUMENT_REJECTED"];
          if (skipDuplicateTypes.includes(log.action_type)) return;

          const mapped = auditActionToNotification(log.action_type, (log.metadata as Record<string, any>) || {});
          const createdAt = new Date(log.created_at);
          const daysSince = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

          newNotifications.push({
            id: `audit_${log.id}`,
            type: "activity_event",
            category: mapped.category,
            title: mapped.title,
            message: mapped.message,
            severity: mapped.severity,
            timestamp: createdAt,
            read: daysSince > 1,
            data: { auditLogId: log.id, actionType: log.action_type },
          });
        });
      }

      // === GROUP SIMILAR NOTIFICATIONS ===
      const grouped = groupSimilarNotifications(newNotifications);

      // Sort by severity then timestamp
      const severityOrder = { error: 0, warning: 1, success: 2, info: 3 };
      grouped.sort((a, b) => {
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });

      setNotifications(grouped);
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

  // Listen for realtime changes
  useRealtimeData({
    table: "performance_metrics",
    userId: user?.id,
    onChange: () => {
      if (user) generateNotifications();
    },
  });

  useRealtimeData({
    table: "course_enrollments",
    userId: user?.id,
    onChange: () => {
      if (user) generateNotifications();
    },
  });

  useRealtimeData({
    table: "achievement_badges",
    userId: user?.id,
    onChange: () => {
      if (user) generateNotifications();
    },
  });

  useRealtimeData({
    table: "faculty_documents",
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
