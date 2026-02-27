import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarRange, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

interface YearSummary {
  year: string;
  teaching: number;
  research: number;
  service: number;
  average: number;
}

const YearWiseComparison = () => {
  const { user } = useAuth();
  const { academicYears } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<YearSummary[]>([]);

  useEffect(() => {
    if (user) fetchAllYears();
  }, [user]);

  const fetchAllYears = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("performance_metrics")
        .select("year, teaching_score, research_score, service_score")
        .eq("user_id", user.id)
        .order("year", { ascending: true });

      if (!data || data.length === 0) {
        setSummaries([]);
        return;
      }

      // Group by academic year
      const yearMap = new Map<string, { teaching: number[]; research: number[]; service: number[] }>();

      for (const ay of academicYears) {
        const startYear = parseInt(ay.value.split("-")[0]);
        const relevant = data.filter(
          (d) => d.year === startYear || d.year === startYear + 1
        );
        if (relevant.length > 0) {
          yearMap.set(ay.value, {
            teaching: relevant.map((r) => r.teaching_score || 0),
            research: relevant.map((r) => r.research_score || 0),
            service: relevant.map((r) => r.service_score || 0),
          });
        }
      }

      const results: YearSummary[] = [];
      yearMap.forEach((scores, year) => {
        const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
        const t = avg(scores.teaching);
        const r = avg(scores.research);
        const s = avg(scores.service);
        results.push({
          year,
          teaching: t,
          research: r,
          service: s,
          average: Math.round((t + r + s) / 3),
        });
      });

      setSummaries(results);
    } catch (err) {
      console.error("Error fetching year-wise data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const getTrendIcon = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (diff < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            Year-wise Performance Comparison
          </CardTitle>
          <CardDescription>Compare your performance across academic years</CardDescription>
        </CardHeader>
        <CardContent>
          {summaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data available across academic years yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summaries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend />
                <Bar dataKey="teaching" name="Teaching" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="research" name="Research" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="service" name="Service" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summaries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaries.map((s, idx) => (
            <motion.div
              key={s.year}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="h-full">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">{s.year}</span>
                    {idx > 0 && getTrendIcon(s.average, summaries[idx - 1].average)}
                  </div>
                  <div className="text-3xl font-bold text-primary mb-1">{s.average}</div>
                  <div className="text-xs text-muted-foreground">Average Score</div>
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Teaching</span>
                      <span className="font-medium text-foreground">{s.teaching}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Research</span>
                      <span className="font-medium text-foreground">{s.research}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service</span>
                      <span className="font-medium text-foreground">{s.service}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default YearWiseComparison;
