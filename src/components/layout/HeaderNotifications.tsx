import { useState } from "react";
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
  FileText,
  FileX,
  FileCheck,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications, Notification, NotificationCategory } from "@/hooks/useNotifications";
import { toast } from "sonner";

type TabKey = "all" | NotificationCategory;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "alert", label: "Alerts" },
  { key: "course", label: "Courses" },
  { key: "achievement", label: "Badges" },
  { key: "document", label: "Docs" },
];

const getIcon = (type: Notification["type"], severity: Notification["severity"]) => {
  const cls = "h-3.5 w-3.5";
  switch (type) {
    case "goal_achieved":
      return <CheckCircle2 className={`${cls} text-success`} />;
    case "goal_deadline":
      return <Calendar className={`${cls} text-accent`} />;
    case "goal_at_risk":
      return <AlertTriangle className={`${cls} text-destructive`} />;
    case "performance_change":
      return severity === "success"
        ? <TrendingUp className={`${cls} text-success`} />
        : <TrendingDown className={`${cls} text-destructive`} />;
    case "course_completed":
      return <CheckCircle2 className={`${cls} text-success`} />;
    case "course_started":
      return <PlayCircle className={`${cls} text-primary`} />;
    case "course_enrolled":
      return <BookOpen className={`${cls} text-primary`} />;
    case "achievement_earned":
      return <Award className={`${cls} text-accent`} />;
    case "document_approved":
      return <FileCheck className={`${cls} text-success`} />;
    case "document_rejected":
      return <FileX className={`${cls} text-destructive`} />;
    default:
      return <Bell className={`${cls} text-muted-foreground`} />;
  }
};

const stripEmojis = (text: string) =>
  text.replace(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{2B55}\u{FE00}-\u{FEFF}\u{1FA00}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}✅❌]/gu, "").trim();

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

  const getTabCount = (key: TabKey) =>
    key === "all"
      ? notifications.length
      : notifications.filter((n) => n.category === key).length;

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
                className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[360px] max-w-[calc(100vw-1rem)] p-0 rounded-xl border-border/50 shadow-xl overflow-hidden"
        align="end"
        sideOffset={8}
      >
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Header */}
          <div className="px-4 pt-3 pb-2 border-b border-border/40">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-foreground text-sm">Notifications</h4>
              {notifications.length > 0 && (
                <div className="flex gap-1">
                  {unreadCount > 0 && (
                    <button
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded"
                      onClick={() => {
                        markAllAsRead();
                        toast.success("All marked as read");
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5 rounded"
                    onClick={() => {
                      clearAll();
                      toast("Cleared");
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-0.5 overflow-x-auto no-scrollbar">
              {TABS.map((tab) => {
                const count = getTabCount(tab.key);
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`
                      flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all
                      ${isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }
                    `}
                  >
                    {tab.label}
                    <span className={`
                      text-[10px] tabular-nums
                      ${isActive ? "text-primary/70" : "text-muted-foreground/60"}
                    `}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 px-4">
              <CheckCircle2 className="h-8 w-8 text-success/60 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">All caught up</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {activeTab === "all"
                  ? "No notifications"
                  : `No ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} notifications`}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[320px]">
              <div className="py-1">
                <AnimatePresence mode="popLayout">
                  {filteredNotifications.slice(0, 15).map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
                      transition={{ delay: index * 0.02 }}
                      className={`
                        group flex items-start gap-2.5 px-4 py-2.5 cursor-pointer transition-colors hover:bg-muted/40
                        ${notification.read ? "opacity-50" : ""}
                      `}
                      onClick={() => markAsRead(notification.id)}
                    >
                      {/* Unread dot + Icon */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            notification.read ? "bg-transparent" : "bg-primary"
                          }`}
                        />
                        {getIcon(notification.type, notification.severity)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] leading-tight truncate ${
                          notification.read
                            ? "font-normal text-muted-foreground"
                            : "font-medium text-foreground"
                        }`}>
                          {stripEmojis(notification.title)}
                        </p>
                        <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>

                      {/* Dismiss */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notification.id);
                        }}
                        className="flex-shrink-0 p-0.5 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 mt-0.5"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {filteredNotifications.length > 15 && (
                <div className="px-4 py-2 text-center border-t border-border/30">
                  <p className="text-[11px] text-muted-foreground">
                    +{filteredNotifications.length - 15} more
                  </p>
                </div>
              )}
            </ScrollArea>
          )}
        </motion.div>
      </PopoverContent>
    </Popover>
  );
};

export default HeaderNotifications;
