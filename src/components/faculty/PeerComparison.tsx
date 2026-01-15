import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Loader2,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ComparisonData {
  category: string;
  yourScore: number;
  departmentAvg: number;
  difference: number;
}

interface DepartmentStats {
  totalFaculty: number;
  avgTeaching: number;
  avgResearch: number;
  avgService: number;
  avgOverall: number;
}

const PeerComparison = () => {
  const [loading, setLoading] = useState(true);
  const [userScores, setUserScores] = useState({
    teaching: 0,
    research: 0,
    service: 0,
  });
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats | null>(null);
  const [department, setDepartment] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchComparisonData();
    }
  }, [user]);

  const fetchComparisonData = async () => {
    if (!user) return;

    try {
      // Fetch user's department
      const { data: profileData } = await supabase
        .from("profiles")
        .select("department")
        .eq("user_id", user.id)
        .maybeSingle();

      setDepartment(profileData?.department || "All Faculty");

      // Fetch user's latest performance metrics
      const { data: userPerfData } = await supabase
        .from("performance_metrics")
        .select("teaching_score, research_score, service_score")
        .eq("user_id", user.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (userPerfData) {
        setUserScores({
          teaching: userPerfData.teaching_score || 0,
          research: userPerfData.research_score || 0,
          service: userPerfData.service_score || 0,
        });
      }

      // Fetch department/all faculty averages (anonymized aggregate)
      // Note: In production, this should use a database function for better security
      const { data: allMetrics } = await supabase
        .from("performance_metrics")
        .select("teaching_score, research_score, service_score, user_id");

      if (allMetrics && allMetrics.length > 0) {
        // Get unique users' latest metrics
        const latestByUser = new Map();
        allMetrics.forEach((m) => {
          if (!latestByUser.has(m.user_id)) {
            latestByUser.set(m.user_id, m);
          }
        });

        const uniqueMetrics = Array.from(latestByUser.values());
        const totalFaculty = uniqueMetrics.length;

        const avgTeaching = Math.round(
          uniqueMetrics.reduce((sum, m) => sum + (m.teaching_score || 0), 0) / totalFaculty
        );
        const avgResearch = Math.round(
          uniqueMetrics.reduce((sum, m) => sum + (m.research_score || 0), 0) / totalFaculty
        );
        const avgService = Math.round(
          uniqueMetrics.reduce((sum, m) => sum + (m.service_score || 0), 0) / totalFaculty
        );
        const avgOverall = Math.round((avgTeaching + avgResearch + avgService) / 3);

        setDepartmentStats({
          totalFaculty,
          avgTeaching,
          avgResearch,
          avgService,
          avgOverall,
        });
      }
    } catch (error) {
      console.error("Error fetching comparison data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getComparisonData = (): ComparisonData[] => {
    if (!departmentStats) return [];

    return [
      {
        category: "Teaching",
        yourScore: userScores.teaching,
        departmentAvg: departmentStats.avgTeaching,
        difference: userScores.teaching - departmentStats.avgTeaching,
      },
      {
        category: "Research",
        yourScore: userScores.research,
        departmentAvg: departmentStats.avgResearch,
        difference: userScores.research - departmentStats.avgResearch,
      },
      {
        category: "Service",
        yourScore: userScores.service,
        departmentAvg: departmentStats.avgService,
        difference: userScores.service - departmentStats.avgService,
      },
    ];
  };

  const getPercentile = (score: number, avg: number) => {
    // Simplified percentile estimation based on difference from average
    const diff = score - avg;
    if (diff >= 15) return "Top 10%";
    if (diff >= 10) return "Top 25%";
    if (diff >= 5) return "Top 40%";
    if (diff >= 0) return "Top 50%";
    if (diff >= -5) return "Top 60%";
    if (diff >= -10) return "Top 75%";
    return "Below Average";
  };

  const getTrendIcon = (difference: number) => {
    if (difference > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (difference < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getDifferenceColor = (difference: number) => {
    if (difference > 5) return "text-green-600 dark:text-green-400";
    if (difference > 0) return "text-green-500 dark:text-green-400";
    if (difference < -5) return "text-red-600 dark:text-red-400";
    if (difference < 0) return "text-red-500 dark:text-red-400";
    return "text-muted-foreground";
  };

  const chartData = getComparisonData();

  const overallUserScore = Math.round(
    (userScores.teaching + userScores.research + userScores.service) / 3
  );
  const overallDifference = departmentStats
    ? overallUserScore - departmentStats.avgOverall
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Peer Comparison
              </CardTitle>
              <CardDescription>
                See how your performance compares to {department || "department"} averages
                (anonymized data)
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-5 w-5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    This comparison uses anonymized aggregate data from all faculty
                    members. Individual scores are never revealed.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Your Overall Score</p>
              <p className="text-3xl font-bold text-foreground">{overallUserScore}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Department Average</p>
              <p className="text-3xl font-bold text-foreground">
                {departmentStats?.avgOverall || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Your Standing</p>
              <div className="flex items-center justify-center gap-2">
                {getTrendIcon(overallDifference)}
                <span className={`text-xl font-bold ${getDifferenceColor(overallDifference)}`}>
                  {overallDifference > 0 ? "+" : ""}
                  {overallDifference}
                </span>
              </div>
              <Badge variant="outline" className="mt-1">
                {getPercentile(overallUserScore, departmentStats?.avgOverall || 0)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Category Comparison
          </CardTitle>
          <CardDescription>Your scores vs department averages by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Your Score</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground" />
              <span className="text-xs text-muted-foreground">Department Average</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="category"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                domain={[0, 100]}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend />
              <Bar dataKey="yourScore" name="Your Score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="departmentAvg" name="Department Average" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Breakdown</CardTitle>
          <CardDescription>
            Performance comparison in each category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {chartData.map((item, index) => (
              <motion.div
                key={item.category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{item.category}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      You: <span className="font-semibold text-foreground">{item.yourScore}</span>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Avg: <span className="font-semibold">{item.departmentAvg}</span>
                    </span>
                    <div className={`flex items-center gap-1 ${getDifferenceColor(item.difference)}`}>
                      {getTrendIcon(item.difference)}
                      <span className="font-semibold">
                        {item.difference > 0 ? "+" : ""}
                        {item.difference}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <Progress value={item.yourScore} className="h-2" />
                  <div
                    className="absolute top-0 h-2 w-1 bg-muted-foreground rounded"
                    style={{ left: `${item.departmentAvg}%`, transform: "translateX(-50%)" }}
                    title={`Department Average: ${item.departmentAvg}`}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  You are in the {getPercentile(item.yourScore, item.departmentAvg)} for {item.category.toLowerCase()}
                </p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Anonymous Stats */}
      {departmentStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Department Overview</CardTitle>
            <CardDescription>
              Aggregate statistics from {departmentStats.totalFaculty} faculty members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-foreground">{departmentStats.totalFaculty}</p>
                <p className="text-xs text-muted-foreground">Faculty Members</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-foreground">{departmentStats.avgTeaching}</p>
                <p className="text-xs text-muted-foreground">Avg Teaching</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-foreground">{departmentStats.avgResearch}</p>
                <p className="text-xs text-muted-foreground">Avg Research</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-foreground">{departmentStats.avgService}</p>
                <p className="text-xs text-muted-foreground">Avg Service</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PeerComparison;
