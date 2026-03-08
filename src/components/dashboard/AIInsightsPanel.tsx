import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  BookOpen,
  BarChart3,
  MessageSquare,
  Heart,
  RefreshCw,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Insight {
  icon: "training" | "performance" | "feedback" | "motivation" | "trend";
  title: string;
  description: string;
  type: "positive" | "warning" | "neutral";
}

const iconMap = {
  training: BookOpen,
  performance: BarChart3,
  feedback: MessageSquare,
  motivation: Heart,
  trend: TrendingUp,
};

const typeStyles = {
  positive:
    "border-green-200 bg-green-50/50 dark:border-green-800/50 dark:bg-green-900/10",
  warning:
    "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800/50 dark:bg-yellow-900/10",
  neutral:
    "border-border bg-muted/30",
};

const typeIconStyles = {
  positive: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  neutral: "text-muted-foreground",
};

const fallbackInsights: Insight[] = [
  { icon: "trend", title: "Keep Going!", description: "Continue logging activities to build a detailed performance profile.", type: "neutral" },
  { icon: "training", title: "Explore Courses", description: "Enroll in available training programs to boost your skills.", type: "neutral" },
  { icon: "performance", title: "Track Progress", description: "Regularly update your metrics to see growth trends.", type: "neutral" },
  { icon: "motivation", title: "Stay Consistent", description: "Daily engagement helps build momentum and improve scores.", type: "positive" },
];

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

const AIInsightsPanel = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchInsights = useCallback(async (retryCount = 0) => {
    if (!user) return;
    if (retryCount === 0) {
      setLoading(true);
      setError(null);
      setIsFallback(false);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Please log in to view AI insights.");
      }

      console.log("Calling ai-insights function (attempt", retryCount + 1, ")");

      const { data, error: fnError } = await supabase.functions.invoke(
        "ai-insights",
        { body: {} }
      );

      if (fnError) {
        console.error("Edge function invocation error:", fnError);
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying in ${RETRY_DELAY_MS}ms... (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          return fetchInsights(retryCount + 1);
        }
        throw new Error("AI insights temporarily unavailable. Please try again later.");
      }

      if (data?.fallback) {
        setIsFallback(true);
      }

      if (data?.error && !data?.insights) {
        if (retryCount < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          return fetchInsights(retryCount + 1);
        }
        throw new Error(data.error);
      }

      if (data?.fallback) {
        setIsFallback(true);
      }

      setInsights(data?.insights || fallbackInsights);
      setHasLoaded(true);
    } catch (err: any) {
      console.error("Error fetching AI insights:", err);
      // Show fallback insights instead of error state
      setInsights(fallbackInsights);
      setIsFallback(true);
      setHasLoaded(true);
      setError(null); // Clear error since we're showing fallback

      if (retryCount === 0 || retryCount >= MAX_RETRIES) {
        toast({
          title: "AI Insights",
          description: "Showing general tips. Personalized insights will be available shortly.",
        });
      }
    } finally {
      if (retryCount === 0 || retryCount >= MAX_RETRIES) {
        setLoading(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && !hasLoaded) {
      fetchInsights();
    }
  }, [user, hasLoaded, fetchInsights]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-card shadow-sm rounded-lg overflow-hidden border border-border"
    >
      <div className="px-4 py-5 sm:px-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-primary to-accent rounded-md p-1.5">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">
                AI Insights
              </h3>
              <p className="text-xs text-muted-foreground">
                {isFallback
                  ? "General tips — click refresh for personalized insights"
                  : "Personalized analysis of your performance data"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setHasLoaded(false);
              fetchInsights();
            }}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {loading && !hasLoaded ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <Sparkles className="h-3 w-3 text-accent absolute -top-1 -right-1 animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">
              Analyzing your performance data…
            </p>
          </div>
        ) : error && !hasLoaded ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              {error}
            </p>
            <Button variant="outline" size="sm" onClick={() => fetchInsights()}>
              Try Again
            </Button>
          </div>
        ) : (
          <>
            {isFallback && (
              <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-md bg-muted/50 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Showing general tips. Refresh for AI-powered insights.</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnimatePresence mode="wait">
                {insights.map((insight, index) => {
                  const Icon = iconMap[insight.icon] || TrendingUp;
                  return (
                    <motion.div
                      key={`${insight.title}-${index}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{
                        y: -2,
                        transition: { duration: 0.2 },
                      }}
                      className={`rounded-lg border p-3.5 transition-all duration-300 hover:shadow-md cursor-default ${typeStyles[insight.type]}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex-shrink-0 ${typeIconStyles[insight.type]}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-foreground leading-tight">
                            {insight.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}

        {loading && hasLoaded && (
          <div className="flex items-center justify-center pt-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Refreshing insights…
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AIInsightsPanel;
