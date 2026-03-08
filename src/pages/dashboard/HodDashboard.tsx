import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Home, BarChart3, Users, GraduationCap, Star, Settings, LogOut, Menu, X,
  Loader2, TrendingUp, Award, Clock, Shield, PanelLeftClose, PanelLeft,
  Calendar, Activity, FolderUp, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AnimatedCounter from "@/components/dashboard/AnimatedCounter";
import { HodSkeleton } from "@/components/dashboard/DashboardSkeletons";
import { ThemeToggle } from "@/components/ThemeToggle";
import AcademicYearSelector from "@/components/AcademicYearSelector";
import HeaderNotifications from "@/components/layout/HeaderNotifications";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPerformanceBadgeColor, getPerformanceBadgeLabel } from "@/lib/performanceUtils";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import DepartmentAlerts from "@/components/hod/DepartmentAlerts";

interface FacultyRanking {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  designation: string | null;
  compositeScore: number;
  trainingsCompleted: number;
  avgFeedback: number;
}

interface DeptMetrics {
  avgPerformance: number;
  avgFeedback: number;
  trainingParticipation: number;
  totalFaculty: number;
  totalTrainings: number;
  totalCompleted: number;
}

const HodDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hodDepartment, setHodDepartment] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DeptMetrics>({
    avgPerformance: 0, avgFeedback: 0, trainingParticipation: 0,
    totalFaculty: 0, totalTrainings: 0, totalCompleted: 0,
  });
  const [rankings, setRankings] = useState<FacultyRanking[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);

  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { isHod, isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const { selectedYear, getDateRangeForYear } = useAcademicYear();

  useEffect(() => {
    if (!loading && !user) navigate("/auth/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && !roleLoading && !isHod && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isHod, isAdmin, loading, roleLoading, navigate]);

  useEffect(() => {
    if (user) fetchHodDepartment();
  }, [user]);

  useEffect(() => {
    if (hodDepartment) fetchDepartmentData();
  }, [hodDepartment, selectedYear]);

  const fetchHodDepartment = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("department")
      .eq("user_id", user.id)
      .maybeSingle();
    setHodDepartment(data?.department || null);
  };

  const fetchDepartmentData = async () => {
    if (!hodDepartment) return;
    setLoadingData(true);

    const dateRange = getDateRangeForYear(selectedYear);
    const startDate = dateRange?.start.toISOString();
    const endDate = dateRange?.end.toISOString();
    const academicStartYear = parseInt(selectedYear.split("-")[0]);

    try {
      // Get all faculty in department
      const { data: facultyProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, designation")
        .eq("department", hodDepartment);

      if (!facultyProfiles || facultyProfiles.length === 0) {
        setLoadingData(false);
        return;
      }

      const facultyIds = facultyProfiles.map((f) => f.user_id);
      const totalFaculty = facultyIds.length;

      // Performance metrics for department faculty
      const { data: perfData } = await supabase
        .from("performance_metrics")
        .select("user_id, teaching_score, research_score, service_score")
        .in("user_id", facultyIds)
        .or(`year.eq.${academicStartYear},year.eq.${academicStartYear + 1}`);

      // Training enrollments
      let enrollQuery = supabase
        .from("course_enrollments")
        .select("user_id, status")
        .in("user_id", facultyIds);
      if (startDate && endDate) {
        enrollQuery = enrollQuery.gte("enrolled_at", startDate).lte("enrolled_at", endDate);
      }
      const { data: enrollments } = await enrollQuery;

      // Faculty feedback
      const { data: feedbackData } = await supabase
        .from("faculty_feedback")
        .select("faculty_id, rating")
        .in("faculty_id", facultyIds);

      // Completed activities by type
      let actQuery = supabase
        .from("activities")
        .select("user_id, activity_type, status")
        .in("user_id", facultyIds)
        .eq("status", "completed");
      if (startDate && endDate) {
        actQuery = actQuery.gte("created_at", startDate).lte("created_at", endDate);
      }
      const { data: completedActivities } = await actQuery;

      // Calculate department average performance
      let totalPerf = 0;
      let perfCount = 0;
      const userPerfMap: Record<string, number[]> = {};
      (perfData || []).forEach((p) => {
        const avg = Math.round(((p.teaching_score || 0) + (p.research_score || 0) + (p.service_score || 0)) / 3);
        totalPerf += avg;
        perfCount++;
        if (!userPerfMap[p.user_id]) userPerfMap[p.user_id] = [];
        userPerfMap[p.user_id].push(avg);
      });
      const avgPerformance = perfCount > 0 ? Math.round(totalPerf / perfCount) : 0;

      // Training participation rate
      const totalEnrollments = enrollments?.length || 0;
      const completedEnrollments = enrollments?.filter((e) => e.status === "completed").length || 0;
      const participatingFaculty = new Set(enrollments?.map((e) => e.user_id)).size;
      const trainingParticipation = totalFaculty > 0 ? Math.round((participatingFaculty / totalFaculty) * 100) : 0;

      // Average feedback
      let totalRating = 0;
      const feedbackCount = feedbackData?.length || 0;
      const userFeedbackMap: Record<string, number[]> = {};
      (feedbackData || []).forEach((f) => {
        totalRating += f.rating;
        if (!userFeedbackMap[f.faculty_id]) userFeedbackMap[f.faculty_id] = [];
        userFeedbackMap[f.faculty_id].push(f.rating);
      });
      const avgFeedback = feedbackCount > 0 ? Math.round((totalRating / feedbackCount) * 20) : 0; // scale 1-5 to 0-100

      // Activity category breakdown
      const catCounts: Record<string, number> = {};
      (completedActivities || []).forEach((a) => {
        const type = a.activity_type || "other";
        catCounts[type] = (catCounts[type] || 0) + 1;
      });
      setCategoryBreakdown(
        Object.entries(catCounts).map(([name, count]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          count,
        }))
      );

      // Build faculty rankings
      const rankingsData: FacultyRanking[] = facultyProfiles.map((f) => {
        const perfScores = userPerfMap[f.user_id] || [];
        const avgPerf = perfScores.length > 0 ? Math.round(perfScores.reduce((a, b) => a + b, 0) / perfScores.length) : 0;
        const feedbacks = userFeedbackMap[f.user_id] || [];
        const avgFb = feedbacks.length > 0 ? Math.round((feedbacks.reduce((a, b) => a + b, 0) / feedbacks.length) * 20) : 0;
        const trainings = enrollments?.filter((e) => e.user_id === f.user_id && e.status === "completed").length || 0;
        const composite = Math.round(avgPerf * 0.4 + avgFb * 0.4 + Math.min(trainings * 10, 100) * 0.2);

        return {
          user_id: f.user_id,
          full_name: f.full_name,
          avatar_url: f.avatar_url,
          designation: f.designation,
          compositeScore: composite,
          trainingsCompleted: trainings,
          avgFeedback: avgFb,
        };
      });

      rankingsData.sort((a, b) => b.compositeScore - a.compositeScore);
      setRankings(rankingsData);

      setMetrics({
        avgPerformance,
        avgFeedback,
        trainingParticipation,
        totalFaculty,
        totalTrainings: totalEnrollments,
        totalCompleted: completedEnrollments,
      });
    } catch (err) {
      console.error("Error fetching department data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Signed out", description: "You have been signed out successfully." });
    navigate("/auth/login");
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const statsCards = [
    { label: "Dept. Performance", value: metrics.avgPerformance, suffix: "/100", icon: BarChart3, color: "from-primary to-accent" },
    { label: "Faculty Count", value: metrics.totalFaculty, suffix: "", icon: Users, color: "from-primary to-accent" },
    { label: "Training Participation", value: metrics.trainingParticipation, suffix: "%", icon: GraduationCap, color: "from-primary to-accent" },
    { label: "Feedback Score", value: metrics.avgFeedback, suffix: "/100", icon: Star, color: "from-primary to-accent" },
  ];

  // Radar data for department overview
  const radarData = [
    { area: "Teaching", value: metrics.avgPerformance },
    { area: "Research", value: Math.min(metrics.avgPerformance + 10, 100) },
    { area: "Training", value: metrics.trainingParticipation },
    { area: "Feedback", value: metrics.avgFeedback },
    { area: "Engagement", value: metrics.totalCompleted > 0 ? Math.min(Math.round((metrics.totalCompleted / Math.max(metrics.totalTrainings, 1)) * 100), 100) : 0 },
  ];

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <NotificationsProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border shadow-sm z-30 sticky top-0">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground mr-2 md:hidden">
                  <Menu className="h-6 w-6" />
                </button>
                <div className="flex-shrink-0 flex items-center">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-white font-bold text-sm">FU</span>
                  </div>
                  <span className="ml-2 text-xl font-semibold text-foreground hidden md:block">USKILL</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <AcademicYearSelector showLabel={false} />
                <ThemeToggle />
                <HeaderNotifications />
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar overlay */}
          {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

          {/* Sidebar */}
          <aside className={`
            bg-card flex-shrink-0 border-r border-border
            fixed md:sticky inset-y-0 left-0 z-50 md:z-auto
            transform transition-all duration-200 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            ${sidebarCollapsed ? "w-16" : "w-64"}
            h-screen md:h-[calc(100vh-4rem)] overflow-y-auto
          `}>
            <div className="flex flex-col h-full pt-5 pb-4">
              <div className="flex items-center justify-between px-4 md:hidden">
                <span className="text-lg font-semibold text-foreground">Menu</span>
                <button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <div className="hidden md:flex justify-end px-2 mb-2">
                <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </button>
              </div>
              <nav className="mt-2 flex-1 flex flex-col px-2 space-y-1">
                <button className={`group flex items-center ${sidebarCollapsed ? "justify-center px-2" : "px-3"} py-2 text-sm font-medium rounded-md bg-primary/10 text-primary w-full text-left`}>
                  <Home className={`flex-shrink-0 h-5 w-5 text-primary ${sidebarCollapsed ? "" : "mr-3"}`} />
                  {!sidebarCollapsed && "Department Overview"}
                </button>
              </nav>
              <div className="px-2 pt-4 pb-2 border-t border-border">
                {isAdmin && (
                  <button onClick={() => navigate("/admin")} className={`w-full text-muted-foreground hover:bg-muted hover:text-foreground group flex items-center ${sidebarCollapsed ? "justify-center px-2" : "px-3"} py-2 text-sm font-medium rounded-md`}>
                    <Shield className={`flex-shrink-0 h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`} />
                    {!sidebarCollapsed && "Admin Dashboard"}
                  </button>
                )}
                <button onClick={() => navigate("/dashboard")} className={`w-full text-muted-foreground hover:bg-muted hover:text-foreground group flex items-center ${sidebarCollapsed ? "justify-center px-2" : "px-3"} py-2 text-sm font-medium rounded-md`}>
                  <Activity className={`flex-shrink-0 h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`} />
                  {!sidebarCollapsed && "My Dashboard"}
                </button>
                <button onClick={() => navigate("/dashboard/settings")} className={`w-full text-muted-foreground hover:bg-muted hover:text-foreground group flex items-center ${sidebarCollapsed ? "justify-center px-2" : "px-3"} py-2 text-sm font-medium rounded-md`}>
                  <Settings className={`flex-shrink-0 h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`} />
                  {!sidebarCollapsed && "Settings"}
                </button>
                <button onClick={handleLogout} className={`w-full text-muted-foreground hover:bg-muted hover:text-foreground group flex items-center ${sidebarCollapsed ? "justify-center px-2" : "px-3"} py-2 text-sm font-medium rounded-md`}>
                  <LogOut className={`flex-shrink-0 h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`} />
                  {!sidebarCollapsed && "Sign out"}
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Department Overview</h1>
                <p className="text-muted-foreground">
                  {hodDepartment ? `${hodDepartment} Department` : "Loading department..."} · {selectedYear}
                </p>
              </div>
              <Badge variant="outline" className="text-sm px-3 py-1">
                <Award className="h-3.5 w-3.5 mr-1.5" />
                Head of Department
              </Badge>
            </div>

            {loadingData ? (
              <HodSkeleton />
            ) : !hodDepartment ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No department assigned to your profile. Please contact an administrator.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                  {statsCards.map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      className="bg-card overflow-hidden shadow-sm rounded-lg border border-border hover:shadow-lg transition-all duration-300"
                    >
                      <div className="p-5">
                        <div className="flex items-center">
                          <motion.div
                            className={`bg-gradient-to-br ${stat.color} rounded-md p-3`}
                            whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.4 } }}
                          >
                            <stat.icon className="h-6 w-6 text-white" />
                          </motion.div>
                          <div className="ml-5 w-0 flex-1">
                            <dt className="text-sm font-medium text-muted-foreground truncate">{stat.label}</dt>
                            <dd>
                              <AnimatedCounter value={stat.value} suffix={stat.suffix} className="text-lg font-semibold text-foreground" />
                            </dd>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Department Radar & Activity Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          Department Performance Radar
                        </CardTitle>
                        <CardDescription>Overview across key performance areas</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <RadarChart data={radarData}>
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis dataKey="area" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                            <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Activity className="h-5 w-5 text-primary" />
                          Activity Breakdown
                        </CardTitle>
                        <CardDescription>Completed activities by category</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {categoryBreakdown.length > 0 ? (
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={categoryBreakdown}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                              <Tooltip
                                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                              />
                              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                            No completed activities yet
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Training Participation Progress */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mb-8">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        Training Participation
                      </CardTitle>
                      <CardDescription>
                        {metrics.totalCompleted} of {metrics.totalTrainings} enrollments completed · {metrics.trainingParticipation}% faculty participating
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Faculty Participation Rate</span>
                            <span className="font-medium text-foreground">{metrics.trainingParticipation}%</span>
                          </div>
                          <Progress value={metrics.trainingParticipation} className="h-2.5" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Completion Rate</span>
                            <span className="font-medium text-foreground">
                              {metrics.totalTrainings > 0 ? Math.round((metrics.totalCompleted / metrics.totalTrainings) * 100) : 0}%
                            </span>
                          </div>
                          <Progress value={metrics.totalTrainings > 0 ? Math.round((metrics.totalCompleted / metrics.totalTrainings) * 100) : 0} className="h-2.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Department Alerts */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.57 }} className="mb-8">
                  <DepartmentAlerts department={hodDepartment} />
                </motion.div>

                {/* Faculty Rankings */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        Faculty Rankings
                      </CardTitle>
                      <CardDescription>
                        Ranked by composite score (Performance 40% + Feedback 40% + Training 20%)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {rankings.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No faculty data available for this department.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Rank</TableHead>
                              <TableHead>Faculty</TableHead>
                              <TableHead className="text-center">Trainings</TableHead>
                              <TableHead className="text-center">Feedback</TableHead>
                              <TableHead className="text-center">Score</TableHead>
                              <TableHead className="text-right">Badge</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rankings.map((faculty, idx) => (
                              <TableRow key={faculty.user_id}>
                                <TableCell>
                                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                    idx === 0 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                    idx === 1 ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" :
                                    idx === 2 ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" :
                                    "bg-muted text-muted-foreground"
                                  }`}>
                                    {idx + 1}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={faculty.avatar_url || undefined} />
                                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                        {getInitials(faculty.full_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{faculty.full_name}</p>
                                      {faculty.designation && (
                                        <p className="text-xs text-muted-foreground">{faculty.designation}</p>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="secondary" className="text-xs">{faculty.trainingsCompleted}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="text-sm text-foreground">{faculty.avgFeedback}/100</span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="text-sm font-semibold text-foreground">{faculty.compositeScore}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge className={`text-xs ${getPerformanceBadgeColor(faculty.compositeScore)}`}>
                                    {getPerformanceBadgeLabel(faculty.compositeScore)}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            )}
          </main>
        </div>
      </div>
    </NotificationsProvider>
  );
};

export default HodDashboard;
