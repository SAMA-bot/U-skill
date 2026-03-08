import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Loader2, Search, TrendingUp, Brain, Zap, GraduationCap,
  ChevronDown, ChevronUp, Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { getPerformanceBadgeColor, getPerformanceBadgeLabel } from "@/lib/performanceUtils";

interface FacultyPerformance {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  designation: string | null;
  performanceScore: number;
  capacityScore: number;
  motivationIndex: number;
  trainingHours: number;
  trainingsCompleted: number;
}

interface HodPerformanceReviewProps {
  department: string;
}

const HodPerformanceReview = ({ department }: HodPerformanceReviewProps) => {
  const [faculty, setFaculty] = useState<FacultyPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [perfFilter, setPerfFilter] = useState<string>("all");
  const [trainingFilter, setTrainingFilter] = useState<string>("all");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const { selectedYear, getDateRangeForYear } = useAcademicYear();

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const fetchFacultyPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const dateRange = getDateRangeForYear(selectedYear);
      const startDate = dateRange?.start.toISOString();
      const endDate = dateRange?.end.toISOString();
      const academicStartYear = parseInt(selectedYear.split("-")[0]);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, designation")
        .eq("department", department);

      if (!profiles || profiles.length === 0) {
        setFaculty([]);
        setLoading(false);
        return;
      }

      const facultyIds = profiles.map((f) => f.user_id);

      const [perfRes, skillsRes, motivRes, enrollRes] = await Promise.all([
        supabase
          .from("performance_metrics")
          .select("user_id, teaching_score, research_score, service_score")
          .in("user_id", facultyIds)
          .or(`year.eq.${academicStartYear},year.eq.${academicStartYear + 1}`),
        supabase
          .from("capacity_skills")
          .select("user_id, current_level")
          .in("user_id", facultyIds),
        supabase
          .from("motivation_scores")
          .select("user_id, motivation_index")
          .in("user_id", facultyIds)
          .eq("year", academicStartYear),
        (() => {
          let q = supabase
            .from("course_enrollments")
            .select("user_id, status, course_id")
            .in("user_id", facultyIds);
          if (startDate && endDate) {
            q = q.gte("enrolled_at", startDate).lte("enrolled_at", endDate);
          }
          return q;
        })(),
      ]);

      // Build maps
      const perfMap: Record<string, number[]> = {};
      (perfRes.data || []).forEach((p) => {
        const avg = Math.round(((p.teaching_score || 0) + (p.research_score || 0) + (p.service_score || 0)) / 3);
        if (!perfMap[p.user_id]) perfMap[p.user_id] = [];
        perfMap[p.user_id].push(avg);
      });

      const skillMap: Record<string, number[]> = {};
      (skillsRes.data || []).forEach((s) => {
        if (!skillMap[s.user_id]) skillMap[s.user_id] = [];
        skillMap[s.user_id].push(s.current_level || 0);
      });

      const motivMap: Record<string, number[]> = {};
      (motivRes.data || []).forEach((m) => {
        if (!motivMap[m.user_id]) motivMap[m.user_id] = [];
        motivMap[m.user_id].push(m.motivation_index || 0);
      });

      const enrollMap: Record<string, { completed: number; total: number }> = {};
      (enrollRes.data || []).forEach((e) => {
        if (!enrollMap[e.user_id]) enrollMap[e.user_id] = { completed: 0, total: 0 };
        enrollMap[e.user_id].total++;
        if (e.status === "completed") enrollMap[e.user_id].completed++;
      });

      const result: FacultyPerformance[] = profiles.map((p) => {
        const perfScores = perfMap[p.user_id] || [];
        const performanceScore = perfScores.length > 0 ? Math.round(perfScores.reduce((a, b) => a + b, 0) / perfScores.length) : 0;

        const skills = skillMap[p.user_id] || [];
        const capacityScore = skills.length > 0 ? Math.round(skills.reduce((a, b) => a + b, 0) / skills.length) : 0;

        const motivScores = motivMap[p.user_id] || [];
        const motivationIndex = motivScores.length > 0 ? Math.round(motivScores.reduce((a, b) => a + b, 0) / motivScores.length) : 0;

        const enroll = enrollMap[p.user_id] || { completed: 0, total: 0 };

        return {
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          designation: p.designation,
          performanceScore,
          capacityScore,
          motivationIndex,
          trainingHours: enroll.completed * 2, // estimate 2 hours per training
          trainingsCompleted: enroll.completed,
        };
      });

      result.sort((a, b) => b.performanceScore - a.performanceScore);
      setFaculty(result);
    } catch (err) {
      console.error("Error fetching faculty performance:", err);
    } finally {
      setLoading(false);
    }
  }, [department, selectedYear, getDateRangeForYear]);

  useEffect(() => {
    fetchFacultyPerformance();
  }, [fetchFacultyPerformance]);

  const filtered = faculty.filter((f) => {
    if (search && !f.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (perfFilter === "excellent" && f.performanceScore < 80) return false;
    if (perfFilter === "good" && (f.performanceScore < 60 || f.performanceScore >= 80)) return false;
    if (perfFilter === "needs_improvement" && f.performanceScore >= 60) return false;
    if (trainingFilter === "active" && f.trainingsCompleted === 0) return false;
    if (trainingFilter === "inactive" && f.trainingsCompleted > 0) return false;
    return true;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Faculty Performance Review
          </h2>
          <p className="text-sm text-muted-foreground">
            Review and analyze performance metrics for department faculty
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search faculty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={perfFilter} onValueChange={setPerfFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Performance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Performance</SelectItem>
              <SelectItem value="excellent">Excellent (80+)</SelectItem>
              <SelectItem value="good">Good (60-79)</SelectItem>
              <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
            </SelectContent>
          </Select>
          <Select value={trainingFilter} onValueChange={setTrainingFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Training" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Training</SelectItem>
              <SelectItem value="active">Has Training</SelectItem>
              <SelectItem value="inactive">No Training</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Faculty Cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <BarChart3 className="h-12 w-12 opacity-40" />
            <p className="text-sm font-medium">No faculty match your filters</p>
            <p className="text-xs">Try adjusting your search or filter criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((f, idx) => (
            <motion.div
              key={f.user_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedUser(expandedUser === f.user_id ? null : f.user_id)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={f.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(f.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{f.full_name}</p>
                      {f.designation && (
                        <p className="text-xs text-muted-foreground">{f.designation}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-lg font-bold text-foreground">{f.performanceScore}</p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                      <Badge variant="outline" className={`text-xs ${getPerformanceBadgeColor(f.performanceScore)}`}>
                        {getPerformanceBadgeLabel(f.performanceScore)}
                      </Badge>
                      {expandedUser === f.user_id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {expandedUser === f.user_id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 pt-4 border-t border-border"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Performance
                          </div>
                          <Progress value={f.performanceScore} className="h-2" />
                          <p className="text-xs font-medium text-foreground">{f.performanceScore}/100</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Target className="h-3.5 w-3.5" />
                            Capacity
                          </div>
                          <Progress value={f.capacityScore} className="h-2" />
                          <p className="text-xs font-medium text-foreground">{f.capacityScore}/100</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Zap className="h-3.5 w-3.5" />
                            Motivation
                          </div>
                          <Progress value={f.motivationIndex} className="h-2" />
                          <p className="text-xs font-medium text-foreground">{f.motivationIndex}/100</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <GraduationCap className="h-3.5 w-3.5" />
                            Training
                          </div>
                          <Progress value={Math.min(f.trainingsCompleted * 20, 100)} className="h-2" />
                          <p className="text-xs font-medium text-foreground">{f.trainingsCompleted} completed · ~{f.trainingHours}h</p>
                        </div>
                      </div>

                      {f.performanceScore < 60 && (
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-400 mb-1">💡 Improvement Recommendations</p>
                          <ul className="text-xs text-amber-700 dark:text-amber-500 space-y-0.5 list-disc list-inside">
                            {f.trainingsCompleted === 0 && <li>Encourage enrollment in training programs</li>}
                            {f.capacityScore < 40 && <li>Focus on skill development workshops</li>}
                            {f.motivationIndex < 40 && <li>Schedule 1-on-1 mentoring session</li>}
                            <li>Set achievable short-term performance goals</li>
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HodPerformanceReview;
