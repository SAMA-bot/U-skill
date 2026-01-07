import { useState } from "react";
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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const sidebarItems = [
  { icon: Home, label: "Dashboard", active: true },
  { icon: ClipboardList, label: "Capacity Building" },
  { icon: BarChart3, label: "Performance Assessment" },
  { icon: Clock, label: "Training Schedule" },
  { icon: Star, label: "Motivation Tools" },
  { icon: Calendar, label: "My Calendar" },
];

const statsCards = [
  { label: "Capacity Score", value: "84/100", icon: ClipboardList },
  { label: "Performance Score", value: "78/100", icon: BarChart3 },
  { label: "Motivation Index", value: "82/100", icon: Star },
  { label: "Training Hours", value: "68h", icon: Clock },
];

const activities = [
  {
    title: "Innovative Teaching Methods Workshop",
    description: "Completed 4-hour intensive workshop on modern pedagogy techniques",
    time: "2 days ago",
    status: "Completed",
    statusColor: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    title: "Research Methodology Webinar",
    description: "Attended international webinar on advanced qualitative research methods",
    time: "1 week ago",
    status: "In Progress",
    statusColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    title: "Peer Review Session",
    description: "Participated in departmental peer teaching observation program",
    time: "2 weeks ago",
    status: "Completed",
    statusColor: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
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
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/auth/login");
  };

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
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-white font-bold text-xs">JS</span>
                </div>
                <span className="ml-2 text-foreground font-medium hidden md:inline">
                  Dr. John Smith
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
              {sidebarItems.map((item, index) => (
                <a
                  key={index}
                  href="#"
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${item.active 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  <item.icon className={`mr-3 flex-shrink-0 h-5 w-5 ${item.active ? "text-primary" : ""}`} />
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="px-2 pt-4 pb-2 border-t border-border">
              <a
                href="#"
                className="text-muted-foreground hover:bg-muted hover:text-foreground group flex items-center px-3 py-2 text-sm font-medium rounded-md"
              >
                <Settings className="mr-3 flex-shrink-0 h-5 w-5" />
                Settings
              </a>
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
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Faculty Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, Dr. John Smith! Here's your performance overview
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
                <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Performance Chart</p>
                    <p className="text-xs text-muted-foreground mt-1">Interactive chart coming soon</p>
                  </div>
                </div>
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
                <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Radar Chart</p>
                    <p className="text-xs text-muted-foreground mt-1">Interactive chart coming soon</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

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
                {activities.map((activity, index) => (
                  <div key={index} className="px-4 py-5 sm:px-6 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-md bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-primary">{activity.title}</h4>
                          <span className="text-xs text-muted-foreground">{activity.time}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activity.statusColor}`}>
                            {activity.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
        </main>
      </div>
    </div>
  );
};

export default FacultyDashboard;
