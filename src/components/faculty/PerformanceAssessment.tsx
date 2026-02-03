import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  BookOpen,
  Users,
  Briefcase,
  ChevronRight,
  Info,
  Loader2,
  Bell,
  FileDown,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMultipleRealtimeData } from "@/hooks/useRealtimeData";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import GoalSetting from "./GoalSetting";
import PerformanceReport from "./PerformanceReport";
import PeerComparison from "./PeerComparison";
import NotificationCenter from "./NotificationCenter";

interface PerformanceMetric {
  id: string;
  month: string;
  year: number;
  teaching_score: number;
  research_score: number;
  service_score: number;
}

interface CapacitySkill {
  id: string;
  skill_name: string;
  current_level: number;
  target_level: number;
}

interface Profile {
  full_name: string;
  department: string | null;
}

const PerformanceAssessment = () => {
  const [loading, setLoading] = useState(true);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [skills, setSkills] = useState<CapacitySkill[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [trend, setTrend] = useState<"up" | "down" | "stable">("stable");
  const [trendPercentage, setTrendPercentage] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedYear } = useAcademicYear();

  // Initial data fetch and refetch on academic year change
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedYear]);

  // Realtime subscriptions for performance data
  useMultipleRealtimeData([
    {
      table: "performance_metrics",
      userId: user?.id,
      onChange: () => {
        if (user) fetchData();
      },
    },
    {
      table: "capacity_skills",
      userId: user?.id,
      onChange: () => {
        if (user) fetchData();
      },
    },
    {
      table: "profiles",
      userId: user?.id,
      onChange: () => {
        if (user) fetchData();
      },
    },
  ]);

  const fetchData = async () => {
    if (!user) return;

    // Parse academic year to get the years (e.g., "2024-25" -> 2024, 2025)
    const academicStartYear = parseInt(selectedYear.split('-')[0]);

    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, department")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch performance metrics filtered by academic year
      const { data: perfData, error: perfError } = await supabase
        .from("performance_metrics")
        .select("*")
        .eq("user_id", user.id)
        .or(`year.eq.${academicStartYear},year.eq.${academicStartYear + 1}`)
        .order("year", { ascending: true })
        .order("month", { ascending: true });

      if (perfError) throw perfError;

      if (perfData && perfData.length > 0) {
        setPerformanceMetrics(perfData);

        // Calculate overall score from latest metrics
        const latest = perfData[perfData.length - 1];
        const avgScore = Math.round(
          ((latest.teaching_score || 0) +
            (latest.research_score || 0) +
            (latest.service_score || 0)) /
            3
        );
        setOverallScore(avgScore);

        // Calculate trend
        if (perfData.length >= 2) {
          const previous = perfData[perfData.length - 2];
          const prevAvg = Math.round(
            ((previous.teaching_score || 0) +
              (previous.research_score || 0) +
              (previous.service_score || 0)) /
              3
          );
          const change = avgScore - prevAvg;
          setTrendPercentage(Math.abs(change));
          setTrend(change > 0 ? "up" : change < 0 ? "down" : "stable");
        }
      }

      // Fetch capacity skills
      const { data: skillsData, error: skillsError } = await supabase
        .from("capacity_skills")
        .select("*")
        .eq("user_id", user.id);

      if (skillsError) throw skillsError;

      if (skillsData) {
        setSkills(skillsData);
      }
    } catch (error: any) {
      console.error("Error fetching performance data:", error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const getPerformanceLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Very Good";
    if (score >= 70) return "Good";
    if (score >= 60) return "Satisfactory";
    return "Needs Improvement";
  };

  // Transform data for charts
  const chartData = performanceMetrics.map((metric) => ({
    month: metric.month,
    teaching: metric.teaching_score,
    research: metric.research_score,
    service: metric.service_score,
    average: Math.round(
      ((metric.teaching_score || 0) +
        (metric.research_score || 0) +
        (metric.service_score || 0)) /
        3
    ),
  }));

  const latestMetrics = performanceMetrics[performanceMetrics.length - 1];

  const categoryData = latestMetrics
    ? [
        {
          name: "Teaching",
          score: latestMetrics.teaching_score,
          fill: "hsl(var(--primary))",
          icon: BookOpen,
        },
        {
          name: "Research",
          score: latestMetrics.research_score,
          fill: "hsl(var(--accent))",
          icon: Target,
        },
        {
          name: "Service",
          score: latestMetrics.service_score,
          fill: "#22c55e",
          icon: Users,
        },
      ]
    : [];

  const radialData = [
    {
      name: "Overall",
      value: overallScore,
      fill: "hsl(var(--primary))",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user has no performance data yet
  const hasNoData = performanceMetrics.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Performance Assessment</h2>
        <p className="text-muted-foreground mt-1">
          Track your progress and identify areas for improvement
        </p>
      </div>

      {hasNoData && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Welcome to Your Performance Dashboard</h3>
            <p className="text-muted-foreground max-w-md mb-4">
              Your performance metrics will appear here as you complete activities, courses, and receive assessments.
              Start by exploring the Capacity Building section to begin your professional development journey.
            </p>
            <Badge variant="secondary">Get started by completing your first activity</Badge>
          </CardContent>
        </Card>
      )}

      {!hasNoData && (
        <>
      {/* Overall Score Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1"
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Overall Performance
              </CardTitle>
              <CardDescription>Your current standing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative">
                  <ResponsiveContainer width={180} height={180}>
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="70%"
                      outerRadius="100%"
                      barSize={12}
                      data={radialData}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <RadialBar
                        background={{ fill: "hsl(var(--muted))" }}
                        dataKey="value"
                        cornerRadius={10}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
                      {overallScore}
                    </span>
                    <span className="text-sm text-muted-foreground">out of 100</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Badge variant={getBadgeVariant(overallScore)}>
                    {getPerformanceLabel(overallScore)}
                  </Badge>
                  {trend !== "stable" && (
                    <div
                      className={`flex items-center text-sm ${
                        trend === "up"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {trend === "up" ? (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      )}
                      {trendPercentage}%
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Performance by Category
              </CardTitle>
              <CardDescription>Breakdown of your scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 py-2">
                {categoryData.map((category, index) => (
                  <motion.div
                    key={category.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${category.fill}20` }}
                        >
                          <category.icon
                            className="h-4 w-4"
                            style={{ color: category.fill }}
                          />
                        </div>
                        <span className="font-medium text-foreground">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${getScoreColor(category.score)}`}>
                          {category.score}/100
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{getPerformanceLabel(category.score)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${category.score}%` }}
                        transition={{ duration: 1, delay: index * 0.2 }}
                        className="absolute h-full rounded-full"
                        style={{ backgroundColor: category.fill }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-6">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="peers">Peer Comparison</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-1" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Trends</CardTitle>
              <CardDescription>Your progress over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-xs text-muted-foreground">Teaching</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--accent))" }} />
                  <span className="text-xs text-muted-foreground">Research</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground">Service</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-xs text-muted-foreground">Average</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTeachingPerf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorResearchPerf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorServicePerf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    domain={[50, 100]}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="teaching"
                    stroke="hsl(var(--primary))"
                    fill="url(#colorTeachingPerf)"
                    strokeWidth={2}
                    name="Teaching"
                  />
                  <Area
                    type="monotone"
                    dataKey="research"
                    stroke="hsl(var(--accent))"
                    fill="url(#colorResearchPerf)"
                    strokeWidth={2}
                    name="Research"
                  />
                  <Area
                    type="monotone"
                    dataKey="service"
                    stroke="#22c55e"
                    fill="url(#colorServicePerf)"
                    strokeWidth={2}
                    name="Service"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Progress Tab */}
        <TabsContent value="skills" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Skills Development Progress</CardTitle>
              <CardDescription>Current level vs target level for each skill</CardDescription>
            </CardHeader>
            <CardContent>
              {skills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No skills data available
                </div>
              ) : (
                <div className="space-y-6">
                  {skills.map((skill, index) => {
                    const progress = Math.round(
                      (skill.current_level / skill.target_level) * 100
                    );
                    const gap = skill.target_level - skill.current_level;

                    return (
                      <motion.div
                        key={skill.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-lg border border-border bg-muted/20"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground">{skill.skill_name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              Current: <span className="font-medium text-foreground">{skill.current_level}</span>
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Target: <span className="font-medium text-primary">{skill.target_level}</span>
                            </span>
                          </div>
                        </div>
                        <div className="relative">
                          <Progress value={skill.current_level} className="h-3" />
                          <div
                            className="absolute top-0 h-3 border-r-2 border-dashed border-primary"
                            style={{ left: `${skill.target_level}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>{progress}% of target achieved</span>
                          <span
                            className={
                              gap <= 10
                                ? "text-green-600 dark:text-green-400"
                                : gap <= 25
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            {gap} points to reach target
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Peer Comparison Tab */}
        <TabsContent value="peers" className="mt-6">
          <PeerComparison />
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="mt-6">
          <GoalSetting />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6">
          <NotificationCenter />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileDown className="h-5 w-5 text-primary" />
                Performance Report
              </CardTitle>
              <CardDescription>
                Generate and export your performance report for review meetings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceReport
                profileName={profile?.full_name || "Faculty Member"}
                department={profile?.department || ""}
                performanceMetrics={performanceMetrics}
                skills={skills}
                overallScore={overallScore}
                trend={trend}
                trendPercentage={trendPercentage}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  );
};

export default PerformanceAssessment;
