import { useState, useEffect } from "react";
import { getPerformanceBadgeColor, getPerformanceBadgeLabel } from "@/lib/performanceUtils";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  BarChart3,
  TrendingUp,
  Award,
  Settings,
  LogOut,
  Bell,
  Menu,
  Download,
  FileText,
  X,
  Loader2,
  Building2,
  GraduationCap,
  Activity,
  ChevronRight,
  Shield,
  ArrowLeft,
  AlertTriangle,
  FolderCheck,
  Star,
  PanelLeftClose,
  PanelLeft,
  Trophy,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedCounter from "@/components/dashboard/AnimatedCounter";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeletons";
import MetricDetailSheet from "@/components/dashboard/MetricDetailSheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleManagement } from "@/components/admin/RoleManagement";
import RoleAccessMatrix from "@/components/admin/RoleAccessMatrix";
import RoleSummaryCards from "@/components/admin/RoleSummaryCards";
import { CourseManagement } from "@/components/admin/CourseManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FacultyManagement from "@/components/admin/FacultyManagement";
import AchievementManagement from "@/components/admin/AchievementManagement";
import PerformanceReports from "@/components/admin/PerformanceReports";
import AuditLogViewer from "@/components/admin/AuditLogViewer";
import PerformanceScoreCard from "@/components/dashboard/PerformanceScoreCard";
import { usePerformanceScore } from "@/hooks/usePerformanceScore";
import ActionItems from "@/components/admin/ActionItems";
import DocumentReview from "@/components/admin/DocumentReview";
import FeedbackAnalytics from "@/components/admin/FeedbackAnalytics";
import PendingApprovals from "@/components/admin/PendingApprovals";
import DepartmentManagement from "@/components/admin/DepartmentManagement";
import DepartmentLeaderboard from "@/components/admin/DepartmentLeaderboard";
import AcademicYearSelector from "@/components/AcademicYearSelector";
import InstitutionalOverview from "@/components/admin/InstitutionalOverview";
import FacultyComparison from "@/components/admin/FacultyComparison";
import PredictiveAnalytics from "@/components/admin/PredictiveAnalytics";
import PerformanceHeatmap from "@/components/admin/PerformanceHeatmap";
interface FacultyMember {
  user_id: string;
  full_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  avatar_url: string | null;
  avgPerformance?: number;
  avgCapacity?: number;
  latestMotivation?: number;
}

interface DepartmentStats {
  department: string;
  facultyCount: number;
  avgPerformance: number;
}

