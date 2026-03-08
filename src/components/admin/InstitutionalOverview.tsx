import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, GraduationCap, BarChart3, FolderCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface OverviewMetrics {
  totalFaculty: number;
  trainingCompliance: number;
  avgPerformance: number;
  documentsVerified: number;
}

const InstitutionalOverview = () => {
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    totalFaculty: 0,
    trainingCompliance: 0,
    avgPerformance: 0,
    documentsVerified: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // 1. Total faculty
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id");
      const totalFaculty = profiles?.length || 0;
      const facultyIds = profiles?.map((p) => p.user_id) || [];

      if (totalFaculty === 0) {
        setMetrics({ totalFaculty: 0, trainingCompliance: 0, avgPerformance: 0, documentsVerified: 0 });
        setLoading(false);
        return;
      }

      // 2. Training compliance: % of faculty who completed at least one course
      const { data: enrollments } = await supabase
        .from("course_enrollments")
        .select("user_id, status")
        .in("user_id", facultyIds);

      const completedUsers = new Set(
        (enrollments || []).filter((e) => e.status === "completed").map((e) => e.user_id)
      );
      const trainingCompliance = Math.round((completedUsers.size / totalFaculty) * 100);

      // 3. Average performance score across all faculty
      const { data: perfData } = await supabase
        .from("performance_metrics")
        .select("user_id, teaching_score, research_score, service_score")
        .in("user_id", facultyIds);

      let avgPerformance = 0;
      if (perfData && perfData.length > 0) {
        const userScores = new Map<string, number[]>();
        for (const row of perfData) {
          const avg = ((row.teaching_score || 0) + (row.research_score || 0) + (row.service_score || 0)) / 3;
          if (!userScores.has(row.user_id)) userScores.set(row.user_id, []);
          userScores.get(row.user_id)!.push(avg);
        }
        let total = 0;
        userScores.forEach((scores) => {
          total += scores.reduce((a, b) => a + b, 0) / scores.length;
        });
        avgPerformance = Math.round(total / userScores.size);
      }

      // 4. Documents verified percentage
      const { data: docs } = await supabase
        .from("faculty_documents")
        .select("status")
        .in("user_id", facultyIds);

      let documentsVerified = 0;
      if (docs && docs.length > 0) {
        const verified = docs.filter((d) => d.status === "verified").length;
        documentsVerified = Math.round((verified / docs.length) * 100);
      }

      setMetrics({ totalFaculty, trainingCompliance, avgPerformance, documentsVerified });
    } catch (err) {
      console.error("Error fetching institutional overview:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const cards = [
    {
      label: "Total Faculty",
      value: metrics.totalFaculty,
      suffix: "",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      progress: null,
    },
    {
      label: "Training Compliance",
      value: metrics.trainingCompliance,
      suffix: "%",
      icon: GraduationCap,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      progress: metrics.trainingCompliance,
    },
    {
      label: "Avg Performance Score",
      value: metrics.avgPerformance,
      suffix: "%",
      icon: BarChart3,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
      progress: metrics.avgPerformance,
    },
    {
      label: "Documents Verified",
      value: metrics.documentsVerified,
      suffix: "%",
      icon: FolderCheck,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      progress: metrics.documentsVerified,
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-foreground mb-4">Institutional Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2.5 rounded-lg ${card.bgColor}`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {card.value}{card.suffix}
                  </p>
                  {card.progress !== null && (
                    <Progress value={card.progress} className="mt-3 h-1.5" />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default InstitutionalOverview;
