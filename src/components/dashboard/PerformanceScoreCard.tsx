import { motion } from "framer-motion";
import { Award, BookOpen, MessageSquare, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PerformanceScoreData } from "@/hooks/usePerformanceScore";

interface PerformanceScoreCardProps {
  data: PerformanceScoreData;
  compact?: boolean;
}

const badgeInlineStyle = (badge: PerformanceScoreData["badge"]): React.CSSProperties => {
  switch (badge) {
    case "Excellent":
      return { background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.4)" };
    case "Good":
      return { background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.4)" };
    case "Average":
      return { background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.4)" };
    default:
      return { background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" };
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-[#3b82f6]";
  if (score >= 70) return "text-[#22c55e]";
  if (score >= 60) return "text-[#f59e0b]";
  return "text-[#ef4444]";
};

const PerformanceScoreCard = ({ data, compact = false }: PerformanceScoreCardProps) => {
  if (data.loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className={`text-2xl font-bold ${getScoreColor(data.compositeScore)}`}>
          {data.compositeScore}
        </div>
        <div className="text-sm text-muted-foreground">/100</div>
        <Badge className={getBadgeStyle(data.badge)}>{data.badge}</Badge>
      </div>
    );
  }

  const breakdowns = [
    {
      label: "Trainings Attended",
      icon: BookOpen,
      score: data.trainingScore,
      detail: `${data.trainingsCount} completed`,
      weight: "30%",
    },
    {
      label: "Student Feedback",
      icon: MessageSquare,
      score: data.feedbackScore,
      detail: `Avg: ${data.avgFeedback}/100`,
      weight: "40%",
    },
    {
      label: "Publications",
      icon: FileText,
      score: data.publicationScore,
      detail: `${data.publicationsCount} published`,
      weight: "30%",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg overflow-hidden"
    >
      <div className="px-4 py-5 sm:px-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium text-foreground">
              Faculty Performance Score
            </h3>
          </div>
          <Badge className={`text-sm ${getBadgeStyle(data.badge)}`}>{data.badge}</Badge>
        </div>
      </div>

      <div className="p-6">
        {/* Main Score */}
        <div className="text-center mb-6">
          <div className={`text-5xl font-bold ${getScoreColor(data.compositeScore)}`}>
            {data.compositeScore}
          </div>
          <div className="text-sm text-muted-foreground mt-1">out of 100</div>
        </div>

        {/* Breakdown */}
        <div className="space-y-4">
          {breakdowns.map((item) => (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="text-xs text-muted-foreground">({item.weight})</span>
                </div>
                <span className="text-muted-foreground">{item.detail}</span>
              </div>
              <Progress value={item.score} className="h-2" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default PerformanceScoreCard;
