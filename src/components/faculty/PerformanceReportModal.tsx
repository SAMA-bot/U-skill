import { useRef } from "react";
import { motion } from "framer-motion";
import {
  X,
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

interface PerformanceReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReportData;
}

const getStrengths = (data: ReportData): string[] => {
  const strengths: string[] = [];
  if (data.capacityScore >= 70) strengths.push("Strong skill development with consistent capacity building efforts.");
  if (data.performanceScore >= 70) strengths.push("Excellent performance metrics across teaching, research, and service.");
  if (data.motivationIndex >= 70) strengths.push("High engagement and motivation levels showing dedication.");
  if (data.trainingsAttended >= 5) strengths.push(`Completed ${data.trainingsAttended} trainings, demonstrating commitment to professional growth.`);
  if (data.publications >= 3) strengths.push(`Published ${data.publications} research works, contributing to academic knowledge.`);
  if (data.studentFeedback >= 70) strengths.push("Positive student feedback reflecting effective teaching methods.");
  if (strengths.length === 0) strengths.push("Building foundational skills with room for significant growth.");
  return strengths;
};

const getImprovements = (data: ReportData): string[] => {
  const areas: string[] = [];
  if (data.capacityScore < 60) areas.push("Increase skill development through targeted capacity building programs.");
  if (data.performanceScore < 60) areas.push("Focus on improving teaching, research, or service scores.");
  if (data.motivationIndex < 60) areas.push("Boost engagement by maintaining daily activity streaks and journal reflections.");
  if (data.trainingsAttended < 3) areas.push("Attend more training programs and workshops to enhance competencies.");
  if (data.publications < 2) areas.push("Increase research output and aim for more publications.");
  if (data.studentFeedback < 60) areas.push("Seek student feedback to identify and improve teaching methodologies.");
  if (areas.length === 0) areas.push("Continue maintaining current performance levels and explore advanced opportunities.");
  return areas;
};

const getRecommendations = (data: ReportData): string[] => {
  const recs: string[] = [];
  if (data.trainingsAttended < 5) recs.push("Enroll in at least 2 additional training programs this semester.");
  if (data.publications < 3) recs.push("Collaborate with peers on research projects to increase publication output.");
  if (data.motivationIndex < 70) recs.push("Use the daily checklist and reflection journal to build consistent habits.");
  if (data.capacityScore < 70) recs.push("Focus on weaker skill areas identified in the Skill Growth chart.");
  if (data.studentFeedback < 70) recs.push("Adopt innovative teaching methods and gather mid-semester feedback.");
  recs.push("Set specific, measurable goals for the next academic quarter.");
  return recs.slice(0, 4);
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

  const strengths = getStrengths(data);
  const improvements = getImprovements(data);
  const recommendations = getRecommendations(data);

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

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Faculty Performance Report", pageWidth / 2, y, { align: "center" });
    y += 10;

    // Subtitle
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, pageWidth / 2, y, { align: "center" });
    y += 12;

    // Faculty info
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Faculty Information", 14, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Name: ${data.facultyName}`, 14, y); y += 6;
    doc.text(`Department: ${data.department || "Not specified"}`, 14, y); y += 6;
    doc.text(`Academic Year: ${data.academicYear}`, 14, y); y += 6;
    doc.text(`Overall Score: ${data.compositeScore}/100 (${data.badge})`, 14, y); y += 12;

    // Metrics
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Performance Metrics", 14, y); y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    metrics.forEach((m) => {
      const val = m.suffix ? `${m.value}${m.suffix}` : `${m.value}/100`;
      doc.text(`${m.label}: ${val}`, 14, y); y += 6;
    });
    y += 6;

    // Strengths
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Strengths", 14, y); y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    strengths.forEach((s) => {
      const lines = doc.splitTextToSize(`• ${s}`, pageWidth - 28);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 2;
    });
    y += 4;

    // Check page break
    if (y > 240) { doc.addPage(); y = 20; }

    // Areas for Improvement
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Areas for Improvement", 14, y); y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    improvements.forEach((s) => {
      const lines = doc.splitTextToSize(`• ${s}`, pageWidth - 28);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 2;
    });
    y += 4;

    if (y > 240) { doc.addPage(); y = 20; }

    // Recommendations
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Recommendations", 14, y); y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    recommendations.forEach((s) => {
      const lines = doc.splitTextToSize(`• ${s}`, pageWidth - 28);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 2;
    });

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

          {/* Strengths */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" style={{ color: "#22c55e" }} />
              Strengths
            </h4>
            <ul className="space-y-2">
              {strengths.map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
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
            </h4>
            <ul className="space-y-2">
              {improvements.map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <div className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "#f59e0b" }} />
                  {s}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" style={{ color: "#3b82f6" }} />
              Recommended Actions
            </h4>
            <ul className="space-y-2">
              {recommendations.map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <div className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "#3b82f6" }} />
                  {s}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              Report generated on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} • USKILL Faculty Performance System
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PerformanceReportModal;
