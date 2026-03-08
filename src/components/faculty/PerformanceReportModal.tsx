import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Award,
  BookOpen,
  BarChart3,
  MessageSquare,
  FileText,
  TrendingUp,
  Star,
  Clock,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Sparkles,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

export interface ReportData {
  facultyName: string;
  department: string | null;
  academicYear: string;
  capacityScore: number;
  performanceScore: number;
  motivationIndex: number;
  trainingHours: number;
  trainingsAttended: number;
  studentFeedback: number;
  publications: number;
  compositeScore: number;
  badge: string;
}

interface AIInsights {
  summary: string;
  strengths: string[];
  improvements: string[];
  trainingPaths: { title: string; reason: string }[];
}

interface PerformanceReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReportData;
}

// Static fallbacks
const getFallbackStrengths = (data: ReportData): string[] => {
  const s: string[] = [];
  if (data.capacityScore >= 70) s.push("Strong skill development with consistent capacity building efforts.");
  if (data.performanceScore >= 70) s.push("Excellent performance metrics across teaching, research, and service.");
  if (data.motivationIndex >= 70) s.push("High engagement and motivation levels showing dedication.");
  if (data.trainingsAttended >= 5) s.push(`Completed ${data.trainingsAttended} trainings, demonstrating commitment to growth.`);
  if (data.studentFeedback >= 70) s.push("Positive student feedback reflecting effective teaching methods.");
  if (s.length === 0) s.push("Building foundational skills with room for significant growth.");
  return s;
};

const getFallbackImprovements = (data: ReportData): string[] => {
  const a: string[] = [];
  if (data.capacityScore < 60) a.push("Increase skill development through targeted capacity building programs.");
  if (data.performanceScore < 60) a.push("Focus on improving teaching, research, or service scores.");
  if (data.motivationIndex < 60) a.push("Boost engagement by maintaining daily activity streaks.");
  if (data.trainingsAttended < 3) a.push("Attend more training programs and workshops.");
  if (data.publications < 2) a.push("Increase research output and aim for more publications.");
  if (a.length === 0) a.push("Continue maintaining current performance levels.");
  return a;
};

const getFallbackTrainingPaths = (data: ReportData): { title: string; reason: string }[] => {
  const paths: { title: string; reason: string }[] = [];
  if (data.capacityScore < 70) paths.push({ title: "Advanced Teaching Methods", reason: "Strengthen foundational teaching skills." });
  if (data.publications < 3) paths.push({ title: "Research Methodology Workshop", reason: "Boost research output and publication quality." });
  if (data.motivationIndex < 70) paths.push({ title: "Faculty Engagement Program", reason: "Improve daily engagement and consistency." });
  paths.push({ title: "Leadership & Mentoring", reason: "Develop leadership skills for career advancement." });
  return paths.slice(0, 4);
};

