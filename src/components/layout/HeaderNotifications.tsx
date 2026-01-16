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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications, Notification } from "@/hooks/useNotifications";

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

  const getIcon = (type: Notification["type"], severity: Notification["severity"]) => {
    switch (type) {
      case "goal_achieved":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "goal_deadline":
        return <Calendar className="h-4 w-4 text-amber-500" />;
      case "goal_at_risk":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "performance_change":
        return severity === "success" ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        );
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative bg-muted p-2 rounded-full text-muted-foreground hover:text-foreground focus:outline-none transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-medium rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={markAllAsRead}
              >
                Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={clearAll}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 px-4">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <p className="font-medium text-foreground">All caught up!</p>
            <p className="text-sm text-muted-foreground">No new notifications</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[320px]">
            <AnimatePresence>
              {notifications.slice(0, 10).map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ delay: index * 0.03 }}
                  className={`
                    relative px-4 py-3 border-l-4 border-b border-border cursor-pointer transition-all hover:bg-muted/50
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
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <div className="flex items-start gap-2 pr-6">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type, notification.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm text-foreground truncate">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {notifications.length > 10 && (
              <div className="p-3 text-center border-t border-border">
                <p className="text-xs text-muted-foreground">
                  +{notifications.length - 10} more notifications
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
