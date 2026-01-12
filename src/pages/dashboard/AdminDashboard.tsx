import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  { icon: Users, label: "Faculty Management", id: "faculty" },
  { icon: BarChart3, label: "Performance Reports", id: "reports" },
  { icon: Building2, label: "Departments", id: "departments" },
  { icon: Award, label: "Achievements", id: "achievements" },
  { icon: Activity, label: "Activity Logs", id: "logs" },
];

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  const statsCards = [
    { label: "Total Faculty", value: institutionStats.totalFaculty, icon: Users, color: "from-blue-500 to-blue-600" },
    { label: "Avg Performance", value: `${institutionStats.avgPerformance}%`, icon: BarChart3, color: "from-green-500 to-green-600" },
    { label: "Avg Capacity", value: `${institutionStats.avgCapacity}%`, icon: TrendingUp, color: "from-purple-500 to-purple-600" },
    { label: "Avg Motivation", value: `${institutionStats.avgMotivation}%`, icon: Award, color: "from-orange-500 to-orange-600" },
    { label: "Departments", value: institutionStats.totalDepartments, icon: Building2, color: "from-pink-500 to-pink-600" },
    { label: "Completed Trainings", value: institutionStats.completedTrainings, icon: GraduationCap, color: "from-teal-500 to-teal-600" },
  ];

  if (authLoading || roleLoading || loadingData) {
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
            bg-card w-64 flex-shrink-0 border-r border-border
            fixed md:sticky inset-y-0 left-0 z-50 md:z-auto
            transform transition-transform duration-200 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
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

            <nav className="mt-6 flex-1 flex flex-col px-2 space-y-1">
              {sidebarItems.map((item, index) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={index}
                    onClick={() => setActiveSection(item.id)}
                    className={`
                      group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left
                      ${isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }
                    `}
                  >
                    <item.icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="px-2 pt-4 pb-2 border-t border-border">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full text-muted-foreground hover:bg-muted hover:text-foreground group flex items-center px-3 py-2 text-sm font-medium rounded-md"
              >
                <ArrowLeft className="mr-3 flex-shrink-0 h-5 w-5" />
                Back to Faculty Dashboard
              </button>
              <button
                onClick={() => navigate('/dashboard/settings')}
                className="w-full text-muted-foreground hover:bg-muted hover:text-foreground group flex items-center px-3 py-2 text-sm font-medium rounded-md"
              >
                <Settings className="mr-3 flex-shrink-0 h-5 w-5" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-muted-foreground hover:bg-muted hover:text-foreground group flex items-center px-3 py-2 text-sm font-medium rounded-md"
              >
                <LogOut className="mr-3 flex-shrink-0 h-5 w-5" />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto focus:outline-none p-6">
          {activeSection === "roles" ? (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Role Management</h1>
                  <p className="text-muted-foreground">
                    Manage user roles and access permissions
                  </p>
                </div>
              </div>
              <RoleManagement />
            </>
          ) : (
            <>
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
                className="bg-card overflow-hidden shadow-sm rounded-lg border border-border hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`bg-gradient-to-br ${stat.color} rounded-md p-2`}>
                        <stat.icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="ml-3 w-0 flex-1">
                      <dt className="text-xs font-medium text-muted-foreground truncate">
                        {stat.label}
                      </dt>
                      <dd className="text-lg font-semibold text-foreground">
                        {stat.value}
                      </dd>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
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
                      <Badge className={getPerformanceColor(dept.avgPerformance)}>
                        {dept.avgPerformance}%
                      </Badge>
                    </div>
                  ))}
                  {departmentStats.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No department data available
                    </p>
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
                          <Badge className={getPerformanceColor(faculty.avgPerformance || 0)}>
                            {faculty.avgPerformance || 0}%
                          </Badge>
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
                      </TableRow>
                    ))}
                    {facultyList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No faculty data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card shadow-sm rounded-lg overflow-hidden border border-border"
          >
            <div className="px-4 py-5 sm:px-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">Quick Actions</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
                <Users className="h-6 w-6" />
                <span>Add Faculty</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
                <BarChart3 className="h-6 w-6" />
                <span>Bulk Assessment</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
                <GraduationCap className="h-6 w-6" />
                <span>Schedule Training</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
                <Award className="h-6 w-6" />
                <span>Award Recognition</span>
              </Button>
            </div>
          </motion.div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