const getBadgeStyle = (badge: string): React.CSSProperties => {
  switch (badge) {
    case "Excellent":
      return { background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.4)" };
    case "Good":
      return { background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.4)" };
    default:
      return { background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" };
  }
};

const PerformanceReportModal = ({ open, onOpenChange, data }: PerformanceReportModalProps) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isAI, setIsAI] = useState(false);

  const strengths = isAI && aiInsights ? aiInsights.strengths : getFallbackStrengths(data);
  const improvements = isAI && aiInsights ? aiInsights.improvements : getFallbackImprovements(data);
  const trainingPaths = isAI && aiInsights ? aiInsights.trainingPaths : getFallbackTrainingPaths(data);
  const summary = isAI && aiInsights ? aiInsights.summary : null;

  const fetchAIInsights = useCallback(async () => {
    setAiLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("ai-report-insights", {
        body: {
          metrics: {
            facultyName: data.facultyName,
            department: data.department,
            academicYear: data.academicYear,
            capacityScore: data.capacityScore,
            performanceScore: data.performanceScore,
            motivationIndex: data.motivationIndex,
            trainingHours: data.trainingHours,
            trainingsAttended: data.trainingsAttended,
            studentFeedback: data.studentFeedback,
            publications: data.publications,
            compositeScore: data.compositeScore,
            badge: data.badge,
          },
        },
      });

      if (error || result?.fallback || !result?.insights) {
        setIsAI(false);
      } else {
        setAiInsights(result.insights);
        setIsAI(true);
      }
    } catch {
      setIsAI(false);
    } finally {
      setAiLoading(false);
    }
  }, [data]);

  useEffect(() => {
    if (open) {
      setAiInsights(null);
      setIsAI(false);
      fetchAIInsights();
    }
  }, [open, fetchAIInsights]);

  const metrics = [
    { label: "Capacity Score", value: data.capacityScore, icon: BarChart3 },
    { label: "Performance Score", value: data.performanceScore, icon: TrendingUp },
    { label: "Motivation Index", value: data.motivationIndex, icon: Star },
    { label: "Training Hours", value: data.trainingHours, suffix: "h", icon: Clock },
    { label: "Trainings Attended", value: data.trainingsAttended, icon: BookOpen },
    { label: "Student Feedback", value: data.studentFeedback, icon: MessageSquare },
    { label: "Publications", value: data.publications, icon: FileText },
  ];

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Faculty Performance Report", pageWidth / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, pageWidth / 2, y, { align: "center" });
    y += 12;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Faculty Information", 14, y); y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Name: ${data.facultyName}`, 14, y); y += 6;
    doc.text(`Department: ${data.department || "Not specified"}`, 14, y); y += 6;
    doc.text(`Academic Year: ${data.academicYear}`, 14, y); y += 6;
    doc.text(`Overall Score: ${data.compositeScore}/100 (${data.badge})`, 14, y); y += 12;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Performance Metrics", 14, y); y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    metrics.forEach((m) => {
      doc.text(`${m.label}: ${m.value}${m.suffix || "/100"}`, 14, y); y += 6;
    });
    y += 6;

    if (summary) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("AI Performance Summary", 14, y); y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const sumLines = doc.splitTextToSize(summary, pageWidth - 28);
      doc.text(sumLines, 14, y);
      y += sumLines.length * 5 + 6;
    }

    const addSection = (title: string, items: string[]) => {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(title, 14, y); y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      items.forEach((s) => {
        const lines = doc.splitTextToSize(`• ${s}`, pageWidth - 28);
        doc.text(lines, 14, y);
        y += lines.length * 5 + 2;
      });
      y += 4;
    };

    addSection("Strengths", strengths);
    addSection("Areas for Improvement", improvements);
    addSection("Suggested Training Paths", trainingPaths.map(t => `${t.title} — ${t.reason}`));

    doc.save(`Performance_Report_${data.facultyName.replace(/\s+/g, "_")}_${data.academicYear}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Award className="h-5 w-5 text-primary" />
              Faculty Performance Report
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </DialogHeader>

        <div ref={reportRef} className="space-y-6 mt-2">
          {/* Faculty Info Header */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{data.facultyName}</h3>
                <p className="text-sm text-muted-foreground">
                  {data.department || "Department not specified"} • Academic Year {data.academicYear}
                </p>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <div className="text-3xl font-bold text-foreground">{data.compositeScore}</div>
                  <div className="text-xs text-muted-foreground">Overall Score</div>
                </div>
                <Badge style={getBadgeStyle(data.badge)} className="border-0 text-sm px-3 py-1">
                  {data.badge}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Performance Metrics Grid */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Performance Breakdown
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {metrics.map((m) => {
                const isScore = !m.suffix;
                const pct = isScore ? m.value : Math.min((m.value / 100) * 100, 100);
                return (
                  <div key={m.label} className="bg-card border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{m.label}</span>
                    </div>
                    <div className="text-xl font-bold text-foreground">
                      {m.value}{m.suffix || <span className="text-sm font-normal text-muted-foreground">/100</span>}
                    </div>
                    {isScore && <Progress value={pct} className="h-1.5" />}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* AI Summary */}
          {aiLoading ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Generating AI insights…</p>
                <p className="text-xs text-muted-foreground">Analyzing your performance data</p>
              </div>
            </div>
          ) : summary ? (
            <div className="p-4 rounded-lg border border-border" style={{ background: "rgba(59,130,246,0.05)" }}>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Performance Summary
              </h4>
              <p className="text-sm text-foreground leading-relaxed">{summary}</p>
            </div>
          ) : null}

          {/* Strengths */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" style={{ color: "#22c55e" }} />
              Strengths
              {isAI && <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-1"><Sparkles className="h-2.5 w-2.5 mr-0.5" />AI</Badge>}
            </h4>
            <ul className="space-y-2">
              {strengths.map((s, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-2 text-sm text-foreground">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "#22c55e" }} />
                  {s}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Areas for Improvement */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" style={{ color: "#f59e0b" }} />
              Areas for Improvement
              {isAI && <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-1"><Sparkles className="h-2.5 w-2.5 mr-0.5" />AI</Badge>}
            </h4>
            <ul className="space-y-2">
              {improvements.map((s, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-2 text-sm text-foreground">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "#f59e0b" }} />
                  {s}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Training Paths */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4" style={{ color: "#8b5cf6" }} />
              Suggested Training Paths
              {isAI && <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-1"><Sparkles className="h-2.5 w-2.5 mr-0.5" />AI</Badge>}
            </h4>
            <div className="space-y-2">
              {trainingPaths.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
                >
                  <div className="mt-0.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: "#8b5cf6" }} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.reason}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              Report generated on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} • {isAI ? "Enhanced with AI" : "USKILL"} Faculty Performance System
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PerformanceReportModal;
