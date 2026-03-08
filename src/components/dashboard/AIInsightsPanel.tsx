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

interface CachedInsights {
  insights: Insight[];
  timestamp: number;
  isFallback: boolean;
}

const CACHE_KEY = "ai-insights-cache";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const iconMap = {
  training: BookOpen,
  performance: BarChart3,
  feedback: MessageSquare,
  motivation: Heart,
  trend: TrendingUp,
};

const typeStyles = {
  positive: "border-green-200 bg-green-50/50 dark:border-green-800/50 dark:bg-green-900/10",
  warning: "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800/50 dark:bg-yellow-900/10",
  neutral: "border-border bg-muted/30",
};

const typeIconStyles = {
  positive: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  neutral: "text-muted-foreground",
};

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

function loadCache(): CachedInsights | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedInsights = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function saveCache(insights: Insight[], isFallback: boolean) {
  try {
    const data: CachedInsights = { insights, timestamp: Date.now(), isFallback };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

const AIInsightsPanel = () => {
  const cached = loadCache();
  const [insights, setInsights] = useState<Insight[]>(cached?.insights || []);
  const [loading, setLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(cached?.isFallback ?? false);
  const [hasGenerated, setHasGenerated] = useState(!!cached);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchInsights = useCallback(async (retryCount = 0) => {
    if (!user) return;
    if (retryCount === 0) {
      setLoading(true);
      setIsFallback(false);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in to view AI insights.");

      const { data, error: fnError } = await supabase.functions.invoke("ai-insights", { body: {} });

      if (fnError) {
        if (retryCount < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          return fetchInsights(retryCount + 1);
        }
        throw new Error("AI insights temporarily unavailable. Please try again later.");
      }

      if (data?.error && !data?.insights) {
        if (retryCount < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          return fetchInsights(retryCount + 1);
        }
        throw new Error(data.error);
      }

      const fb = !!data?.fallback;
      const result = data?.insights || [];
      setInsights(result);
      setIsFallback(fb);
      setHasGenerated(true);
      saveCache(result, fb);
    } catch (err: any) {
      console.error("Error fetching AI insights:", err);
      setHasGenerated(true);
      toast({
        title: "AI Insights",
        description: "AI insights temporarily unavailable. Please try again later.",
        variant: "destructive",
      });
    } finally {
      if (retryCount === 0 || retryCount >= MAX_RETRIES) {
        setLoading(false);
      }
    }
  }, [user, toast]);

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
              <h3 className="text-lg font-medium text-foreground">AI Insights</h3>
              <p className="text-xs text-muted-foreground">
                {!hasGenerated
                  ? "Click generate to get personalized insights"
                  : isFallback
                    ? "General tips — click refresh for personalized insights"
                    : "Personalized analysis of your performance data"}
              </p>
            </div>
          </div>
          {hasGenerated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchInsights()}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {!hasGenerated && !loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Sparkles className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground text-center">
              Get AI-powered insights based on your performance data.
            </p>
            <Button onClick={() => fetchInsights()} disabled={!user}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Insights
            </Button>
          </div>
        ) : loading && insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <Sparkles className="h-3 w-3 text-accent absolute -top-1 -right-1 animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">Analyzing your performance data…</p>
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
                      whileHover={{ y: -2, transition: { duration: 0.2 } }}
                      className={`rounded-lg border p-3.5 transition-all duration-300 hover:shadow-md cursor-default ${typeStyles[insight.type]}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex-shrink-0 ${typeIconStyles[insight.type]}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-foreground leading-tight">{insight.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}

        {loading && insights.length > 0 && (
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
