import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, TrendingDown, Minus, MessageSquare, Users, BarChart3, Loader2 } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";

interface FacultyFeedbackSummary {
  facultyId: string;
  facultyName: string;
  department: string | null;
  avgRating: number;
  totalFeedback: number;
  trend: "improving" | "declining" | "stable";
  recentRatings: number[];
}

interface KeywordCount {
  word: string;
  count: number;
}

// Common stop words to filter out
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

const chartConfig = {
  rating: { label: "Avg Rating", color: "hsl(var(--primary))" },
};

const FeedbackAnalytics = () => {
  const [summaries, setSummaries] = useState<FacultyFeedbackSummary[]>([]);
  const [keywords, setKeywords] = useState<KeywordCount[]>([]);
  const [overallStats, setOverallStats] = useState({ avgRating: 0, totalFeedback: 0, totalFaculty: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbackData();
  }, []);

  const extractKeywords = (comments: string[]): KeywordCount[] => {
    const wordMap = new Map<string, number>();

    comments.forEach((comment) => {
      if (!comment) return;
      const words = comment
        .toLowerCase()
        .replace(/[^a-z\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

      words.forEach((word) => {
        wordMap.set(word, (wordMap.get(word) || 0) + 1);
      });
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
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);
    const avgFirst = firstHalf.reduce((s, r) => s + r.rating, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, r) => s + r.rating, 0) / secondHalf.length;
    const diff = avgSecond - avgFirst;
    if (diff > 0.3) return "improving";
    if (diff < -0.3) return "declining";
    return "stable";
  };

  const fetchFeedbackData = async () => {
    try {
      const { data: feedback, error } = await supabase
        .from("faculty_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, department");

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      const facultyMap = new Map<string, { ratings: { rating: number; created_at: string }[]; comments: string[] }>();

      const allComments: string[] = [];

      (feedback || []).forEach((fb: any) => {
        if (!facultyMap.has(fb.faculty_id)) {
          facultyMap.set(fb.faculty_id, { ratings: [], comments: [] });
        }
        const entry = facultyMap.get(fb.faculty_id)!;
        entry.ratings.push({ rating: fb.rating, created_at: fb.created_at });
        if (fb.comment) {
          entry.comments.push(fb.comment);
          allComments.push(fb.comment);
        }
      });

      const facultySummaries: FacultyFeedbackSummary[] = [];
      facultyMap.forEach((data, facultyId) => {
        const profile = profileMap.get(facultyId);
        const avg = data.ratings.reduce((s, r) => s + r.rating, 0) / data.ratings.length;
        facultySummaries.push({
          facultyId,
          facultyName: profile?.full_name || "Unknown",
          department: profile?.department || null,
          avgRating: Math.round(avg * 10) / 10,
          totalFeedback: data.ratings.length,
          trend: calculateTrend(data.ratings),
          recentRatings: data.ratings.slice(0, 5).map((r) => r.rating),
        });
      });

      facultySummaries.sort((a, b) => b.avgRating - a.avgRating);
      setSummaries(facultySummaries);
      setKeywords(extractKeywords(allComments));

      const totalFeedback = feedback?.length || 0;
      const avgRating = totalFeedback > 0
        ? Math.round((feedback!.reduce((s: number, f: any) => s + f.rating, 0) / totalFeedback) * 10) / 10
        : 0;
      setOverallStats({ avgRating, totalFeedback, totalFaculty: facultySummaries.length });
    } catch (err) {
      console.error("Error fetching feedback:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case "improving": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Improving</Badge>;
      case "declining": return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Declining</Badge>;
      default: return <Badge variant="secondary">Stable</Badge>;
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "hsl(142, 76%, 36%)";
    if (rating >= 3) return "hsl(48, 96%, 53%)";
    return "hsl(0, 84%, 60%)";
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${i < Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const chartData = summaries.slice(0, 10).map((s) => ({
    name: s.facultyName.split(" ")[0],
    rating: s.avgRating,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feedback Analytics</h1>
        <p className="text-muted-foreground">Ratings, trends, and insights from faculty feedback</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="bg-primary/10 rounded-lg p-3">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold text-foreground">{overallStats.avgRating || "—"}/5</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="bg-primary/10 rounded-lg p-3">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Feedback</p>
                <p className="text-2xl font-bold text-foreground">{overallStats.totalFeedback}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="bg-primary/10 rounded-lg p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faculty Reviewed</p>
                <p className="text-2xl font-bold text-foreground">{overallStats.totalFaculty}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rating Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Average Rating per Faculty
              </CardTitle>
              <CardDescription>Top 10 faculty by feedback volume</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis domain={[0, 5]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="rating" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={getRatingColor(entry.rating)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground text-center py-12">No feedback data yet</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Keywords Cloud */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Common Keywords
              </CardTitle>
              <CardDescription>Extracted from feedback comments</CardDescription>
            </CardHeader>
            <CardContent>
              {keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <Badge
                      key={kw.word}
                      variant="outline"
                      className="text-sm py-1 px-3"
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
                <p className="text-muted-foreground text-center py-8">No keywords extracted yet</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Faculty Rating Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardHeader>
            <CardTitle>Faculty Rating Details</CardTitle>
            <CardDescription>Individual faculty ratings and trends</CardDescription>
          </CardHeader>
          <CardContent>
            {summaries.length > 0 ? (
              <div className="space-y-3">
                {summaries.map((faculty) => (
                  <div
                    key={faculty.facultyId}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-foreground">{faculty.facultyName}</p>
                        <p className="text-xs text-muted-foreground">{faculty.department || "No department"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">{renderStars(faculty.avgRating)}</div>
                      <span className="text-sm font-semibold text-foreground w-10 text-right">{faculty.avgRating}</span>
                      <span className="text-xs text-muted-foreground w-16 text-right">{faculty.totalFeedback} reviews</span>
                      <div className="flex items-center gap-1.5 w-28 justify-end">
                        {getTrendIcon(faculty.trend)}
                        {getTrendBadge(faculty.trend)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No feedback data available</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default FeedbackAnalytics;
