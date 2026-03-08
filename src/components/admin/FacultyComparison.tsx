import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, X, Search, Loader2, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

interface FacultyProfile {
  user_id: string;
  full_name: string;
  email: string;
  department: string | null;
  avatar_url: string | null;
}

interface FacultyMetrics {
  profile: FacultyProfile;
  teaching: number;
  research: number;
  service: number;
  overall: number;
  activitiesCompleted: number;
  coursesCompleted: number;
  badgesEarned: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(220, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 60%, 55%)",
];

const FacultyComparison = () => {
  const [allFaculty, setAllFaculty] = useState<FacultyProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<FacultyMetrics[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, department, avatar_url")
      .order("full_name");
    if (data) setAllFaculty(data);
    setLoading(false);
  };

  const filteredFaculty = useMemo(() => {
    if (!searchQuery.trim()) return allFaculty;
    const q = searchQuery.toLowerCase();
    return allFaculty.filter(
      (f) =>
        f.full_name.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q) ||
        (f.department || "").toLowerCase().includes(q)
    );
  }, [allFaculty, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const runComparison = async () => {
    if (selectedIds.length < 2) return;
    setComparing(true);

    const results: FacultyMetrics[] = [];

    for (const uid of selectedIds) {
      const profile = allFaculty.find((f) => f.user_id === uid)!;

      const [perfRes, actRes, enrollRes, badgeRes] = await Promise.all([
        supabase
          .from("performance_metrics")
          .select("teaching_score, research_score, service_score")
          .eq("user_id", uid),
        supabase
          .from("activities")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .eq("status", "completed"),
        supabase
          .from("course_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .eq("status", "completed"),
        supabase
          .from("achievement_badges")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid),
      ]);

      let teaching = 0,
        research = 0,
        service = 0;
      const perf = perfRes.data || [];
      if (perf.length > 0) {
        teaching = Math.round(perf.reduce((s, p) => s + (p.teaching_score || 0), 0) / perf.length);
        research = Math.round(perf.reduce((s, p) => s + (p.research_score || 0), 0) / perf.length);
        service = Math.round(perf.reduce((s, p) => s + (p.service_score || 0), 0) / perf.length);
      }
      const overall = Math.round((teaching + research + service) / 3);

      results.push({
        profile,
        teaching,
        research,
        service,
        overall,
        activitiesCompleted: actRes.count || 0,
        coursesCompleted: enrollRes.count || 0,
        badgesEarned: badgeRes.count || 0,
      });
    }

    setComparisonData(results);
    setComparing(false);
  };

  const barChartData = useMemo(() => {
    return [
      { metric: "Teaching", ...Object.fromEntries(comparisonData.map((d) => [d.profile.full_name, d.teaching])) },
      { metric: "Research", ...Object.fromEntries(comparisonData.map((d) => [d.profile.full_name, d.research])) },
      { metric: "Service", ...Object.fromEntries(comparisonData.map((d) => [d.profile.full_name, d.service])) },
      { metric: "Overall", ...Object.fromEntries(comparisonData.map((d) => [d.profile.full_name, d.overall])) },
    ];
  }, [comparisonData]);

  const radarChartData = useMemo(() => {
    return [
      { subject: "Teaching", ...Object.fromEntries(comparisonData.map((d) => [d.profile.full_name, d.teaching])), fullMark: 100 },
      { subject: "Research", ...Object.fromEntries(comparisonData.map((d) => [d.profile.full_name, d.research])), fullMark: 100 },
      { subject: "Service", ...Object.fromEntries(comparisonData.map((d) => [d.profile.full_name, d.service])), fullMark: 100 },
      { subject: "Activities", ...Object.fromEntries(comparisonData.map((d) => [d.profile.full_name, Math.min(d.activitiesCompleted * 10, 100)])), fullMark: 100 },
      { subject: "Courses", ...Object.fromEntries(comparisonData.map((d) => [d.profile.full_name, Math.min(d.coursesCompleted * 20, 100)])), fullMark: 100 },
    ];
  }, [comparisonData]);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Faculty Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Select Faculty to Compare
          </CardTitle>
          <CardDescription>Choose 2–5 faculty members for side-by-side comparison</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected chips */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedIds.map((id) => {
                const f = allFaculty.find((x) => x.user_id === id);
                if (!f) return null;
                return (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1.5 py-1.5 px-3">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={f.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{getInitials(f.full_name)}</AvatarFallback>
                    </Avatar>
                    {f.full_name}
                    <button onClick={() => toggleSelect(id)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search faculty by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Faculty list */}
          <div className="max-h-56 overflow-y-auto border border-border rounded-lg divide-y divide-border">
            {filteredFaculty.map((f) => {
              const isSelected = selectedIds.includes(f.user_id);
              return (
                <button
                  key={f.user_id}
                  onClick={() => toggleSelect(f.user_id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${
                    isSelected ? "bg-primary/5" : ""
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={f.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{getInitials(f.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{f.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {f.department || "No department"} · {f.email}
                    </p>
                  </div>
                  {isSelected && (
                    <Badge variant="default" className="text-xs">
                      Selected
                    </Badge>
                  )}
                </button>
              );
            })}
            {filteredFaculty.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No faculty found</p>
            )}
          </div>

          <Button onClick={runComparison} disabled={selectedIds.length < 2 || comparing} className="w-full sm:w-auto">
            {comparing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
            Compare {selectedIds.length} Faculty
          </Button>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparisonData.length >= 2 && (
        <>
          {/* Summary Table */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Metric</th>
                        {comparisonData.map((d, i) => (
                          <th key={d.profile.user_id} className="text-center py-2 px-3 font-medium text-foreground">
                            <div className="flex flex-col items-center gap-1">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={d.profile.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">{getInitials(d.profile.full_name)}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs truncate max-w-[100px]">{d.profile.full_name}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Teaching", key: "teaching" as const },
                        { label: "Research", key: "research" as const },
                        { label: "Service", key: "service" as const },
                        { label: "Overall Score", key: "overall" as const },
                        { label: "Activities Done", key: "activitiesCompleted" as const },
                        { label: "Courses Done", key: "coursesCompleted" as const },
                        { label: "Badges Earned", key: "badgesEarned" as const },
                      ].map((row) => {
                        const values = comparisonData.map((d) => d[row.key]);
                        const maxVal = Math.max(...values);
                        return (
                          <tr key={row.key} className="border-b border-border last:border-0">
                            <td className="py-2.5 pr-4 text-muted-foreground">{row.label}</td>
                            {comparisonData.map((d) => {
                              const val = d[row.key];
                              const isMax = val === maxVal && val > 0;
                              return (
                                <td key={d.profile.user_id} className="text-center py-2.5 px-3">
                                  <span className={`font-semibold ${isMax ? "text-primary" : "text-foreground"}`}>
                                    {val}
                                    {["teaching", "research", "service", "overall"].includes(row.key) ? "%" : ""}
                                  </span>
                                  {isMax && val > 0 && (
                                    <span className="ml-1 text-xs text-primary">★</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Score Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Legend />
                      {comparisonData.map((d, i) => (
                        <Bar key={d.profile.user_id} dataKey={d.profile.full_name} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Skill Radar</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarChartData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      {comparisonData.map((d, i) => (
                        <Radar
                          key={d.profile.user_id}
                          name={d.profile.full_name}
                          dataKey={d.profile.full_name}
                          stroke={COLORS[i % COLORS.length]}
                          fill={COLORS[i % COLORS.length]}
                          fillOpacity={0.15}
                        />
                      ))}
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
};

export default FacultyComparison;
