import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Home, 
  ClipboardList, 
  BarChart3, 
  Clock, 
  Star, 
  Calendar, 
  Settings, 
  LogOut,
  Bell,
  Menu,
  Download,
  FileText,
  X,
  TrendingUp,
  Loader2,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import CapacityRadarChart from "@/components/dashboard/CapacityRadarChart";
import MotivationTrendChart from "@/components/dashboard/MotivationTrendChart";
import CoursesViewer from "@/components/faculty/CoursesViewer";
import PerformanceAssessment from "@/components/faculty/PerformanceAssessment";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  full_name: string;
  department: string | null;
  designation: string | null;
  avatar_url: string | null;
}

type ActiveSection = "dashboard" | "courses" | "performance" | "training" | "motivation" | "calendar";

const sidebarItems: { icon: typeof Home; label: string; section: ActiveSection }[] = [
  { icon: Home, label: "Dashboard", section: "dashboard" },
  { icon: ClipboardList, label: "Capacity Building", section: "courses" },
  { icon: BarChart3, label: "Performance Assessment", section: "performance" },
  { icon: Clock, label: "Training Schedule", section: "training" },
  { icon: Star, label: "Motivation Tools", section: "motivation" },
  { icon: Calendar, label: "My Calendar", section: "calendar" },
];

const resources = [
  {
    title: "Effective Teaching Strategies for Higher Education",
    subtitle: "John E. Smith, 2022",
  },
  {
    title: "Digital Transformation in Education - Online Course",
    subtitle: "Coursera, 12 hours",
  },
  {
    title: "Research Publication Toolkit",
    subtitle: "University Research Center",
  },
  {
    title: "Faculty Development Network Membership",
    subtitle: "Annual Subscription",
  },
];

const FacultyDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>("dashboard");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [statsData, setStatsData] = useState({
    capacityScore: 0,
    performanceScore: 0,
    motivationIndex: 0,
    trainingHours: 0,
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/login');
    }
  }, [user, loading, navigate]);

  // Fetch user profile and data
  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, department, designation, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch activities
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (activitiesData) {
        setActivities(activitiesData);
      }

      // Fetch latest capacity skills average
      const { data: skillsData } = await supabase
        .from('capacity_skills')
        .select('current_level')
        .eq('user_id', user.id);

      if (skillsData && skillsData.length > 0) {
        const avgCapacity = Math.round(
          skillsData.reduce((sum, s) => sum + (s.current_level || 0), 0) / skillsData.length
        );
        setStatsData(prev => ({ ...prev, capacityScore: avgCapacity }));
      }

      // Fetch latest performance metrics
      const { data: perfData } = await supabase
        .from('performance_metrics')
        .select('teaching_score, research_score, service_score')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (perfData) {
        const avgPerf = Math.round(
          ((perfData.teaching_score || 0) + (perfData.research_score || 0) + (perfData.service_score || 0)) / 3
        );
        setStatsData(prev => ({ ...prev, performanceScore: avgPerf }));
      }

      // Fetch latest motivation score
      const { data: motivationData } = await supabase
        .from('motivation_scores')
        .select('motivation_index')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('week_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (motivationData) {
        setStatsData(prev => ({ ...prev, motivationIndex: motivationData.motivation_index || 0 }));
      }

      // Calculate training hours from completed activities
      const { data: completedActivities } = await supabase
        .from('activities')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (completedActivities) {
        // Assume 4 hours per completed activity
        setStatsData(prev => ({ ...prev, trainingHours: completedActivities.length * 4 }));
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoadingProfile(false);
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

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
  };

  const statsCards = [
    { label: "Capacity Score", value: `${statsData.capacityScore}/100`, icon: ClipboardList },
    { label: "Performance Score", value: `${statsData.performanceScore}/100`, icon: BarChart3 },
    { label: "Motivation Index", value: `${statsData.motivationIndex}/100`, icon: Star },
    { label: "Training Hours", value: `${statsData.trainingHours}h`, icon: Clock },
  ];

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = profile?.full_name || user?.email || 'Faculty Member';

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
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-white font-bold text-sm">FU</span>
                </div>
                <span className="ml-2 text-xl font-semibold text-foreground hidden md:block">
                  FUP Dashboard
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button className="bg-muted p-2 rounded-full text-muted-foreground hover:text-foreground focus:outline-none">
                <Bell className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-xs">{getInitials(displayName)}</span>
                  )}
                </div>
                <span className="ml-2 text-foreground font-medium hidden md:inline">
                  {displayName}
                </span>
              </div>
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
                const isActive = activeSection === item.section;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setActiveSection(item.section);
                      setSidebarOpen(false);
                    }}
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
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full text-muted-foreground hover:bg-muted hover:text-foreground group flex items-center px-3 py-2 text-sm font-medium rounded-md"
                >
                  <Shield className="mr-3 flex-shrink-0 h-5 w-5" />
                  Admin Dashboard
                </button>
              )}
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
          {activeSection === "courses" ? (
            <CoursesViewer />
          ) : activeSection === "performance" ? (
            <PerformanceAssessment />
          ) : activeSection === "dashboard" ? (
            <>
              {/* Page Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Faculty Dashboard</h1>
                  <p className="text-muted-foreground">
                    Welcome back, {displayName}! Here's your performance overview
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                {statsCards.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card overflow-hidden shadow-sm rounded-lg border border-border hover:shadow-md transition-shadow"
                  >
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="bg-gradient-to-br from-primary to-accent rounded-md p-3">
                            <stat.icon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dt className="text-sm font-medium text-muted-foreground truncate">
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

              {/* Charts Section */}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-8">
                {/* Performance Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-card shadow-sm rounded-lg overflow-hidden border border-border"
                >
                  <div className="px-4 py-5 sm:px-6 border-b border-border">
                    <h3 className="text-lg font-medium text-foreground">Performance Assessment</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your progress over the last 6 months
                    </p>
                  </div>
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span className="text-xs text-muted-foreground">Teaching</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-accent" />
                        <span className="text-xs text-muted-foreground">Research</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-xs text-muted-foreground">Service</span>
                      </div>
                    </div>
                    <PerformanceChart />
                  </div>
                </motion.div>

                {/* Capacity Building */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-card shadow-sm rounded-lg overflow-hidden border border-border"
                >
                  <div className="px-4 py-5 sm:px-6 border-b border-border">
                    <h3 className="text-lg font-medium text-foreground">Capacity Building Progress</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Skills acquired vs skills to develop
                    </p>
                  </div>
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span className="text-xs text-muted-foreground">Current</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-muted-foreground" style={{ opacity: 0.5 }} />
                        <span className="text-xs text-muted-foreground">Target</span>
                      </div>
                    </div>
                    <CapacityRadarChart />
                  </div>
                </motion.div>
              </div>

              {/* Motivation Trend Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="bg-card shadow-sm rounded-lg overflow-hidden border border-border mb-8"
              >
                <div className="px-4 py-5 sm:px-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Motivation Index Trends
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Weekly motivation and engagement scores
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span className="text-xs text-muted-foreground">Motivation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-accent" />
                        <span className="text-xs text-muted-foreground">Engagement</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <MotivationTrendChart />
                </div>
              </motion.div>

              {/* Activities and Resources */}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 mb-8">
                {/* Recent Activities */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-card shadow-sm rounded-lg overflow-hidden col-span-1 lg:col-span-2 border border-border"
                >
                  <div className="px-4 py-5 sm:px-6 border-b border-border">
                    <h3 className="text-lg font-medium text-foreground">Recent Activities</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your latest training and development activities
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    {activities.length > 0 ? (
                      activities.map((activity, index) => (
                        <div key={activity.id || index} className="px-4 py-5 sm:px-6 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className="h-12 w-12 rounded-md bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-primary" />
                              </div>
                            </div>
                            <div className="ml-4 flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-primary">{activity.title}</h4>
                                <span className="text-xs text-muted-foreground">{formatTimeAgo(activity.created_at)}</span>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">{activity.description || 'No description'}</p>
                              <div className="mt-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                                  {activity.status === 'in_progress' ? 'In Progress' : activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No activities yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Start your training journey to see activities here</p>
                      </div>
                    )}
                    <div className="px-4 py-5 sm:px-6">
                      <a
                        href="#"
                        className="block text-center px-4 py-2 border border-dashed border-border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                      >
                        View All Activities
                      </a>
                    </div>
                  </div>
                </motion.div>

                {/* Recommended Resources */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-card shadow-sm rounded-lg overflow-hidden border border-border"
                >
                  <div className="px-4 py-5 sm:px-6 border-b border-border">
                    <h3 className="text-lg font-medium text-foreground">Recommended Resources</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Based on your development goals
                    </p>
                  </div>
                  <div className="p-4">
                    <div className="space-y-4">
                      {resources.map((resource, index) => (
                        <div key={index} className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-md bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                              <FileText className="h-6 w-6 text-accent" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <h4 className="text-sm font-medium text-foreground">{resource.title}</h4>
                            <p className="mt-1 text-xs text-muted-foreground">{resource.subtitle}</p>
                            <div className="mt-2">
                              <a href="#" className="text-xs text-primary hover:underline">
                                View Resource →
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {sidebarItems.find(item => item.section === activeSection)?.label}
                </h2>
                <p className="text-muted-foreground">This section is coming soon.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default FacultyDashboard;
