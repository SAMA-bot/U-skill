import { useEffect, useMemo, useRef, useState } from "react";
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
  FileX,
  FileCheck,
  ClipboardList,
  History as HistoryIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications, Notification, NotificationCategory } from "@/hooks/useNotifications";
import { formatRelativeTime, getTimeBucket, TIME_BUCKET_ORDER, TimeBucket } from "@/lib/relativeTime";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TabKey = "all" | NotificationCategory;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "alert", label: "Alerts" },
  { key: "course", label: "Courses" },
  { key: "achievement", label: "Badges" },
  { key: "document", label: "Docs" },
  { key: "activity", label: "Activity" },
];

const PAGE_SIZE = 12;

interface IconConfig {
  icon: React.ReactNode;
  bg: string;
  text: string;
}

const getIconConfig = (type: Notification["type"], severity: Notification["severity"]): IconConfig => {
  const cls = "h-3.5 w-3.5";
  switch (type) {
    case "goal_achieved":
      return { icon: <CheckCircle2 className={cls} />, bg: "bg-success/15", text: "text-success" };
    case "goal_deadline":
      return { icon: <Calendar className={cls} />, bg: "bg-warning/15", text: "text-warning" };
    case "goal_at_risk":
      return { icon: <AlertTriangle className={cls} />, bg: "bg-destructive/15", text: "text-destructive" };
    case "performance_change":
      return severity === "success"
        ? { icon: <TrendingUp className={cls} />, bg: "bg-success/15", text: "text-success" }
        : { icon: <TrendingDown className={cls} />, bg: "bg-destructive/15", text: "text-destructive" };
    case "course_completed":
      return { icon: <GraduationCap className={cls} />, bg: "bg-success/15", text: "text-success" };
    case "course_started":
      return { icon: <PlayCircle className={cls} />, bg: "bg-primary/15", text: "text-primary" };
    case "course_enrolled":
      return { icon: <BookOpen className={cls} />, bg: "bg-primary/15", text: "text-primary" };
    case "training_reminder":
      return { icon: <ClipboardList className={cls} />, bg: "bg-warning/15", text: "text-warning" };
    case "achievement_earned":
      return { icon: <Award className={cls} />, bg: "bg-warning/15", text: "text-warning" };
    case "document_approved":
      return { icon: <FileCheck className={cls} />, bg: "bg-success/15", text: "text-success" };
    case "document_rejected":
      return { icon: <FileX className={cls} />, bg: "bg-destructive/15", text: "text-destructive" };
    case "activity_event":
      return { icon: <HistoryIcon className={cls} />, bg: "bg-accent/20", text: "text-accent-foreground" };
    default:
      return { icon: <Bell className={cls} />, bg: "bg-muted", text: "text-muted-foreground" };
  }
};

const stripEmojis = (text: string) =>
  text.replace(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{2B55}\u{FE00}-\u{FEFF}\u{1FA00}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}✅❌]/gu, "").trim();

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

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [tick, setTick] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Keep relative timestamps fresh while the panel is open.
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab, unreadOnly, open]);

  const filtered = useMemo(() => {
    let items = activeTab === "all" ? notifications : notifications.filter((n) => n.category === activeTab);
    if (unreadOnly) items = items.filter((n) => !n.read);
    return [...items].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [notifications, activeTab, unreadOnly]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;

  // Infinite scroll: load the next page when the sentinel scrolls into view.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { rootMargin: "80px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, visible.length, open]);

  const sections = useMemo(() => {
    const now = new Date();
    const map = new Map<TimeBucket, Notification[]>();
    visible.forEach((n) => {
      const bucket = getTimeBucket(n.timestamp, now);
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket)!.push(n);
    });
    return TIME_BUCKET_ORDER.filter((b) => map.has(b)).map((b) => ({
      label: b,
      items: map.get(b)!,
      unread: map.get(b)!.filter((n) => !n.read).length,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, tick]);

  const getTabCount = (key: TabKey) =>
    key === "all"
      ? notifications.length
      : notifications.filter((n) => n.category === key).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          className="relative bg-muted p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full ring-2 ring-background tabular-nums"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[380px] max-w-[calc(100vw-1rem)] p-0 rounded-xl border-border/50 shadow-xl overflow-hidden"
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
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-foreground text-sm">Notifications</h4>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold tabular-nums">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
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
            <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
              {TABS.map((tab) => {
                const count = getTabCount(tab.key);
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )}
                  >
                    {tab.label}
                    <span className={cn("text-[10px] tabular-nums", isActive ? "text-primary/70" : "text-muted-foreground/60")}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <button
                onClick={() => setUnreadOnly((v) => !v)}
                className={cn(
                  "text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors",
                  unreadOnly
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                Unread only
              </button>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {filtered.length} shown
              </span>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 px-4">
              <CheckCircle2 className="h-8 w-8 text-success/60 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">All caught up</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {unreadOnly
                  ? "No unread notifications"
                  : activeTab === "all"
                    ? "No notifications"
                    : `No ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} notifications`}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[340px]">
              <div className="pb-1">
                {sections.map((section) => (
                  <div key={section.label}>
                    {/* Sticky section header */}
                    <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-1.5 bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/80 border-b border-border/30">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {section.label}
                      </span>
                      {section.unread > 0 && (
                        <span className="text-[10px] font-semibold text-primary tabular-nums">
                          {section.unread} unread
                        </span>
                      )}
                    </div>

                    <AnimatePresence mode="popLayout">
                      {section.items.map((notification) => {
                        const config = getIconConfig(notification.type, notification.severity);
                        return (
                          <motion.div
                            key={notification.id}
                            layout
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
                            className={cn(
                              "group relative flex items-start gap-2.5 px-4 py-2.5 cursor-pointer transition-colors hover:bg-muted/40",
                              !notification.read && "bg-primary/[0.04]",
                              notification.read && "opacity-70",
                            )}
                            onClick={() => markAsRead(notification.id)}
                          >
                            {!notification.read && (
                              <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary" />
                            )}
                            <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                  notification.read ? "bg-transparent" : "bg-primary",
                                )}
                              />
                              <div className={cn("p-1 rounded-md", config.bg, config.text)}>{config.icon}</div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-[13px] leading-tight truncate",
                                  notification.read ? "font-normal text-muted-foreground" : "font-medium text-foreground",
                                )}
                              >
                                {stripEmojis(notification.title)}
                              </p>
                              <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                                {notification.message}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {formatRelativeTime(notification.timestamp)}
                              </p>
                            </div>

                            <button
                              aria-label="Dismiss notification"
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissNotification(notification.id);
                              }}
                              className="flex-shrink-0 p-0.5 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 mt-0.5"
                            >
                              <X className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ))}

                {/* Infinite scroll sentinel */}
                {hasMore ? (
                  <div ref={sentinelRef} className="flex items-center justify-center gap-2 py-3">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">Loading more…</span>
                  </div>
                ) : (
                  filtered.length > PAGE_SIZE && (
                    <p className="py-3 text-center text-[10px] text-muted-foreground">
                      You've reached the end
                    </p>
                  )
                )}
              </div>
            </ScrollArea>
          )}
        </motion.div>
      </PopoverContent>
    </Popover>
  );
};

export default HeaderNotifications;
