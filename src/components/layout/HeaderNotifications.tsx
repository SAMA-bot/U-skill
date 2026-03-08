import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Calendar,
  X,
  Loader2,
  GraduationCap,
  BookOpen,
  Award,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications, Notification, NotificationCategory } from "@/hooks/useNotifications";
import { toast } from "sonner";

type TabKey = "all" | NotificationCategory;

const TABS: { key: TabKey; label: string; icon: typeof Bell }[] = [
  { key: "all", label: "All", icon: Bell },
  { key: "alert", label: "Alerts", icon: AlertTriangle },
  { key: "course", label: "Courses", icon: GraduationCap },
  { key: "achievement", label: "Badges", icon: Award },
];

const HeaderNotifications = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const filteredNotifications =
    activeTab === "all"
      ? notifications
      : notifications.filter((n) => n.category === activeTab);

  const getIcon = (type: Notification["type"], severity: Notification["severity"]) => {
    switch (type) {
      case "goal_achieved":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "goal_deadline":
        return <Calendar className="h-4 w-4 text-accent" />;
      case "goal_at_risk":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "performance_change":
        return severity === "success" ? (
          <TrendingUp className="h-4 w-4 text-success" />
        ) : (
          <TrendingDown className="h-4 w-4 text-destructive" />
        );
      case "course_completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "course_started":
        return <PlayCircle className="h-4 w-4 text-primary" />;
      case "course_enrolled":
        return <BookOpen className="h-4 w-4 text-info" />;
      case "achievement_earned":
        return <Award className="h-4 w-4 text-accent" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityStyles = (severity: Notification["severity"]) => {
    switch (severity) {
      case "success":
        return "border-l-success/70 bg-success/5";
      case "warning":
        return "border-l-accent/70 bg-accent/5";
      case "error":
        return "border-l-destructive/70 bg-destructive/5";
      default:
        return "border-l-info/70 bg-info/5";
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative bg-muted p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 focus:outline-none transition-colors">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold rounded-full shadow-sm"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 border-border/60 shadow-lg" align="end" sideOffset={8}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground text-base">Notifications</h4>
              {unreadCount > 0 && (
                <Badge className="bg-primary/15 text-primary border-primary/25 text-[10px] px-1.5 h-5">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={markAllAsRead}>
                  Mark all read
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={clearAll}>
                  Clear
                </Button>
              </div>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const count =
                tab.key === "all"
                  ? notifications.length
                  : notifications.filter((n) => n.category === tab.key).length;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
                    ${isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
                    }
                  `}
                >
                  <tab.icon className="h-3 w-3" />
                  {tab.label}
                  <span className={`
                    inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold
                    ${isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                    }
                  `}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <p className="font-medium text-foreground text-sm">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeTab === "all"
                ? "No new notifications"
                : `No ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} notifications`}
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[380px]">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.slice(0, 15).map((notification, index) => (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
                  transition={{ delay: index * 0.025 }}
                  className={`
                    group flex items-start gap-3 px-4 py-3 border-b border-border/40 cursor-pointer transition-all hover:bg-muted/40
                    ${notification.read ? "opacity-50" : "bg-primary/[0.03]"}
                  `}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg ${notification.read ? "bg-muted/40" : "bg-muted/80"}`}>
                    {getIcon(notification.type, notification.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate ${notification.read ? "font-normal text-muted-foreground" : "font-semibold text-foreground"}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className={`text-xs line-clamp-2 mt-0.5 ${notification.read ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      {formatTimestamp(notification.timestamp)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(notification.id);
                    }}
                    className="flex-shrink-0 p-1 rounded-full hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredNotifications.length > 15 && (
              <div className="p-3 text-center border-t border-border/40">
                <p className="text-xs text-muted-foreground">
                  +{filteredNotifications.length - 15} more notifications
                </p>
              </div>
            )}
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default HeaderNotifications;
