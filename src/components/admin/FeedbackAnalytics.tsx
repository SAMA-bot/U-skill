import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  Users,
  BarChart3,
  Loader2,
  Search,
  Building2,
  Crown,
  AlertTriangle,
  Award,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

interface FacultyFeedbackSummary {
  facultyId: string;
  facultyName: string;
  department: string | null;
  avatarUrl: string | null;
  avgRating: number;
  totalFeedback: number;
  trend: "improving" | "declining" | "stable";
  recentRatings: number[];
  monthlyData: { month: string; avg: number }[];
  categoryRatings: Record<string, { total: number; count: number }>;
}

interface DeptSummary {
  department: string;
  avgRating: number;
  totalFeedback: number;
  facultyCount: number;
  categories: Record<string, number>;
}

interface KeywordCount {
  word: string;
  count: number;
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "is", "was", "are", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "not", "no", "so", "if",
  "then", "than", "that", "this", "these", "those", "it", "its", "i",
  "me", "my", "we", "our", "you", "your", "he", "she", "his", "her",
  "they", "them", "their", "what", "which", "who", "whom", "how", "when",
  "where", "why", "all", "each", "every", "both", "few", "more", "most",
  "other", "some", "such", "very", "just", "also", "about", "up", "out",
  "from", "into", "over", "after", "before", "between", "under", "again",
  "further", "once", "here", "there", "any", "only", "own", "same", "too",
]);

