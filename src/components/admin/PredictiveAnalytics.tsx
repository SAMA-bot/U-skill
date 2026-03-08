import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  GraduationCap,
  AlertTriangle,
  Sparkles,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PerformanceTrend {
  title: string;
  description: string;
  direction: "up" | "down" | "stable";
  confidence: "high" | "medium" | "low";
  department: string;
}

interface TrainingNeed {
  skill: string;
  urgency: "high" | "medium" | "low";
  affectedCount: number;
  recommendation: string;
}

interface RiskFactor {
  area: string;
  risk: string;
  mitigation: string;
}

interface Predictions {
  performanceTrends: PerformanceTrend[];
  trainingNeeds: TrainingNeed[];
  riskFactors: RiskFactor[];
  overallOutlook: string;
}

const directionIcon = {
  up: <TrendingUp className="h-4 w-4 text-emerald-500" />,
  down: <TrendingDown className="h-4 w-4 text-destructive" />,
  stable: <Minus className="h-4 w-4 text-muted-foreground" />,
};

const confidenceColor = {
  high: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  low: "bg-muted text-muted-foreground",
};

const urgencyColor = {
  high: "destructive" as const,
  medium: "secondary" as const,
  low: "outline" as const,
};

const PredictiveAnalytics = () => {
  const [predictions, setPredictions] = useState<Predictions | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generatePredictions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("predictive-analytics");

      if (error) throw error;

      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }

      setPredictions(data as Predictions);
      toast({ title: "Predictions generated", description: "AI analysis complete." });
    } catch (err: any) {
      console.error("Prediction error:", err);
      toast({
        title: "Analysis failed",
        description: "Could not generate predictions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!predictions) {
    return (
      <div className="space-y-6">
        <div className="text-center py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex flex-col items-center gap-4"
          >
            <div className="p-4 rounded-full bg-primary/10">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Predictive Analytics</h2>
            <p className="text-muted-foreground max-w-md">
              AI-powered analysis of institutional data to predict faculty performance trends
              and identify future training needs.
            </p>
            <Button onClick={generatePredictions} disabled={loading} size="lg" className="mt-2">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Predictions
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Predictive Analytics</h1>
          <p className="text-muted-foreground">AI-generated forecasts based on institutional data</p>
        </div>
        <Button variant="outline" onClick={generatePredictions} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* Overall Outlook */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground leading-relaxed">{predictions.overallOutlook}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Performance Trends */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Performance Trend Predictions
            </CardTitle>
            <CardDescription>Forecasted direction of faculty performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {predictions.performanceTrends.map((trend, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="mt-0.5">{directionIcon[trend.direction]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-medium text-foreground">{trend.title}</h4>
                      <Badge variant="outline" className="text-xs">{trend.department}</Badge>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${confidenceColor[trend.confidence]}`}>
                        {trend.confidence} confidence
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{trend.description}</p>
                  </div>
                  {trend.direction === "up" ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : trend.direction === "down" ? (
                    <ArrowDownRight className="h-4 w-4 text-destructive shrink-0" />
                  ) : null}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training Needs */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Predicted Training Needs
              </CardTitle>
              <CardDescription>Skills requiring development investment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.trainingNeeds.map((need, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{need.skill}</span>
                        <Badge variant={urgencyColor[need.urgency]} className="text-xs">
                          {need.urgency}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{need.affectedCount} faculty</span>
                    </div>
                    <Progress
                      value={need.urgency === "high" ? 85 : need.urgency === "medium" ? 55 : 25}
                      className="h-1.5"
                    />
                    <p className="text-xs text-muted-foreground">{need.recommendation}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Risk Factors */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5 text-destructive" />
                Risk Factors
              </CardTitle>
              <CardDescription>Areas requiring proactive attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.riskFactors.map((risk, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.05 }}
                    className="p-3 rounded-lg border border-destructive/20 bg-destructive/5"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <h4 className="text-sm font-medium text-foreground">{risk.area}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{risk.risk}</p>
                    <div className="flex items-start gap-1.5 bg-card p-2 rounded-md">
                      <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-foreground">{risk.mitigation}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default PredictiveAnalytics;
