import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Loader2, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { getPerformanceBadgeColor, getPerformanceBadgeLabel } from "@/lib/performanceUtils";

interface FacultyEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  designation: string | null;
  compositeScore: number;
}

interface DepartmentData {
  name: string;
  faculty: FacultyEntry[];
}

const DepartmentLeaderboard = () => {
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const { selectedYear } = useAcademicYear();

  useEffect(() => {
    fetchLeaderboardData();
  }, [selectedYear]);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    const academicStartYear = parseInt(selectedYear.split("-")[0]);

    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, designation, department");

      if (!profiles || profiles.length === 0) {
        setLoading(false);
        return;
      }

      const userIds = profiles.map((p) => p.user_id);

      // Fetch performance metrics for all users in the academic year
      const { data: perfData } = await supabase
        .from("performance_metrics")
        .select("user_id, teaching_score, research_score, service_score")
        .in("user_id", userIds)
        .or(`year.eq.${academicStartYear},year.eq.${academicStartYear + 1}`);

      // Build per-user average performance
      const userPerfMap: Record<string, number[]> = {};
      (perfData || []).forEach((p) => {
        const avg = Math.round(
          ((p.teaching_score || 0) + (p.research_score || 0) + (p.service_score || 0)) / 3
        );
        if (!userPerfMap[p.user_id]) userPerfMap[p.user_id] = [];
        userPerfMap[p.user_id].push(avg);
      });

      // Group by department
      const deptMap: Record<string, FacultyEntry[]> = {};

      profiles.forEach((p) => {
        const dept = p.department || "Unassigned";
        const scores = userPerfMap[p.user_id] || [];
        const compositeScore =
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;

        if (!deptMap[dept]) deptMap[dept] = [];
        deptMap[dept].push({
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          designation: p.designation,
          compositeScore,
        });
      });

      // Sort faculty within each department by score desc
      const deptList: DepartmentData[] = Object.entries(deptMap)
        .map(([name, faculty]) => ({
          name,
          faculty: faculty.sort((a, b) => b.compositeScore - a.compositeScore),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setDepartments(deptList);

      // Auto-expand first department
      if (deptList.length > 0) {
        setExpandedDepts(new Set([deptList[0].name]));
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDept = (dept: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getRankStyle = (rank: number) => {
    if (rank === 0)
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 ring-2 ring-yellow-400/30";
    if (rank === 1)
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600 ring-2 ring-gray-400/20";
    if (rank === 2)
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-700 ring-2 ring-orange-400/20";
    return "bg-muted text-muted-foreground border-border";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return `${rank + 1}`;
  };

  const filteredDepts =
    selectedDept === "all"
      ? departments
      : departments.filter((d) => d.name === selectedDept);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Department Leaderboards
          </h1>
          <p className="text-muted-foreground">
            Top faculty performers by department · {selectedYear}
          </p>
        </div>
        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.name} value={d.name}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredDepts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No department data available.
          </CardContent>
        </Card>
      ) : (
        filteredDepts.map((dept, deptIdx) => {
          const isExpanded = expandedDepts.has(dept.name);
          const top3 = dept.faculty.slice(0, 3);
          const rest = dept.faculty.slice(3);

          return (
            <motion.div
              key={dept.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: deptIdx * 0.08 }}
            >
              <Card className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleDept(dept.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{dept.name}</CardTitle>
                        <CardDescription>
                          {dept.faculty.length} faculty member{dept.faculty.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    {/* Top 3 Podium */}
                    {top3.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        {top3.map((faculty, idx) => (
                          <motion.div
                            key={faculty.user_id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`relative p-4 rounded-xl border ${getRankStyle(idx)} text-center`}
                          >
                            <div className="text-2xl mb-2">{getRankIcon(idx)}</div>
                            <Avatar className="h-14 w-14 mx-auto mb-2 ring-2 ring-background">
                              <AvatarImage src={faculty.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {getInitials(faculty.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <h4 className="text-sm font-semibold text-foreground truncate">
                              {faculty.full_name}
                            </h4>
                            {faculty.designation && (
                              <p className="text-xs text-muted-foreground truncate">
                                {faculty.designation}
                              </p>
                            )}
                            <div className="mt-2">
                              <span className="text-xl font-bold text-foreground">
                                {faculty.compositeScore}
                              </span>
                              <span className="text-xs text-muted-foreground">/100</span>
                            </div>
                            <Badge
                              className={`mt-1 text-[10px] ${getPerformanceBadgeColor(faculty.compositeScore)}`}
                            >
                              {getPerformanceBadgeLabel(faculty.compositeScore)}
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Remaining faculty */}
                    {rest.length > 0 && (
                      <div className="space-y-2">
                        {rest.map((faculty, idx) => (
                          <div
                            key={faculty.user_id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                {idx + 4}
                              </div>
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={faculty.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(faculty.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {faculty.full_name}
                                </p>
                                {faculty.designation && (
                                  <p className="text-xs text-muted-foreground">
                                    {faculty.designation}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-foreground">
                                {faculty.compositeScore}/100
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${getPerformanceBadgeColor(faculty.compositeScore)}`}
                              >
                                {getPerformanceBadgeLabel(faculty.compositeScore)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {dept.faculty.length === 0 && (
                      <p className="text-center text-muted-foreground py-6 text-sm">
                        No faculty members in this department.
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            </motion.div>
          );
        })
      )}
    </div>
  );
};

export default DepartmentLeaderboard;