const FeedbackAnalytics = () => {
  const [summaries, setSummaries] = useState<FacultyFeedbackSummary[]>([]);
  const [deptSummaries, setDeptSummaries] = useState<DeptSummary[]>([]);
  const [keywords, setKeywords] = useState<KeywordCount[]>([]);
  const [overallStats, setOverallStats] = useState({ avgRating: 0, totalFeedback: 0, totalFaculty: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  useEffect(() => {
    fetchFeedbackData();
  }, []);

  const extractKeywords = (comments: string[]): KeywordCount[] => {
    const wordMap = new Map<string, number>();
    comments.forEach((comment) => {
      if (!comment) return;
      comment
        .toLowerCase()
        .replace(/[^a-z\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
        .forEach((word) => wordMap.set(word, (wordMap.get(word) || 0) + 1));
    });
    return Array.from(wordMap.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  };

  const calculateTrend = (ratings: { rating: number; created_at: string }[]): "improving" | "declining" | "stable" => {
    if (ratings.length < 3) return "stable";
    const sorted = [...ratings].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const mid = Math.floor(sorted.length / 2);
    const avgFirst = sorted.slice(0, mid).reduce((s, r) => s + r.rating, 0) / mid;
    const avgSecond = sorted.slice(mid).reduce((s, r) => s + r.rating, 0) / (sorted.length - mid);
    const diff = avgSecond - avgFirst;
    if (diff > 0.3) return "improving";
    if (diff < -0.3) return "declining";
    return "stable";
  };

  const fetchFeedbackData = async () => {
    try {
      const [feedbackRes, profilesRes] = await Promise.all([
        supabase.from("faculty_feedback").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name, department, avatar_url"),
      ]);

      if (feedbackRes.error) throw feedbackRes.error;

      const profileMap = new Map(
        (profilesRes.data || []).map((p) => [p.user_id, p])
      );

      const facultyMap = new Map<
        string,
        { ratings: { rating: number; created_at: string; category: string }[]; comments: string[] }
      >();
      const allComments: string[] = [];

      for (const fb of feedbackRes.data || []) {
        if (!facultyMap.has(fb.faculty_id)) {
          facultyMap.set(fb.faculty_id, { ratings: [], comments: [] });
        }
        const entry = facultyMap.get(fb.faculty_id)!;
        entry.ratings.push({ rating: fb.rating, created_at: fb.created_at, category: fb.category });
        if (fb.comment) {
          entry.comments.push(fb.comment);
          allComments.push(fb.comment);
        }
      }

      // Build faculty summaries
      const facultySummaries: FacultyFeedbackSummary[] = [];
      facultyMap.forEach((data, facultyId) => {
        const profile = profileMap.get(facultyId);
        const avg = data.ratings.reduce((s, r) => s + r.rating, 0) / data.ratings.length;

        // Monthly aggregation
        const monthMap = new Map<string, { total: number; count: number }>();
        for (const r of data.ratings) {
          const m = format(new Date(r.created_at), "MMM yyyy");
          if (!monthMap.has(m)) monthMap.set(m, { total: 0, count: 0 });
          const e = monthMap.get(m)!;
          e.total += r.rating;
          e.count += 1;
        }
        const monthlyData = Array.from(monthMap.entries())
          .map(([month, val]) => ({ month, avg: Math.round((val.total / val.count) * 10) / 10 }))
          .reverse();

        // Category aggregation
        const categoryRatings: Record<string, { total: number; count: number }> = {};
        for (const r of data.ratings) {
          if (!categoryRatings[r.category]) categoryRatings[r.category] = { total: 0, count: 0 };
          categoryRatings[r.category].total += r.rating;
          categoryRatings[r.category].count += 1;
        }

        facultySummaries.push({
          facultyId,
          facultyName: profile?.full_name || "Unknown",
          department: profile?.department || null,
          avatarUrl: profile?.avatar_url || null,
          avgRating: Math.round(avg * 10) / 10,
          totalFeedback: data.ratings.length,
          trend: calculateTrend(data.ratings),
          recentRatings: data.ratings.slice(0, 5).map((r) => r.rating),
          monthlyData,
          categoryRatings,
        });
      });

      facultySummaries.sort((a, b) => b.avgRating - a.avgRating);
      setSummaries(facultySummaries);
      setKeywords(extractKeywords(allComments));

      // Department summaries
      const deptMap = new Map<string, { ratings: number[]; facultyIds: Set<string>; categories: Record<string, { total: number; count: number }> }>();
      for (const fs of facultySummaries) {
        const dept = fs.department || "Unassigned";
        if (!deptMap.has(dept)) deptMap.set(dept, { ratings: [], facultyIds: new Set(), categories: {} });
        const d = deptMap.get(dept)!;
        d.facultyIds.add(fs.facultyId);
        // Add all individual ratings
        for (let i = 0; i < fs.totalFeedback; i++) {
          d.ratings.push(fs.avgRating); // approximate
        }
        for (const [cat, val] of Object.entries(fs.categoryRatings)) {
          if (!d.categories[cat]) d.categories[cat] = { total: 0, count: 0 };
          d.categories[cat].total += val.total;
          d.categories[cat].count += val.count;
        }
      }

      const deptArr: DeptSummary[] = Array.from(deptMap.entries()).map(([dept, data]) => ({
        department: dept,
        avgRating: data.ratings.length > 0
          ? Math.round((data.ratings.reduce((s, r) => s + r, 0) / data.ratings.length) * 10) / 10
          : 0,
        totalFeedback: data.ratings.length,
        facultyCount: data.facultyIds.size,
        categories: Object.fromEntries(
          Object.entries(data.categories).map(([cat, val]) => [cat, Math.round((val.total / val.count) * 10) / 10])
        ),
      }));
      deptArr.sort((a, b) => b.avgRating - a.avgRating);
      setDeptSummaries(deptArr);

      const totalFeedback = feedbackRes.data?.length || 0;
      const avgRating = totalFeedback > 0
        ? Math.round((feedbackRes.data!.reduce((s, f) => s + f.rating, 0) / totalFeedback) * 10) / 10
        : 0;
      setOverallStats({ avgRating, totalFeedback, totalFaculty: facultySummaries.length });
    } catch (err) {
      console.error("Error fetching feedback:", err);
    } finally {
      setLoading(false);
    }
  };

  const departments = useMemo(() => {
    const set = new Set(summaries.map((s) => s.department || "Unassigned"));
    return Array.from(set).sort();
  }, [summaries]);

  const filteredSummaries = useMemo(() => {
    let list = summaries;
    if (deptFilter !== "all") {
      list = list.filter((s) => (s.department || "Unassigned") === deptFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) => s.facultyName.toLowerCase().includes(q) || (s.department || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [summaries, deptFilter, searchQuery]);

  const topFaculty = summaries.length > 0 ? summaries[0] : null;
  const bottomFaculty = summaries.length > 0 ? summaries[summaries.length - 1] : null;

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "bg-success/10 text-success dark:bg-success/30 dark:text-success";
    if (rating >= 3) return "bg-warning/10 text-warning dark:bg-warning/30 dark:text-warning";
    if (rating > 0) return "bg-destructive/10 text-destructive dark:bg-destructive/30 dark:text-destructive";
    return "bg-muted text-muted-foreground";
  };

  const getRatingBarColor = (rating: number) => {
    if (rating >= 4) return "hsl(var(--chart-3))";
    if (rating >= 3) return "hsl(var(--chart-4))";
    return "hsl(var(--chart-2))";
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return <TrendingUp className="h-4 w-4 text-success" />;
    if (trend === "declining") return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendBadge = (trend: string) => {
    if (trend === "improving") return <Badge className="bg-success/10 text-success dark:bg-success/30 dark:text-success text-xs">Improving</Badge>;
    if (trend === "declining") return <Badge className="bg-destructive/10 text-destructive dark:bg-destructive/30 dark:text-destructive text-xs">Declining</Badge>;
    return <Badge variant="secondary" className="text-xs">Stable</Badge>;
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${i < Math.round(rating) ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
      />
    ));

  // Trend chart data — aggregate monthly across all faculty
  const trendChartData = useMemo(() => {
    const monthMap = new Map<string, { total: number; count: number }>();
    for (const s of summaries) {
      for (const md of s.monthlyData) {
        if (!monthMap.has(md.month)) monthMap.set(md.month, { total: 0, count: 0 });
        const e = monthMap.get(md.month)!;
        e.total += md.avg;
        e.count += 1;
      }
    }
    return Array.from(monthMap.entries())
      .map(([month, val]) => ({ month, avg: Math.round((val.total / val.count) * 10) / 10 }))
      .slice(-12);
  }, [summaries]);

  // Dept comparison chart
  const deptBarData = deptSummaries.map((d) => ({
    name: d.department.length > 14 ? d.department.slice(0, 14) + "…" : d.department,
    Rating: d.avgRating,
    Faculty: d.facultyCount,
  }));

  // Dept radar chart (categories)
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    deptSummaries.forEach((d) => Object.keys(d.categories).forEach((c) => cats.add(c)));
    return Array.from(cats);
  }, [deptSummaries]);

  const deptRadarData = allCategories.map((cat) => {
    const entry: Record<string, any> = { category: cat.charAt(0).toUpperCase() + cat.slice(1) };
    deptSummaries.slice(0, 4).forEach((d) => {
      entry[d.department] = d.categories[cat] || 0;
    });
    return entry;
  });

  const radarColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-ink" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feedback Analytics</h1>
        <p className="text-muted-foreground">Ratings, trends, and department-wise comparison from faculty feedback</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Average Rating", value: `${overallStats.avgRating || "—"}/5`, icon: Star, color: "from-accent-ink to-accent-ink" },
          { label: "Total Feedback", value: overallStats.totalFeedback, icon: MessageSquare, color: "from-primary-ink to-primary-ink" },
          { label: "Faculty Reviewed", value: overallStats.totalFaculty, icon: Users, color: "from-primary-ink to-primary-ink" },
          { label: "Departments", value: departments.length, icon: Building2, color: "from-accent-ink to-accent-ink" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`bg-gradient-to-br ${stat.color} rounded-md p-2`}>
                  <stat.icon className="h-5 w-5 text-gradient-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Highlight Cards: Top & Bottom */}
      {summaries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topFaculty && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-success/40 dark:border-success/50">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-success/10 dark:bg-success/30 flex items-center justify-center">
                    <Crown className="h-6 w-6 text-success dark:text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Highest Rated Faculty</p>
                    <p className="font-semibold text-foreground">{topFaculty.facultyName}</p>
                    <p className="text-xs text-muted-foreground">{topFaculty.department || "Unassigned"}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">{renderStars(topFaculty.avgRating)}</div>
                    <p className="text-lg font-bold text-foreground mt-0.5">{topFaculty.avgRating}/5</p>
                    <p className="text-xs text-muted-foreground">{topFaculty.totalFeedback} reviews</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          {bottomFaculty && summaries.length > 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border-destructive/40 dark:border-destructive/50">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-destructive/10 dark:bg-destructive/30 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-destructive dark:text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Lowest Rated Faculty</p>
                    <p className="font-semibold text-foreground">{bottomFaculty.facultyName}</p>
                    <p className="text-xs text-muted-foreground">{bottomFaculty.department || "Unassigned"}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">{renderStars(bottomFaculty.avgRating)}</div>
                    <p className="text-lg font-bold text-foreground mt-0.5">{bottomFaculty.avgRating}/5</p>
                    <p className="text-xs text-muted-foreground">{bottomFaculty.totalFeedback} reviews</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      <Tabs defaultValue="faculty" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="faculty">Faculty Ratings</TabsTrigger>
          <TabsTrigger value="departments">Department Comparison</TabsTrigger>
          <TabsTrigger value="trends">Trends Over Time</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
        </TabsList>

        {/* Faculty Ratings Tab */}
        <TabsContent value="faculty" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search faculty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary-ink" />
                  Average Rating per Faculty
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredSummaries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredSummaries.slice(0, 10).map((s) => ({ name: s.facultyName.split(" ")[0], rating: s.avgRating }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--chart-label))" }} />
                      <YAxis domain={[0, 5]} tick={{ fill: "hsl(var(--chart-label))" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Bar dataKey="rating" radius={[4, 4, 0, 0]}>
                        {filteredSummaries.slice(0, 10).map((s, i) => (
                          <Cell key={i} fill={getRatingBarColor(s.avgRating)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-12">No feedback data</p>
                )}
              </CardContent>
            </Card>

            {/* Faculty Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rankings</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[340px] overflow-y-auto">
                  {filteredSummaries.map((faculty, i) => (
                    <div
                      key={faculty.facultyId}
                      className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs text-muted-foreground w-5 font-medium">#{i + 1}</span>
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={faculty.avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary-ink to-accent-ink text-gradient-foreground text-[10px]">
                          {getInitials(faculty.facultyName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{faculty.facultyName}</p>
                        <p className="text-[10px] text-muted-foreground">{faculty.totalFeedback} reviews</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge className={`text-xs ${getRatingColor(faculty.avgRating)}`}>
                          {faculty.avgRating}
                        </Badge>
                        {getTrendIcon(faculty.trend)}
                      </div>
                    </div>
                  ))}
                  {filteredSummaries.length === 0 && (
                    <p className="text-muted-foreground text-center py-8 text-sm">No data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Faculty Rating Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Faculty</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead className="text-center">Reviews</TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaries.map((f) => (
                    <TableRow key={f.facultyId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={f.avatarUrl || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary-ink to-accent-ink text-gradient-foreground text-xs">
                              {getInitials(f.facultyName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{f.facultyName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{f.department || "Unassigned"}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {renderStars(f.avgRating)}
                          <span className="ml-1 font-semibold text-foreground text-sm">{f.avgRating}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{f.totalFeedback}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {getTrendIcon(f.trend)}
                          {getTrendBadge(f.trend)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSummaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No feedback data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Department Comparison Tab */}
        <TabsContent value="departments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dept Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary-ink" />
                  Department Average Ratings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deptBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={deptBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--chart-label))" }} />
                      <YAxis domain={[0, 5]} tick={{ fill: "hsl(var(--chart-label))" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Rating" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-12">No department data</p>
                )}
              </CardContent>
            </Card>

            {/* Dept Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary-ink" />
                  Category Breakdown by Department
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deptRadarData.length > 0 && deptSummaries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={deptRadarData}>
                      <PolarGrid stroke="hsl(var(--chart-grid))" />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "hsl(var(--chart-label))" }} />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                      {deptSummaries.slice(0, 4).map((d, i) => (
                        <Radar
                          key={d.department}
                          name={d.department}
                          dataKey={d.department}
                          stroke={radarColors[i]}
                          fill={radarColors[i]}
                          fillOpacity={0.15}
                        />
                      ))}
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-12">No category data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dept Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Department Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Avg Rating</TableHead>
                    <TableHead className="text-center">Total Feedback</TableHead>
                    <TableHead className="text-center">Faculty Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptSummaries.map((d, i) => (
                    <TableRow key={d.department}>
                      <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                      <TableCell className="font-medium text-foreground">{d.department}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={getRatingColor(d.avgRating)}>{d.avgRating}/5</Badge>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{d.totalFeedback}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{d.facultyCount}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {deptSummaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No department data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary-ink" />
                Overall Feedback Rating Trend
              </CardTitle>
              <CardDescription>Average rating across all faculty over time</CardDescription>
            </CardHeader>
            <CardContent>
              {trendChartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--chart-label))" }} />
                    <YAxis domain={[0, 5]} tick={{ fill: "hsl(var(--chart-label))" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avg"
                      name="Avg Rating"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-1))", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-12">
                  Not enough data to show trends. Need feedback across multiple months.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Per-department trend comparison */}
          {deptSummaries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trend Summary by Faculty</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-success/10 dark:bg-success/10 border border-success/40 dark:border-success/30">
                    <TrendingUp className="h-6 w-6 text-success mx-auto mb-1" />
                    <p className="text-2xl font-bold text-foreground">
                      {summaries.filter((s) => s.trend === "improving").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Improving</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50 border border-border">
                    <Minus className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-2xl font-bold text-foreground">
                      {summaries.filter((s) => s.trend === "stable").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Stable</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-destructive/10 dark:bg-destructive/10 border border-destructive/40 dark:border-destructive/30">
                    <TrendingDown className="h-6 w-6 text-destructive mx-auto mb-1" />
                    <p className="text-2xl font-bold text-foreground">
                      {summaries.filter((s) => s.trend === "declining").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Declining</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary-ink" />
                Common Keywords from Feedback
              </CardTitle>
              <CardDescription>Extracted from all feedback comments</CardDescription>
            </CardHeader>
            <CardContent>
              {keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <Badge
                      key={kw.word}
                      variant="outline"
                      className="text-sm py-1.5 px-3"
                      style={{
                        fontSize: `${Math.min(0.75 + kw.count * 0.05, 1.1)}rem`,
                        opacity: Math.min(0.5 + kw.count * 0.1, 1),
                      }}
                    >
                      {kw.word}
                      <span className="ml-1 text-muted-foreground">({kw.count})</span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">No keywords extracted — add feedback with comments to see insights</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeedbackAnalytics;
