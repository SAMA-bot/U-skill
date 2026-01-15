import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Calendar,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
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

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      generateNotifications();
    }
  }, [user]);

  const generateNotifications = async () => {
    if (!user) return;

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
              message: `Congratulations! You've reached your ${goal.category} target of ${goal.target_score}.`,
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
              message: `Your ${goal.category} goal deadline is in ${daysUntilDeadline} day${daysUntilDeadline !== 1 ? "s" : ""}. Current progress: ${Math.round(progress)}%`,
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
              message: `Your ${goal.category} goal is ${Math.abs(daysUntilDeadline)} day${Math.abs(daysUntilDeadline) !== 1 ? "s" : ""} overdue. Consider updating the deadline.`,
              severity: "error",
              timestamp: now,
              read: false,
              data: { goalId: goal.id },
            });
          }
          // Goal at risk (less than 50% progress with less than 50% time remaining)
          else if (progress < 50 && daysUntilDeadline > 0 && daysUntilDeadline <= 14) {
            newNotifications.push({
              id: `risk_${goal.id}`,
              type: "goal_at_risk",
              title: "Goal At Risk",
              message: `Your ${goal.category} goal may be at risk. You're at ${Math.round(progress)}% with ${daysUntilDeadline} days remaining.`,
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
          const threshold = 5; // Significant change threshold

          if (Math.abs(change) >= threshold) {
            newNotifications.push({
              id: `score_change_${category}_${Date.now()}`,
              type: "performance_change",
              title: `${category} Score ${change > 0 ? "Increased" : "Decreased"}`,
              message: `Your ${category.toLowerCase()} score ${change > 0 ? "increased" : "decreased"} by ${Math.abs(change)} points (${previousScore} → ${latestScore}).`,
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

      // Sort notifications by severity and timestamp
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
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const getIcon = (type: Notification["type"], severity: Notification["severity"]) => {
    switch (type) {
      case "goal_achieved":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "goal_deadline":
        return <Calendar className="h-5 w-5 text-amber-500" />;
      case "goal_at_risk":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "performance_change":
        return severity === "success" ? (
          <TrendingUp className="h-5 w-5 text-green-500" />
        ) : (
          <TrendingDown className="h-5 w-5 text-red-500" />
        );
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getSeverityStyles = (severity: Notification["severity"]) => {
    switch (severity) {
      case "success":
        return "border-l-green-500 bg-green-50 dark:bg-green-900/10";
      case "warning":
        return "border-l-amber-500 bg-amber-50 dark:bg-amber-900/10";
      case "error":
        return "border-l-red-500 bg-red-50 dark:bg-red-900/10";
      default:
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-900/10";
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Goal deadlines and performance updates
            </CardDescription>
          </div>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotifications([])}
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-foreground mb-1">All Caught Up!</h4>
            <p className="text-sm text-muted-foreground">
              You have no new notifications at this time.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <AnimatePresence>
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    relative p-4 mb-3 rounded-lg border-l-4 transition-all
                    ${getSeverityStyles(notification.severity)}
                    ${notification.read ? "opacity-60" : ""}
                  `}
                  onClick={() => markAsRead(notification.id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(notification.id);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type, notification.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground text-sm">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Just now
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationCenter;
