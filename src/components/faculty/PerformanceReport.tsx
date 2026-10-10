import { useState, useRef } from "react";
import {
  FileDown,
  Loader2,
  Calendar,
  BarChart3,
  Target,
  TrendingUp,
  Award,
  BookOpen,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PerformanceMetric {
  month: string;
  year: number;
  teaching_score: number;
  research_score: number;
  service_score: number;
}

interface CapacitySkill {
  skill_name: string;
  current_level: number;
  target_level: number;
}

interface PerformanceReportProps {
  profileName: string;
  department: string;
  performanceMetrics: PerformanceMetric[];
  skills: CapacitySkill[];
  overallScore: number;
  trend: "up" | "down" | "stable";
  trendPercentage: number;
}

const PerformanceReport = ({
  profileName,
  department,
  performanceMetrics,
  skills,
  overallScore,
  trend,
  trendPercentage,
}: PerformanceReportProps) => {
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const latestMetrics = performanceMetrics[performanceMetrics.length - 1];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getPerformanceLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Very Good";
    if (score >= 70) return "Good";
    if (score >= 60) return "Satisfactory";
    return "Needs Improvement";
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;

    setGenerating(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: getComputedStyle(reportRef.current).backgroundColor,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);

      const date = new Date().toISOString().split("T")[0];
      pdf.save(`performance-report-${date}.pdf`);

      toast({
        title: "📄 Report Generated",
        description: `Performance report saved as performance-report-${date}.pdf`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Report generation failed",
        description: "Could not generate the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const categoryData = latestMetrics
    ? [
        { name: "Teaching", score: latestMetrics.teaching_score, icon: BookOpen },
        { name: "Research", score: latestMetrics.research_score, icon: Target },
        { name: "Service", score: latestMetrics.service_score, icon: Users },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={generatePDF} disabled={generating}>
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          {generating ? "Generating..." : "Export as PDF"}
        </Button>
      </div>

      {/* Printable Report */}
      <div
        ref={reportRef}
        className="bg-card text-card-foreground p-8 rounded-lg shadow-lg"
        style={{ minHeight: "800px" }}
      >
        {/* Header */}
        <div className="border-b-2 border-border pb-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Performance Report</h1>
              <p className="text-muted-foreground mt-1">Faculty Development Assessment</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{new Date().toLocaleDateString("en-US", { 
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Faculty Info */}
        <div className="bg-muted rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Faculty Name</p>
              <p className="font-semibold text-foreground">{profileName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Department</p>
              <p className="font-semibold text-foreground">{department || "Not specified"}</p>
            </div>
          </div>
        </div>

        {/* Overall Score */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-primary-ink" />
            Overall Performance
          </h2>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full border-4 border-primary flex items-center justify-center">
              <span className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}
              </span>
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">
                {getPerformanceLabel(overallScore)}
              </p>
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                {trend === "up" ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-success">+{trendPercentage}% from last period</span>
                  </>
                ) : trend === "down" ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-destructive rotate-180" />
                    <span className="text-destructive">-{trendPercentage}% from last period</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">No change from last period</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary-ink" />
            Performance by Category
          </h2>
          <div className="space-y-4">
            {categoryData.map((category) => (
              <div key={category.name} className="flex items-center gap-4">
                <div className="w-24 flex items-center gap-2">
                  <category.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{category.name}</span>
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${category.score}%` }}
                    />
                  </div>
                </div>
                <span className={`font-semibold w-12 text-right ${getScoreColor(category.score)}`}>
                  {category.score}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Historical Trend */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-ink" />
            Performance History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Period</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Teaching</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Research</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Service</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Average</th>
                </tr>
              </thead>
              <tbody>
                {performanceMetrics.slice(-6).map((metric, index) => {
                  const avg = Math.round(
                    ((metric.teaching_score || 0) + (metric.research_score || 0) + (metric.service_score || 0)) / 3
                  );
                  return (
                    <tr key={index} className="border-b border-border">
                      <td className="py-2 px-2 text-foreground">
                        {metric.month} {metric.year}
                      </td>
                      <td className="py-2 px-2 text-right text-foreground">{metric.teaching_score}</td>
                      <td className="py-2 px-2 text-right text-foreground">{metric.research_score}</td>
                      <td className="py-2 px-2 text-right text-foreground">{metric.service_score}</td>
                      <td className={`py-2 px-2 text-right font-medium ${getScoreColor(avg)}`}>
                        {avg}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Skills Progress */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary-ink" />
            Skills Development
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {skills.map((skill) => {
              const progress = Math.round((skill.current_level / skill.target_level) * 100);
              return (
                <div key={skill.skill_name} className="bg-muted rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">{skill.skill_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {skill.current_level}/{skill.target_level}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-border pt-4 mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            This report was generated automatically by the Faculty Development Portal.
            <br />
            For questions or concerns, please contact your department administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceReport;
