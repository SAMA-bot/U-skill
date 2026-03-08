import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMultipleRealtimeData } from "@/hooks/useRealtimeData";
import { useToast } from "@/hooks/use-toast";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Trophy, Medal, Download, Loader2, TrendingUp, Building2, BarChart3, FileText,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, LineChart, Line,
} from "recharts";
import AcademicYearSelector from "@/components/AcademicYearSelector";
import jsPDF from "jspdf";

const TRAINING_TARGET = 10;
const PUBLICATION_TARGET = 5;

interface FacultyScore {
  user_id: string;
  full_name: string;
  email: string;
  department: string;
  avatar_url: string | null;
  trainingScore: number;
  feedbackScore: number;
  publicationScore: number;
  compositeScore: number;
  badge: string;
  trainingsCount: number;
  publicationsCount: number;
}

interface DeptData {
  department: string;
  avgScore: number;
  avgTeaching: number;
  avgResearch: number;
  avgService: number;
  facultyCount: number;
}

interface YearData {
  year: string;
  avgTeaching: number;
  avgResearch: number;
  avgService: number;
  avgComposite: number;
}

export default function PerformanceReports() {
  const [scores, setScores] = useState<FacultyScore[]>([]);
  const [deptData, setDeptData] = useState<DeptData[]>([]);
  const [yearData, setYearData] = useState<YearData[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const { selectedYear } = useAcademicYear();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchAllCb = useCallback(() => { fetchAll(); }, [selectedYear]);

  useEffect(() => {
    fetchAll();
  }, [selectedYear]);

  // Realtime subscriptions for live updates
  useMultipleRealtimeData([
    { table: "performance_metrics", onChange: fetchAllCb },
    { table: "activities", onChange: fetchAllCb },
    { table: "course_enrollments", onChange: fetchAllCb },
    { table: "profiles", onChange: fetchAllCb },
  ]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, department, avatar_url");

      const userIds = (profiles || []).map((p) => p.user_id);
      if (userIds.length === 0) { setLoading(false); return; }

      const [enrollRes, actTrainRes, actPubRes, perfRes] = await Promise.all([
        supabase.from("course_enrollments").select("user_id").eq("status", "completed").in("user_id", userIds),
        supabase.from("activities").select("user_id").eq("status", "completed").in("activity_type", ["workshop", "seminar", "conference", "training"]).in("user_id", userIds),
        supabase.from("activities").select("user_id").eq("status", "completed").in("activity_type", ["publication", "research"]).in("user_id", userIds),
        supabase.from("performance_metrics").select("user_id, teaching_score, research_score, service_score, month, year").in("user_id", userIds),
      ]);

      // Build maps
      const trainMap = new Map<string, number>();
      [...(enrollRes.data || []), ...(actTrainRes.data || [])].forEach((r) => {
        trainMap.set(r.user_id, (trainMap.get(r.user_id) || 0) + 1);
      });
      const pubMap = new Map<string, number>();
      (actPubRes.data || []).forEach((r) => {
        pubMap.set(r.user_id, (pubMap.get(r.user_id) || 0) + 1);
      });
      const fbMap = new Map<string, { total: number; count: number }>();
      (perfRes.data || []).forEach((r) => {
        const e = fbMap.get(r.user_id) || { total: 0, count: 0 };
        e.total += r.teaching_score || 0;
        e.count += 1;
        fbMap.set(r.user_id, e);
      });

      const facultyScores: FacultyScore[] = (profiles || []).map((p) => {
        const tc = trainMap.get(p.user_id) || 0;
        const ts = Math.min(Math.round((tc / TRAINING_TARGET) * 100), 100);
        const fb = fbMap.get(p.user_id);
        const fs = fb && fb.count > 0 ? Math.round(fb.total / fb.count) : 0;
        const pc = pubMap.get(p.user_id) || 0;
        const ps = Math.min(Math.round((pc / PUBLICATION_TARGET) * 100), 100);
        const composite = Math.round(ts * 0.3 + fs * 0.4 + ps * 0.3);
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          department: p.department || "Unassigned",
          avatar_url: p.avatar_url,
          trainingScore: ts,
          feedbackScore: fs,
          publicationScore: ps,
          compositeScore: composite,
          badge: composite >= 80 ? "Excellent" : composite >= 60 ? "Good" : "Needs Improvement",
          trainingsCount: tc,
          publicationsCount: pc,
        };
      }).sort((a, b) => b.compositeScore - a.compositeScore);

      setScores(facultyScores);

      // Department data
      const deptMap = new Map<string, { scores: number[]; teaching: number[]; research: number[]; service: number[] }>();
      facultyScores.forEach((f) => {
        const d = deptMap.get(f.department) || { scores: [], teaching: [], research: [], service: [] };
        d.scores.push(f.compositeScore);
        d.teaching.push(f.feedbackScore);
        d.research.push(f.publicationScore);
        d.service.push(f.trainingScore);
        deptMap.set(f.department, d);
      });
      const depts: DeptData[] = Array.from(deptMap.entries()).map(([dept, d]) => ({
        department: dept.length > 15 ? dept.slice(0, 15) + "…" : dept,
        avgScore: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length),
        avgTeaching: Math.round(d.teaching.reduce((a, b) => a + b, 0) / d.teaching.length),
        avgResearch: Math.round(d.research.reduce((a, b) => a + b, 0) / d.research.length),
        avgService: Math.round(d.service.reduce((a, b) => a + b, 0) / d.service.length),
        facultyCount: d.scores.length,
      })).sort((a, b) => b.avgScore - a.avgScore);
      setDeptData(depts);

      // Year-wise from performance_metrics
      const yearMap = new Map<number, { t: number[]; r: number[]; s: number[] }>();
      (perfRes.data || []).forEach((m) => {
        const y = yearMap.get(m.year) || { t: [], r: [], s: [] };
        y.t.push(m.teaching_score || 0);
        y.r.push(m.research_score || 0);
        y.s.push(m.service_score || 0);
        yearMap.set(m.year, y);
      });
      const years: YearData[] = Array.from(yearMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([yr, d]) => ({
          year: `${yr}-${(yr + 1).toString().slice(-2)}`,
          avgTeaching: Math.round(d.t.reduce((a, b) => a + b, 0) / d.t.length),
          avgResearch: Math.round(d.r.reduce((a, b) => a + b, 0) / d.r.length),
          avgService: Math.round(d.s.reduce((a, b) => a + b, 0) / d.s.length),
          avgComposite: Math.round(
            (d.t.reduce((a, b) => a + b, 0) / d.t.length +
              d.r.reduce((a, b) => a + b, 0) / d.r.length +
              d.s.reduce((a, b) => a + b, 0) / d.s.length) / 3
          ),
        }));
      setYearData(years);
    } catch (err) {
      console.error("Error:", err);
      toast({ title: "Error", description: "Failed to load report data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getBadgeStyle = (badge: string) => {
    switch (badge) {
      case "Excellent": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "Good": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default: return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-amber-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
    return <span className="text-sm font-semibold text-muted-foreground w-5 text-center">{rank}</span>;
  };

  const departments = [...new Set(scores.map((s) => s.department))];
  const filteredScores = departmentFilter === "all"
    ? scores
    : scores.filter((s) => s.department === departmentFilter);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Performance Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Academic Year: ${selectedYear} | Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    // Leaderboard table
    doc.setFontSize(13);
    doc.text("Faculty Leaderboard", 14, 42);
    doc.setFontSize(9);

    let y = 50;
    doc.setFont("helvetica", "bold");
    doc.text("Rank", 14, y);
    doc.text("Name", 30, y);
    doc.text("Department", 90, y);
    doc.text("Score", 155, y);
    doc.text("Rating", 175, y);
    doc.setFont("helvetica", "normal");

    filteredScores.slice(0, 30).forEach((f, i) => {
      y += 7;
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(`${i + 1}`, 14, y);
      doc.text(f.full_name.slice(0, 30), 30, y);
      doc.text(f.department.slice(0, 25), 90, y);
      doc.text(`${f.compositeScore}`, 155, y);
      doc.text(f.badge, 175, y);
    });

    // Department summary
    y += 15;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.text("Department Summary", 14, y);
    y += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Department", 14, y);
    doc.text("Faculty", 90, y);
    doc.text("Avg Score", 115, y);
    doc.text("Teaching", 140, y);
    doc.text("Research", 165, y);
    doc.setFont("helvetica", "normal");

    deptData.forEach((d) => {
      y += 7;
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(d.department.slice(0, 30), 14, y);
      doc.text(`${d.facultyCount}`, 90, y);
      doc.text(`${d.avgScore}`, 115, y);
      doc.text(`${d.avgTeaching}`, 140, y);
      doc.text(`${d.avgResearch}`, 165, y);
    });

    doc.save(`performance-report-${selectedYear}.pdf`);
    toast({ title: "PDF Exported", description: "Report downloaded successfully" });
  };

  const exportCSV = () => {
    const headers = ["Rank", "Name", "Email", "Department", "Composite Score", "Training Score", "Feedback Score", "Publication Score", "Rating", "Trainings", "Publications"];
    const rows = filteredScores.map((f, i) => [
      i + 1, f.full_name, f.email, f.department, f.compositeScore,
      f.trainingScore, f.feedbackScore, f.publicationScore,
      f.badge, f.trainingsCount, f.publicationsCount,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-report-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV Exported", description: "Report downloaded successfully" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={reportRef}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Performance Reports</h1>
          <p className="text-muted-foreground">
            Faculty rankings, department comparisons, and trend analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AcademicYearSelector />
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button onClick={exportPDF} className="gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="leaderboard" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="leaderboard">
            <Trophy className="h-4 w-4 mr-1.5" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="departments">
            <Building2 className="h-4 w-4 mr-1.5" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            Year-wise
          </TabsTrigger>
        </TabsList>

        {/* Leaderboard */}
        <TabsContent value="leaderboard" className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredScores.length} faculty
            </span>
          </div>

          {/* Top 3 Podium */}
          {filteredScores.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[1, 0, 2].map((idx) => {
                const f = filteredScores[idx];
                if (!f) return null;
                const rank = idx + 1;
                const isFirst = idx === 0;
                return (
                  <div
                    key={f.user_id}
                    className={`bg-card border border-border rounded-lg p-4 text-center ${
                      isFirst ? "ring-2 ring-amber-400/50 order-2 md:-mt-4" : idx === 1 ? "order-1" : "order-3"
                    }`}
                  >
                    <div className="flex justify-center mb-2">
                      {getRankIcon(rank === 1 ? 2 : rank === 2 ? 1 : 3)}
                    </div>
                    <Avatar className="h-12 w-12 mx-auto mb-2">
                      <AvatarImage src={f.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(f.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-foreground text-sm">{f.full_name}</p>
                    <p className="text-xs text-muted-foreground mb-2">{f.department}</p>
                    <p className="text-2xl font-bold text-foreground">{f.compositeScore}</p>
                    <Badge className={`text-[10px] mt-1 ${getBadgeStyle(f.badge)}`}>{f.badge}</Badge>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Training</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Publications</TableHead>
                  <TableHead>Overall</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScores.map((f, i) => (
                  <TableRow key={f.user_id} className={i < 3 ? "bg-muted/20" : ""}>
                    <TableCell className="text-center">
                      {getRankIcon(i + 1)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={f.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(f.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm text-foreground">{f.full_name}</p>
                          <p className="text-xs text-muted-foreground">{f.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.department}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Progress value={f.trainingScore} className="h-1.5 w-12" />
                        <span className="text-xs">{f.trainingScore}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Progress value={f.feedbackScore} className="h-1.5 w-12" />
                        <span className="text-xs">{f.feedbackScore}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Progress value={f.publicationScore} className="h-1.5 w-12" />
                        <span className="text-xs">{f.publicationScore}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{f.compositeScore}</span>
                        <Badge className={`text-[10px] ${getBadgeStyle(f.badge)}`}>{f.badge}</Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Department Comparison */}
        <TabsContent value="departments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Average Score by Department
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="department" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar dataKey="avgScore" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Avg Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Department Skill Breakdown
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={deptData}>
                    <PolarGrid className="opacity-30" />
                    <PolarAngleAxis dataKey="department" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Teaching" dataKey="avgTeaching" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                    <Radar name="Research" dataKey="avgResearch" stroke="hsl(210, 70%, 50%)" fill="hsl(210, 70%, 50%)" fillOpacity={0.15} />
                    <Radar name="Service" dataKey="avgService" stroke="hsl(150, 60%, 45%)" fill="hsl(150, 60%, 45%)" fillOpacity={0.15} />
                    <Legend />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Department Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead>Teaching</TableHead>
                  <TableHead>Research</TableHead>
                  <TableHead>Service</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deptData.map((d) => (
                  <TableRow key={d.department}>
                    <TableCell className="font-medium text-foreground">{d.department}</TableCell>
                    <TableCell className="text-muted-foreground">{d.facultyCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={d.avgScore} className="h-1.5 w-16" />
                        <span className="font-semibold text-sm">{d.avgScore}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{d.avgTeaching}</TableCell>
                    <TableCell className="text-sm">{d.avgResearch}</TableCell>
                    <TableCell className="text-sm">{d.avgService}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Year-wise Analysis */}
        <TabsContent value="trends" className="space-y-6">
          {yearData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No year-wise data available yet</p>
            </div>
          ) : (
            <>
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Performance Trends Over Academic Years
                </h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="avgTeaching" name="Teaching" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="avgResearch" name="Research" stroke="hsl(210, 70%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="avgService" name="Service" stroke="hsl(150, 60%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="avgComposite" name="Composite" stroke="hsl(var(--foreground))" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Year comparison cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {yearData.map((y) => (
                  <div key={y.year} className="bg-card border border-border rounded-lg p-4 text-center">
                    <p className="text-sm font-medium text-muted-foreground mb-1">{y.year}</p>
                    <p className="text-3xl font-bold text-foreground">{y.avgComposite}</p>
                    <p className="text-xs text-muted-foreground mt-1">Avg Composite</p>
                    <div className="flex justify-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>T: {y.avgTeaching}</span>
                      <span>R: {y.avgResearch}</span>
                      <span>S: {y.avgService}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
