import { motion } from "framer-motion";
import { Award, BookOpen, MessageSquare, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PerformanceScoreData } from "@/hooks/usePerformanceScore";

interface PerformanceScoreCardProps {
  data: PerformanceScoreData;
  compact?: boolean;
}

const getBadgeStyle = (badge: PerformanceScoreData["badge"]) => {
  switch (badge) {
    case "Excellent":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
    case "Good":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
    default:
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
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
