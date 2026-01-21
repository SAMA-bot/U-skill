import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Shield,
  User,
  BookOpen,
  UserCog,
  FileText,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useAuditLogs, AuditLog } from "@/hooks/useAuditLogs";
import { Loader2 } from "lucide-react";

const ACTION_TYPES = [
  { value: "all", label: "All Actions" },
  { value: "COURSE_COMPLETED", label: "Course Completed" },
  { value: "COURSE_CREATED", label: "Course Created" },
  { value: "COURSE_PUBLISHED", label: "Course Published" },
  { value: "COURSE_UNPUBLISHED", label: "Course Unpublished" },
  { value: "COURSE_UPDATED", label: "Course Updated" },
  { value: "COURSE_DELETED", label: "Course Deleted" },
  { value: "ROLE_ASSIGNED", label: "Role Assigned" },
  { value: "ROLE_CHANGED", label: "Role Changed" },
  { value: "ROLE_REMOVED", label: "Role Removed" },
  { value: "USER_CREATED", label: "User Created" },
  { value: "PROFILE_UPDATED", label: "Profile Updated" },
];

const ENTITY_TYPES = [
  { value: "all", label: "All Entities" },
  { value: "course_enrollment", label: "Enrollments" },
  { value: "course", label: "Courses" },
  { value: "user_role", label: "Roles" },
  { value: "profile", label: "Profiles" },
];

const getActionIcon = (actionType: string) => {
  if (actionType.startsWith("COURSE")) return BookOpen;
  if (actionType.startsWith("ROLE")) return UserCog;
  if (actionType.startsWith("USER") || actionType.startsWith("PROFILE")) return User;
  return FileText;
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

const formatActionType = (actionType: string): string => {
  return actionType
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

const AuditLogItem = ({ log }: { log: AuditLog }) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = getActionIcon(log.action_type);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border last:border-0"
      >
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left">
            <div className="flex-shrink-0">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-xs ${getActionColor(log.action_type)}`}>
                  {formatActionType(log.action_type)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {log.entity_type}
                </span>
              </div>
              <p className="text-sm text-foreground mt-0.5 truncate">
                {log.metadata?.course_title ||
                  log.metadata?.user_name ||
                  log.metadata?.full_name ||
                  log.metadata?.title ||
                  "Action performed"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-muted-foreground">
                {format(new Date(log.created_at), "MMM d, h:mm a")}
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-1 bg-muted/30">
            <div className="text-xs space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">User ID:</span>
                  <p className="font-mono text-foreground break-all">
                    {log.user_id}
                  </p>
                </div>
                {log.entity_id && (
                  <div>
                    <span className="text-muted-foreground">Entity ID:</span>
                    <p className="font-mono text-foreground break-all">
                      {log.entity_id}
                    </p>
                  </div>
                )}
              </div>
              {Object.keys(log.metadata || {}).length > 0 && (
                <div>
                  <span className="text-muted-foreground">Details:</span>
                  <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
              <div className="text-muted-foreground">
                {format(new Date(log.created_at), "EEEE, MMMM d, yyyy 'at' h:mm:ss a")}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </motion.div>
    </Collapsible>
  );
};

const AuditLogViewer = () => {
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { logs, loading, error, refetch } = useAuditLogs({
    actionType: actionFilter !== "all" ? actionFilter : undefined,
    entityType: entityFilter !== "all" ? entityFilter : undefined,
    limit: 200,
  });

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      log.action_type.toLowerCase().includes(searchLower) ||
      log.entity_type.toLowerCase().includes(searchLower) ||
      JSON.stringify(log.metadata).toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: logs.length,
    courseCompletions: logs.filter((l) => l.action_type === "COURSE_COMPLETED").length,
    roleChanges: logs.filter((l) => l.action_type.startsWith("ROLE")).length,
    userActivity: logs.filter((l) => 
      l.action_type === "USER_CREATED" || l.action_type === "PROFILE_UPDATED"
    ).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Audit Logs
          </h2>
          <p className="text-muted-foreground mt-1">
            Track sensitive actions and system events
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.courseCompletions}</div>
            <div className="text-xs text-muted-foreground">Course Completions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.roleChanges}</div>
            <div className="text-xs text-muted-foreground">Role Changes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.userActivity}</div>
            <div className="text-xs text-muted-foreground">User Activity</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={refetch}>
                Try Again
              </Button>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="font-medium text-foreground">No audit logs found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || actionFilter !== "all" || entityFilter !== "all"
                  ? "Try adjusting your filters"
                  : "System events will appear here"}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              {filteredLogs.map((log) => (
                <AuditLogItem key={log.id} log={log} />
              ))}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogViewer;