const sidebarItems = [
  { icon: Home, label: "Dashboard", id: "dashboard" },
  { icon: Shield, label: "Role Management", id: "roles" },
  { icon: GraduationCap, label: "Capacity Building", id: "courses" },
  { icon: FolderCheck, label: "Document Review", id: "documents" },
  { icon: Users, label: "Faculty Management", id: "faculty" },
  { icon: BarChart3, label: "Performance Reports", id: "reports" },
  { icon: Building2, label: "Departments", id: "departments" },
  { icon: Activity, label: "Audit Logs", id: "audit" },
  { icon: Star, label: "Feedback Analytics", id: "feedback" },
  { icon: Sparkles, label: "Predictive Analytics", id: "predictions" },
];

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [institutionStats, setInstitutionStats] = useState({
    totalFaculty: 0,
    avgPerformance: 0,
    avgCapacity: 0,
    avgMotivation: 0,
    totalDepartments: 0,
    completedTrainings: 0,
  });
  const [loadingData, setLoadingData] = useState(true);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const selectedFacultyScore = usePerformanceScore(selectedFacultyId || undefined);
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  // Redirect if not logged in or not admin
  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/auth/login');
      } else if (!isAdmin) {
        navigate('/dashboard');
        toast({
          title: "Access Denied",
          description: "You don't have permission to access the admin dashboard.",
          variant: "destructive",
        });
      }
    }
  }, [user, isAdmin, authLoading, roleLoading, navigate, toast]);

  // Fetch all data
  useEffect(() => {
    if (user && isAdmin) {
      fetchAllData();
    }
  }, [user, isAdmin]);

  const fetchAllData = async () => {
    try {
      // Fetch all faculty profiles (admin can see all via service role in edge function or RLS policy)
      // For now, we'll use a different approach - aggregate data from all tables
      
      // Get all profiles count and data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, department, designation, avatar_url');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      const facultyWithStats: FacultyMember[] = [];
      const departmentMap: Map<string, { count: number; totalPerf: number }> = new Map();

      // For each profile, get their stats
      for (const profile of profiles || []) {
        // Get performance metrics
        const { data: perfData } = await supabase
          .from('performance_metrics')
          .select('teaching_score, research_score, service_score')
          .eq('user_id', profile.user_id);

        // Get capacity skills
        const { data: skillsData } = await supabase
          .from('capacity_skills')
          .select('current_level')
          .eq('user_id', profile.user_id);

        // Get motivation scores
        const { data: motivationData } = await supabase
          .from('motivation_scores')
          .select('motivation_index')
          .eq('user_id', profile.user_id)
          .order('year', { ascending: false })
          .order('week_number', { ascending: false })
          .limit(1);

        // Calculate averages
        let avgPerformance = 0;
        if (perfData && perfData.length > 0) {
          const totalPerf = perfData.reduce((sum, p) => {
            return sum + ((p.teaching_score || 0) + (p.research_score || 0) + (p.service_score || 0)) / 3;
          }, 0);
          avgPerformance = Math.round(totalPerf / perfData.length);
        }

        let avgCapacity = 0;
        if (skillsData && skillsData.length > 0) {
          avgCapacity = Math.round(
            skillsData.reduce((sum, s) => sum + (s.current_level || 0), 0) / skillsData.length
          );
        }

        const latestMotivation = motivationData?.[0]?.motivation_index || 0;

        facultyWithStats.push({
          ...profile,
          avgPerformance,
          avgCapacity,
          latestMotivation,
        });

        // Aggregate by department
        const dept = profile.department || 'Unassigned';
        if (!departmentMap.has(dept)) {
          departmentMap.set(dept, { count: 0, totalPerf: 0 });
        }
        const current = departmentMap.get(dept)!;
        current.count += 1;
        current.totalPerf += avgPerformance;
        departmentMap.set(dept, current);
      }

      setFacultyList(facultyWithStats);

      // Calculate department stats
      const deptStats: DepartmentStats[] = [];
      departmentMap.forEach((value, key) => {
        deptStats.push({
          department: key,
          facultyCount: value.count,
          avgPerformance: Math.round(value.totalPerf / value.count) || 0,
        });
      });
      setDepartmentStats(deptStats.sort((a, b) => b.avgPerformance - a.avgPerformance));

      // Calculate institution-wide stats
      const totalFaculty = facultyWithStats.length;
      const avgPerformance = totalFaculty > 0
        ? Math.round(facultyWithStats.reduce((sum, f) => sum + (f.avgPerformance || 0), 0) / totalFaculty)
        : 0;
      const avgCapacity = totalFaculty > 0
        ? Math.round(facultyWithStats.reduce((sum, f) => sum + (f.avgCapacity || 0), 0) / totalFaculty)
        : 0;
      const avgMotivation = totalFaculty > 0
        ? Math.round(facultyWithStats.reduce((sum, f) => sum + (f.latestMotivation || 0), 0) / totalFaculty)
        : 0;

      // Get completed trainings count
      const { count: completedCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      setInstitutionStats({
        totalFaculty,
        avgPerformance,
        avgCapacity,
        avgMotivation,
        totalDepartments: departmentMap.size,
        completedTrainings: completedCount || 0,
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/auth/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPerformanceColor = (score: number) => getPerformanceBadgeColor(score);

  const statsCards = [
    { label: "Total Faculty", numValue: institutionStats.totalFaculty, suffix: "", icon: Users, color: "from-blue-500 to-blue-600", metricType: "total_faculty" as const },
    { label: "Avg Performance", numValue: institutionStats.avgPerformance, suffix: "%", icon: BarChart3, color: "from-green-500 to-green-600", metricType: "avg_performance" as const },
    { label: "Avg Capacity", numValue: institutionStats.avgCapacity, suffix: "%", icon: TrendingUp, color: "from-purple-500 to-purple-600", metricType: "avg_capacity" as const },
    { label: "Avg Motivation", numValue: institutionStats.avgMotivation, suffix: "%", icon: Award, color: "from-orange-500 to-orange-600", metricType: "avg_motivation" as const },
    { label: "Departments", numValue: institutionStats.totalDepartments, suffix: "", icon: Building2, color: "from-pink-500 to-pink-600", metricType: "departments" as const },
    { label: "Completed Trainings", numValue: institutionStats.completedTrainings, suffix: "", icon: GraduationCap, color: "from-teal-500 to-teal-600", metricType: "completed_trainings" as const },
  ];

  const [adminMetricSheetOpen, setAdminMetricSheetOpen] = useState(false);
  const [selectedAdminMetric, setSelectedAdminMetric] = useState<typeof statsCards[0] | null>(null);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm z-30 sticky top-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-muted-foreground hover:text-foreground focus:outline-none mr-2 md:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AD</span>
                </div>
                <span className="ml-2 text-xl font-semibold text-foreground hidden md:block">
                  Admin Dashboard
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <AcademicYearSelector showLabel={false} />
              <ThemeToggle />
              <button className="bg-muted p-2 rounded-full text-muted-foreground hover:text-foreground focus:outline-none">
                <Bell className="h-5 w-5" />
              </button>
              <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                Admin
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            bg-card flex-shrink-0 border-r border-border
            fixed md:sticky inset-y-0 left-0 z-50 md:z-auto
            transform transition-all duration-200 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            ${sidebarCollapsed ? "w-16" : "w-64"}
            h-screen md:h-[calc(100vh-4rem)] overflow-y-auto
          `}
        >
          <div className="flex flex-col h-full pt-5 pb-4">
            <div className="flex items-center justify-between px-4 md:hidden">
              <span className="text-lg font-semibold text-foreground">Menu</span>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Collapse toggle - desktop only */}
            <div className="hidden md:flex justify-end px-2 mb-2">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            </div>

            <nav className="mt-2 flex-1 flex flex-col px-2 space-y-1">
              {sidebarItems.map((item, index) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={index}
                    onClick={() => setActiveSection(item.id)}
                    className={`
                      group flex items-center ${sidebarCollapsed ? "justify-center px-2" : "px-3"} py-2 text-sm font-medium rounded-md transition-colors w-full text-left
                      ${isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }
                    `}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <item.icon className={`flex-shrink-0 h-5 w-5 ${isActive ? "text-primary" : ""} ${sidebarCollapsed ? "" : "mr-3"}`} />
                    {!sidebarCollapsed && item.label}
                  </button>
                );
              })}
            </nav>

            <div className="px-2 pt-4 pb-2 border-t border-border">
              <button
                onClick={() => navigate('/dashboard')}
                className={`w-full text-muted-foreground hover:bg-muted hover:text-foreground group flex items-center ${sidebarCollapsed ? "justify-center px-2" : "px-3"} py-2 text-sm font-medium rounded-md`}
                title={sidebarCollapsed ? "Back to Faculty Dashboard" : undefined}
              >
                <ArrowLeft className={`flex-shrink-0 h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`} />
                {!sidebarCollapsed && "Back to Faculty Dashboard"}
              </button>
              <button
                onClick={() => navigate('/dashboard/settings')}
                className={`w-full text-muted-foreground hover:bg-muted hover:text-foreground group flex items-center ${sidebarCollapsed ? "justify-center px-2" : "px-3"} py-2 text-sm font-medium rounded-md`}
                title={sidebarCollapsed ? "Settings" : undefined}
              >
                <Settings className={`flex-shrink-0 h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`} />
                {!sidebarCollapsed && "Settings"}
              </button>
              <button
                onClick={handleLogout}
                className={`w-full text-muted-foreground hover:bg-muted hover:text-foreground group flex items-center ${sidebarCollapsed ? "justify-center px-2" : "px-3"} py-2 text-sm font-medium rounded-md`}
                title={sidebarCollapsed ? "Sign out" : undefined}
              >
                <LogOut className={`flex-shrink-0 h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`} />
                {!sidebarCollapsed && "Sign out"}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto focus:outline-none p-6">
          {activeSection === "roles" ? (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Role Management</h1>
                  <p className="text-muted-foreground">
                    Manage user roles, permissions, and access control
                  </p>
                </div>
              </div>
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="overview">Role Overview</TabsTrigger>
                  <TabsTrigger value="users">User Assignments</TabsTrigger>
                  <TabsTrigger value="matrix">Access Matrix</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                  <RoleSummaryCards />
                </TabsContent>
                <TabsContent value="users">
                  <RoleManagement />
                </TabsContent>
                <TabsContent value="matrix">
                  <RoleAccessMatrix />
                </TabsContent>
              </Tabs>
            </>
          ) : activeSection === "courses" ? (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Capacity Building</h1>
                  <p className="text-muted-foreground">
                    Manage courses and training programs for faculty development
                  </p>
                </div>
              </div>
              <CourseManagement />
            </>
          ) : activeSection === "audit" ? (
            <AuditLogViewer />
          ) : activeSection === "documents" ? (
            <DocumentReview />
          ) : activeSection === "feedback" ? (
            <FeedbackAnalytics />
          ) : activeSection === "predictions" ? (
            <PredictiveAnalytics />
          ) : activeSection === "faculty" ? (
            <FacultyManagement />
          ) : activeSection === "reports" ? (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Performance Reports</h1>
                  <p className="text-muted-foreground">
                    Reports, achievements, and department leaderboards
                  </p>
                </div>
              </div>
              <Tabs defaultValue="reports" className="space-y-6">
                <TabsList className="bg-muted/50 flex-wrap">
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                  <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                  <TabsTrigger value="comparison">Faculty Comparison</TabsTrigger>
                  <TabsTrigger value="achievements">Achievements</TabsTrigger>
                  <TabsTrigger value="leaderboards">Leaderboards</TabsTrigger>
                </TabsList>
                <TabsContent value="reports">
                  <PerformanceReports />
                </TabsContent>
                <TabsContent value="heatmap">
                  <PerformanceHeatmap />
                </TabsContent>
                <TabsContent value="comparison">
                  <FacultyComparison />
                </TabsContent>
                <TabsContent value="achievements">
                  <AchievementManagement />
                </TabsContent>
                <TabsContent value="leaderboards">
                  <DepartmentLeaderboard />
                </TabsContent>
              </Tabs>
            </>
          ) : activeSection === "departments" ? (
            <DepartmentManagement />
          ) : (
            <>
          {loadingData ? <DashboardSkeleton statCount={6} /> : (<>
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Institution Overview</h1>
              <p className="text-muted-foreground">
                Aggregated performance metrics across all departments
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
              <Button size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
            {statsCards.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                onClick={() => { setSelectedAdminMetric(stat); setAdminMetricSheetOpen(true); }}
                className="bg-card overflow-hidden shadow-sm rounded-lg border border-border hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group"
              >
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <motion.div
                        className={`bg-gradient-to-br ${stat.color} rounded-md p-2 group-hover:scale-110 transition-transform`}
                        whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.4 } }}
                      >
                        <stat.icon className="h-5 w-5 text-white" />
                      </motion.div>
                    </div>
                    <div className="ml-3 w-0 flex-1">
                      <dt className="text-xs font-medium text-muted-foreground truncate">
                        {stat.label}
                      </dt>
                      <dd className="text-lg font-semibold text-foreground">
                        <AnimatedCounter
                          value={stat.numValue}
                          suffix={stat.suffix}
                        />
                      </dd>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Admin Metric Detail Sheet */}
          {selectedAdminMetric && (
            <MetricDetailSheet
              open={adminMetricSheetOpen}
              onOpenChange={setAdminMetricSheetOpen}
              metricType={selectedAdminMetric.metricType}
              metricLabel={selectedAdminMetric.label}
              metricValue={selectedAdminMetric.numValue}
              metricSuffix={selectedAdminMetric.suffix}
              metricIcon={selectedAdminMetric.icon}
              userId={user?.id}
              onNavigate={(section) => setActiveSection(section)}
            />
          )}

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="bg-card shadow-sm rounded-lg overflow-hidden border border-border hover:shadow-lg transition-all duration-300 mb-8"
          >
            <div className="px-4 py-4 sm:px-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-primary" />
                Quick Actions
              </h3>
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <motion.div whileHover={{ y: -3, transition: { duration: 0.2 } }}>
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex flex-col gap-2 hover:border-primary/50 hover:shadow-md transition-all duration-300"
                  onClick={() => setActiveSection("faculty")}
                >
                  <Users className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Add Faculty</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ y: -3, transition: { duration: 0.2 } }}>
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex flex-col gap-2 hover:border-primary/50 hover:shadow-md transition-all duration-300"
                  onClick={() => setActiveSection("courses")}
                >
                  <GraduationCap className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Create Training</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ y: -3, transition: { duration: 0.2 } }}>
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex flex-col gap-2 hover:border-primary/50 hover:shadow-md transition-all duration-300"
                  onClick={() => setActiveSection("documents")}
                >
                  <FolderCheck className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Review Documents</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ y: -3, transition: { duration: 0.2 } }}>
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex flex-col gap-2 hover:border-primary/50 hover:shadow-md transition-all duration-300"
                  onClick={() => setActiveSection("reports")}
                >
                  <FileText className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Performance Report</span>
                </Button>
              </motion.div>
            </div>
          </motion.div>
          {/* Approval Panel & Action Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="bg-card shadow-sm rounded-lg overflow-hidden border border-border hover:shadow-lg transition-all duration-300"
            >
              <div className="px-4 py-5 sm:px-6 border-b border-border">
                <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                  <FolderCheck className="h-5 w-5 text-primary" />
                  Document Approvals
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pending document reviews and verification status
                </p>
              </div>
              <div className="p-4 sm:p-6">
                <PendingApprovals />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => setActiveSection("documents")}
                >
                  Review Documents
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="bg-card shadow-sm rounded-lg overflow-hidden border border-border hover:shadow-lg transition-all duration-300"
            >
              <div className="px-4 py-5 sm:px-6 border-b border-border">
                <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Alerts &amp; Action Items
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Faculty members requiring attention
                </p>
              </div>
              <div className="p-4 sm:p-6 max-h-80 overflow-y-auto">
                <ActionItems />
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Department Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card shadow-sm rounded-lg overflow-hidden border border-border lg:col-span-1"
            >
              <div className="px-4 py-5 sm:px-6 border-b border-border">
                <h3 className="text-lg font-medium text-foreground">Department Rankings</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  By average performance score
                </p>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-4">
                  {departmentStats.slice(0, 5).map((dept, index) => (
                    <div key={dept.department} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-5">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{dept.department}</p>
                          <p className="text-xs text-muted-foreground">{dept.facultyCount} faculty</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">{dept.avgPerformance}%</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${getPerformanceColor(dept.avgPerformance)}`}>
                          {getPerformanceBadgeLabel(dept.avgPerformance)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {departmentStats.length === 0 && (
                    <div className="flex flex-col items-center py-8 text-center">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-3">
                        <Building2 className="h-7 w-7 text-primary" />
                      </div>
                      <p className="font-medium text-foreground mb-1">No departments yet</p>
                      <p className="text-xs text-muted-foreground max-w-[200px]">Add departments and assign faculty to see rankings here.</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => setActiveSection("departments")}>
                        Manage Departments
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Faculty Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card shadow-sm rounded-lg overflow-hidden border border-border lg:col-span-2"
            >
              <div className="px-4 py-5 sm:px-6 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-foreground">Faculty Performance</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All faculty members and their metrics
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="text-primary">
                  View All <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-center">Performance</TableHead>
                      <TableHead className="text-center">Capacity</TableHead>
                      <TableHead className="text-center">Motivation</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facultyList.slice(0, 5).map((faculty) => (
                      <TableRow key={faculty.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={faculty.avatar_url || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs">
                                {getInitials(faculty.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{faculty.full_name}</p>
                              <p className="text-xs text-muted-foreground">{faculty.designation || 'Faculty'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {faculty.department || 'Unassigned'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-1.5 justify-center">
                            <span className="font-medium text-foreground">{faculty.avgPerformance || 0}%</span>
                            <Badge className={`text-[10px] px-1.5 py-0 ${getPerformanceColor(faculty.avgPerformance || 0)}`}>
                              {getPerformanceBadgeLabel(faculty.avgPerformance || 0)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getPerformanceColor(faculty.avgCapacity || 0)}>
                            {faculty.avgCapacity || 0}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getPerformanceColor(faculty.latestMotivation || 0)}>
                            {faculty.latestMotivation || 0}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary text-xs"
                            onClick={() => setSelectedFacultyId(
                              selectedFacultyId === faculty.user_id ? null : faculty.user_id
                            )}
                          >
                            View Score
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {facultyList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No faculty data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Selected Faculty Score */}
              {selectedFacultyId && (
                <div className="p-4 border-t border-border">
                  <PerformanceScoreCard data={selectedFacultyScore} />
                </div>
              )}
            </motion.div>
          </div>
            </>)}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
