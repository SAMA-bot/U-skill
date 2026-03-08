import { useState, useEffect, useMemo } from "react";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Shield,
  User,
  BookOpen,
  UserCog,
  FileText,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Loader2,
  Download,
  ChevronDown,
  ChevronUp,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuditLogs, AuditLog } from "@/hooks/useAuditLogs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

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
  { value: "all", label: "All Modules" },
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
  if (actionType.includes("COMPLETED") || actionType.includes("PUBLISHED"))
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (actionType.includes("CREATED") || actionType.includes("ASSIGNED"))
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  if (actionType.includes("DELETED") || actionType.includes("REMOVED") || actionType.includes("UNPUBLISHED"))
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  if (actionType.includes("CHANGED") || actionType.includes("UPDATED"))
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
};

const formatActionType = (actionType: string): string =>
  actionType
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");

const formatEntityType = (entityType: string): string =>
  entityType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const AuditLogViewer = () => {
  const { user } = useAuth();
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { logs, loading, error, refetch } = useAuditLogs({
    actionType: actionFilter !== "all" ? actionFilter : undefined,
    entityType: entityFilter !== "all" ? entityFilter : undefined,
    limit: 500,
  });

  // Fetch user names
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("user_id, full_name")
      .then(({ data }) => {
        const m: Record<string, string> = {};
        for (const p of data || []) m[p.user_id] = p.full_name;
        setProfileMap(m);
      });
  }, [user]);

  const filteredLogs = useMemo(() => {
    let list = logs;

    // Date filters
    if (dateFrom) {
      const start = startOfDay(dateFrom);
      list = list.filter((l) => isAfter(new Date(l.created_at), start));
    }
    if (dateTo) {
      const end = endOfDay(dateTo);
      list = list.filter((l) => isBefore(new Date(l.created_at), end));
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.action_type.toLowerCase().includes(q) ||
          l.entity_type.toLowerCase().includes(q) ||
          (profileMap[l.user_id] || "").toLowerCase().includes(q) ||
          JSON.stringify(l.metadata).toLowerCase().includes(q)
      );
    }

    return list;
  }, [logs, dateFrom, dateTo, searchQuery, profileMap]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [actionFilter, entityFilter, searchQuery, dateFrom, dateTo]);

  const stats = [
    { label: "Total Events", value: logs.length, color: "from-blue-500 to-blue-600", icon: Activity },
    {
      label: "Course Events",
      value: logs.filter((l) => l.action_type.startsWith("COURSE")).length,
      color: "from-green-500 to-green-600",
      icon: BookOpen,
    },
    {
      label: "Role Changes",
      value: logs.filter((l) => l.action_type.startsWith("ROLE")).length,
      color: "from-purple-500 to-purple-600",
      icon: UserCog,
    },
    {
      label: "User Events",
      value: logs.filter((l) => l.action_type === "USER_CREATED" || l.action_type === "PROFILE_UPDATED").length,
      color: "from-amber-500 to-amber-600",
      icon: User,
    },
  ];

  const handleExportCSV = () => {
    const headers = ["Timestamp", "User", "Action", "Module", "Details"];
    const rows = filteredLogs.map((l) => [
      format(new Date(l.created_at), "yyyy-MM-dd HH:mm:ss"),
      profileMap[l.user_id] || l.user_id,
      formatActionType(l.action_type),
      formatEntityType(l.entity_type),
      JSON.stringify(l.metadata || {}),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setActionFilter("all");
    setEntityFilter("all");
    setSearchQuery("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = actionFilter !== "all" || entityFilter !== "all" || searchQuery || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">Track system activities and monitor user actions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredLogs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`bg-gradient-to-br ${s.color} rounded-md p-2`}>
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold text-foreground">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, action, or details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Action Filter */}
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Module Filter */}
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <span className="text-sm text-muted-foreground">Date Range:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-[180px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-[180px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Activity Log</CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredLogs.length} event{filteredLogs.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={refetch}>
                Try Again
              </Button>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Shield className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="font-medium text-foreground">No audit logs found</p>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters ? "Try adjusting your filters" : "System events will appear here"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => {
                    const Icon = getActionIcon(log.action_type);
                    const userName = profileMap[log.user_id] || "Unknown User";
                    const detail =
                      log.metadata?.course_title ||
                      log.metadata?.user_name ||
                      log.metadata?.full_name ||
                      log.metadata?.title ||
                      log.metadata?.email ||
                      "—";

                    return (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
                              {userName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${getActionColor(log.action_type)}`}>
                            {formatActionType(log.action_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {formatEntityType(log.entity_type)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                          {detail}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Full details for this audit event.
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">User</p>
                  <p className="font-medium text-foreground">
                    {profileMap[selectedLog.user_id] || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Action</p>
                  <Badge className={`text-xs mt-0.5 ${getActionColor(selectedLog.action_type)}`}>
                    {formatActionType(selectedLog.action_type)}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Module</p>
                  <p className="text-foreground">{formatEntityType(selectedLog.entity_type)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Timestamp</p>
                  <p className="text-foreground">
                    {format(new Date(selectedLog.created_at), "EEEE, MMMM d, yyyy 'at' h:mm:ss a")}
                  </p>
                </div>
              </div>
              {selectedLog.entity_id && (
                <div>
                  <p className="text-muted-foreground text-xs">Entity ID</p>
                  <p className="font-mono text-foreground text-xs break-all">{selectedLog.entity_id}</p>
                </div>
              )}
              {selectedLog.user_id && (
                <div>
                  <p className="text-muted-foreground text-xs">User ID</p>
                  <p className="font-mono text-foreground text-xs break-all">{selectedLog.user_id}</p>
                </div>
              )}
              {Object.keys(selectedLog.metadata || {}).length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Metadata</p>
                  <ScrollArea className="max-h-48">
                    <pre className="p-3 bg-muted rounded-md text-xs overflow-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogViewer;
