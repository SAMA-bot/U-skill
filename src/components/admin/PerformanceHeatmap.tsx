import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, Grid3X3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface FacultyCell {
  userId: string;
  name: string;
  department: string;
  teaching: number;
  research: number;
  service: number;
  overall: number;
}

const getHeatColor = (score: number): string => {
  if (score >= 80) return "bg-emerald-500/80 dark:bg-emerald-500/70";
  if (score >= 60) return "bg-emerald-400/60 dark:bg-emerald-400/50";
  if (score >= 40) return "bg-amber-400/60 dark:bg-amber-400/50";
  if (score >= 20) return "bg-orange-400/60 dark:bg-orange-400/50";
  if (score > 0) return "bg-red-400/60 dark:bg-red-400/50";
  return "bg-muted/40";
};

const getTextColor = (score: number): string => {
  if (score >= 60) return "text-white dark:text-white";
  if (score > 0) return "text-foreground";
  return "text-muted-foreground";
};

const METRICS = ["Teaching", "Research", "Service", "Overall"] as const;

const PerformanceHeatmap = () => {
  const [data, setData] = useState<FacultyCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profilesRes, metricsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, department"),
        supabase.from("performance_metrics").select("user_id, teaching_score, research_score, service_score"),
      ]);

      const profiles = profilesRes.data || [];
      const metrics = metricsRes.data || [];

      const userMetrics = new Map<string, { t: number[]; r: number[]; s: number[] }>();
      for (const m of metrics) {
        if (!userMetrics.has(m.user_id)) userMetrics.set(m.user_id, { t: [], r: [], s: [] });
        const u = userMetrics.get(m.user_id)!;
        u.t.push(m.teaching_score || 0);
        u.r.push(m.research_score || 0);
        u.s.push(m.service_score || 0);
      }

      const cells: FacultyCell[] = profiles.map((p) => {
        const m = userMetrics.get(p.user_id);
        const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
        const teaching = m ? avg(m.t) : 0;
        const research = m ? avg(m.r) : 0;
        const service = m ? avg(m.s) : 0;
        return {
          userId: p.user_id,
          name: p.full_name,
          department: p.department || "Unassigned",
          teaching,
          research,
          service,
          overall: Math.round((teaching + research + service) / 3),
        };
      });

      setData(cells.sort((a, b) => a.department.localeCompare(b.department) || b.overall - a.overall));
    } catch (err) {
      console.error("Heatmap fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const departments = useMemo(() => [...new Set(data.map((d) => d.department))], [data]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary" />
          Performance Heatmap
        </CardTitle>
        <CardDescription>Faculty performance scores across departments — hover for details</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
          <span>Low</span>
          <div className="flex gap-0.5">
            {[0, 20, 40, 60, 80].map((v) => (
              <div key={v} className={`w-6 h-3 rounded-sm ${getHeatColor(v || 1)}`} />
            ))}
          </div>
          <span>High</span>
        </div>

        <div className="overflow-x-auto">
          <TooltipProvider delayDuration={100}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground py-2 pr-3 sticky left-0 bg-card z-10 min-w-[140px]">
                    Faculty
                  </th>
                  {METRICS.map((m) => (
                    <th key={m} className="text-center text-xs font-medium text-muted-foreground py-2 px-1 min-w-[64px]">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => {
                  const members = data.filter((d) => d.department === dept);
                  return (
                    <React.Fragment key={dept}>
                      <tr>
                        <td
                          colSpan={METRICS.length + 1}
                          className="pt-3 pb-1 text-xs font-semibold text-foreground border-b border-border"
                        >
                          {dept} ({members.length})
                        </td>
                      </tr>
                      {members.map((faculty, i) => (
                        <motion.tr
                          key={faculty.userId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="group"
                        >
                          <td className="py-1 pr-3 text-xs text-foreground truncate max-w-[160px] sticky left-0 bg-card z-10">
                            {faculty.name}
                          </td>
                          {(["teaching", "research", "service", "overall"] as const).map((key) => {
                            const val = faculty[key];
                            return (
                              <td key={key} className="py-1 px-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`rounded-md h-8 flex items-center justify-center text-xs font-medium cursor-default transition-transform hover:scale-105 ${getHeatColor(val)} ${getTextColor(val)}`}
                                    >
                                      {val > 0 ? val : "–"}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    <p className="font-medium">{faculty.name}</p>
                                    <p>{key.charAt(0).toUpperCase() + key.slice(1)}: {val}%</p>
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                            );
                          })}
                        </motion.tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
};

import React from "react";

export default PerformanceHeatmap;
