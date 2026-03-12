import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BookOpen,
  UserCog,
  User,
  FileText,
  GraduationCap,
  TrendingUp,
  Loader2,
  CalendarIcon,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import SmartEmptyState from "@/components/dashboard/SmartEmptyState";

interface LogEntry {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// Role-specific allowed action types
const ADMIN_ACTIONS = [
  "USER_CREATED", "ROLE_ASSIGNED", "ROLE_CHANGED", "ROLE_REMOVED",
  "COURSE_CREATED", "COURSE_PUBLISHED", "COURSE_UNPUBLISHED", "COURSE_UPDATED", "COURSE_DELETED",
  "PROFILE_UPDATED",
];

const FACULTY_ACTIONS = [
  "COURSE_COMPLETED", "COURSE_ENROLLED",
  "DOCUMENT_UPLOADED", "DOCUMENT_APPROVED", "DOCUMENT_REJECTED",
  "PROFILE_UPDATED", "USER_CREATED",
];

const HOD_ACTIONS = [
  "DOCUMENT_APPROVED", "DOCUMENT_REJECTED",
  "PROFILE_UPDATED", "COURSE_COMPLETED",
  "USER_CREATED",
];

const getAllowedActions = (role: string | null): string[] | null => {
  switch (role) {
    case "admin": return ADMIN_ACTIONS;
    case "hod": return HOD_ACTIONS;
    case "faculty": return FACULTY_ACTIONS;
    default: return FACULTY_ACTIONS;
  }
};

const getCategoryFiltersForRole = (role: string | null) => {
  const base = [{ value: "all", label: "All Activities" }];
  switch (role) {
    case "admin":
      return [...base,
        { value: "roles", label: "Role Changes" },
        { value: "training", label: "Course Management" },
        { value: "profile", label: "User Management" },
      ];
    case "hod":
      return [...base,
        { value: "documents", label: "Document Approvals" },
        { value: "training", label: "Training & Courses" },
        { value: "profile", label: "Profile Updates" },
      ];
    default:
      return [...base,
        { value: "training", label: "Training & Courses" },
        { value: "documents", label: "Documents" },
        { value: "profile", label: "Profile Updates" },
        { value: "scores", label: "Score Changes" },
      ];
  }
};

const DATE_PRESETS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const getCategoryForAction = (actionType: string): string => {
  if (actionType.startsWith("COURSE")) return "training";
  if (actionType.startsWith("ROLE")) return "roles";
  if (actionType === "PROFILE_UPDATED") return "profile";
  if (actionType === "USER_CREATED") return "profile";
  if (actionType === "DOCUMENT_UPLOADED" || actionType === "DOCUMENT_APPROVED" || actionType === "DOCUMENT_REJECTED") return "documents";
  if (actionType.includes("SCORE") || actionType.includes("METRIC")) return "scores";
  return "training";
};

const getActionIcon = (actionType: string) => {
  if (actionType.startsWith("COURSE")) return GraduationCap;
  if (actionType.startsWith("ROLE")) return UserCog;
  if (actionType === "PROFILE_UPDATED" || actionType === "USER_CREATED") return User;
  if (actionType.includes("DOCUMENT")) return FileText;
  if (actionType.includes("SCORE") || actionType.includes("METRIC")) return TrendingUp;
  return BookOpen;
};

const getActionColor = (actionType: string): string => {
  switch (actionType) {
    case "COURSE_COMPLETED":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "COURSE_CREATED":
    case "USER_CREATED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "COURSE_PUBLISHED":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "COURSE_UNPUBLISHED":
    case "COURSE_DELETED":
    case "ROLE_REMOVED":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "ROLE_ASSIGNED":
    case "ROLE_CHANGED":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "PROFILE_UPDATED":
    case "COURSE_UPDATED":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const formatActionLabel = (actionType: string): string => {
  return actionType
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
};

const getActionDescription = (log: LogEntry): string => {
  const m = log.metadata || {};
  switch (log.action_type) {
    case "COURSE_COMPLETED":
      return `Completed course: ${m.course_title || "Unknown"}`;
    case "COURSE_CREATED":
      return `Created course: ${m.title || "Unknown"}`;
    case "COURSE_PUBLISHED":
      return `Published course: ${m.title || "Unknown"}`;
    case "COURSE_UNPUBLISHED":
      return `Unpublished course: ${m.title || "Unknown"}`;
    case "COURSE_UPDATED":
      return `Updated course: ${m.title || "Unknown"}`;
    case "COURSE_DELETED":
      return `Deleted course: ${m.title || "Unknown"}`;
    case "ROLE_ASSIGNED":
      return `Assigned role: ${m.role || "Unknown"}`;
    case "ROLE_CHANGED":
      return `Role changed from ${m.old_role} to ${m.new_role}`;
    case "PROFILE_UPDATED":
      return "Updated profile information";
    case "USER_CREATED":
      return "Account created";
    default:
      return formatActionLabel(log.action_type);
  }
};

// --- Timeline Item ---
const TimelineItem = ({ log, index }: { log: LogEntry; index: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = getActionIcon(log.action_type);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        className="relative flex gap-4 pl-2"
      >
        {/* Timeline dot & line */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center z-10",
              getActionColor(log.action_type)
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="w-px flex-1 bg-border" />
        </div>

        {/* Content */}
        <div className="flex-1 pb-6 min-w-0">
          <CollapsibleTrigger asChild>
            <button className="w-full text-left group">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", getActionColor(log.action_type))}
                    >
                      {formatActionLabel(log.action_type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {log.entity_type}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {getActionDescription(log)}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 text-xs text-muted-foreground">
                  <span>{format(new Date(log.created_at), "MMM d, h:mm a")}</span>
                  {isOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mt-2 p-3 rounded-md bg-muted/40 text-xs space-y-2">
              {log.entity_id && (
                <div>
                  <span className="text-muted-foreground">Entity ID: </span>
                  <span className="font-mono text-foreground break-all">
                    {log.entity_id}
                  </span>
                </div>
              )}
              {Object.keys(log.metadata || {}).length > 0 && (
                <div>
                  <span className="text-muted-foreground">Details:</span>
                  <pre className="mt-1 p-2 bg-background rounded overflow-auto max-h-28 text-xs">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
              <div className="text-muted-foreground">
                {format(
                  new Date(log.created_at),
                  "EEEE, MMMM d, yyyy 'at' h:mm:ss a"
                )}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </motion.div>
    </Collapsible>
  );
};

// --- Main Component ---
const ActivityLogTimeline = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const allowedActions = getAllowedActions(role);
  const categoryFilters = getCategoryFiltersForRole(role);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("30");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      // Date filtering
      if (dateFrom) {
        query = query.gte("created_at", startOfDay(dateFrom).toISOString());
      } else if (datePreset !== "all") {
        const daysAgo = subDays(new Date(), parseInt(datePreset));
        query = query.gte("created_at", startOfDay(daysAgo).toISOString());
      }
      if (dateTo) {
        query = query.lte("created_at", endOfDay(dateTo).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data || []) as LogEntry[]);
    } catch (err) {
      console.error("Error fetching activity logs:", err);
    } finally {
      setLoading(false);
    }
  }, [user, datePreset, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Client-side filters (role-based + category + search)
  const filteredLogs = logs.filter((log) => {
    // Role-based action filtering
    if (allowedActions && !allowedActions.includes(log.action_type)) {
      return false;
    }
    if (categoryFilter !== "all" && getCategoryForAction(log.action_type) !== categoryFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.action_type.toLowerCase().includes(q) ||
        log.entity_type.toLowerCase().includes(q) ||
        JSON.stringify(log.metadata).toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    total: filteredLogs.length,
    training: filteredLogs.filter((l) => getCategoryForAction(l.action_type) === "training").length,
    documents: filteredLogs.filter((l) => getCategoryForAction(l.action_type) === "documents").length,
    profile: filteredLogs.filter((l) => getCategoryForAction(l.action_type) === "profile").length,
  };

  const clearDateRange = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setDatePreset("30");
  };

  const isCustomDate = !!dateFrom || !!dateTo;

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Events", value: stats.total, color: "text-foreground" },
          { label: "Training", value: stats.training, color: "text-green-600 dark:text-green-400" },
          { label: "Documents", value: stats.documents, color: "text-purple-600 dark:text-purple-400" },
          { label: "Profile", value: stats.profile, color: "text-amber-600 dark:text-amber-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activity logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryFilters.map((c) => (
                   <SelectItem key={c.value} value={c.value}>
                     {c.label}
                   </SelectItem>
                 ))}
              </SelectContent>
            </Select>

            {/* Date Preset */}
            {!isCustomDate && (
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Custom Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="flex-shrink-0">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="end">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Custom Date Range</p>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">From</p>
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(d) => { setDateFrom(d); setDatePreset("all"); }}
                      className="p-2 pointer-events-auto"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">To</p>
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(d) => { setDateTo(d); setDatePreset("all"); }}
                      className="p-2 pointer-events-auto"
                    />
                  </div>
                  {isCustomDate && (
                    <Button variant="ghost" size="sm" className="w-full" onClick={clearDateRange}>
                      <X className="h-3 w-3 mr-1" /> Clear dates
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Refresh */}
            <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading} className="flex-shrink-0">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>

          {isCustomDate && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>
                {dateFrom ? format(dateFrom, "MMM d, yyyy") : "Start"} —{" "}
                {dateTo ? format(dateTo, "MMM d, yyyy") : "Now"}
              </span>
              <button onClick={clearDateRange} className="text-destructive hover:underline">
                Clear
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <SmartEmptyState
              icon={History}
              title={searchQuery || categoryFilter !== "all" ? "No matching activities" : "No activity logs yet"}
              description={searchQuery || categoryFilter !== "all"
                ? "Try adjusting your search or filter criteria to find specific activities."
                : "Your activity history will appear here as you complete courses, upload documents, and log professional activities."}
              actionLabel={searchQuery || categoryFilter !== "all" ? "Clear Filters" : undefined}
              onAction={searchQuery || categoryFilter !== "all" ? () => { setSearchQuery(""); setCategoryFilter("all"); } : undefined}
            />
          ) : (
            <ScrollArea className="max-h-[600px] pr-2">
              <div className="relative">
                <AnimatePresence>
                  {filteredLogs.map((log, idx) => (
                    <TimelineItem key={log.id} log={log} index={idx} />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogTimeline;
