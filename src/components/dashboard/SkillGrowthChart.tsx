import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { TrendingUp, Zap, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import AnimatedCounter from "@/components/dashboard/AnimatedCounter";

interface SkillData {
  skill: string;
  current: number;
  target: number;
}

const skillColors: Record<string, string> = {
  Teaching: "bg-blue-500",
  Research: "bg-purple-500",
  Leadership: "bg-orange-500",
  Communication: "bg-teal-500",
  Technology: "bg-pink-500",
  Mentoring: "bg-green-500",
};

const getGrowthLabel = (level: number): { text: string; inlineStyle: React.CSSProperties } => {
  if (level >= 80) return { text: "Expert", inlineStyle: { background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.4)" } };
  if (level >= 60) return { text: "Advanced", inlineStyle: { background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.4)" } };
  if (level >= 30) return { text: "Intermediate", inlineStyle: { background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.4)" } };
  return { text: "Beginner", inlineStyle: { background: "rgba(161,161,170,0.15)", color: "#a1a1aa", border: "1px solid rgba(161,161,170,0.4)" } };
};

const SkillGrowthChart = () => {
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchData = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("capacity_skills")
        .select("skill_name, current_level, target_level")
        .eq("user_id", user.id);

      if (error) throw error;
      if (data) {
        setSkills(
          data.map((d) => ({
            skill: d.skill_name,
            current: d.current_level || 0,
            target: d.target_level || 100,
          }))
        );
      }
    } catch (err) {
      console.error("Error fetching skills:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  useRealtimeData({
    table: "capacity_skills",
    userId: user?.id,
    onChange: () => { if (user) fetchData(); },
  });

  const totalPoints = skills.reduce((s, sk) => s + sk.current, 0);
  const maxPoints = skills.length * 100;
  const overallPercent = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
  const hasProgress = skills.some((s) => s.current > 0);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      <div className="px-4 py-5 sm:px-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-primary to-accent rounded-md p-1.5">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">Skill Growth</h3>
              <p className="text-xs text-muted-foreground">
                Skills gained from trainings &amp; activities
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Overall</span>
            <AnimatedCounter
              value={overallPercent}
              suffix="%"
              className="text-sm font-bold text-foreground"
            />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {!hasProgress ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Zap className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-base font-medium text-foreground mb-1">
              Start Growing Your Skills
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Complete trainings and activities to see your skill growth visualized here.
            </p>
          </div>
        ) : skills.length < 3 ? (
          /* Fallback: progress bars only when radar can't render properly */
          <div className="space-y-3" style={{ minHeight: 300 }}>
            {skills
              .sort((a, b) => b.current - a.current)
              .map((sk, i) => {
                const growth = getGrowthLabel(sk.current);
                const color = skillColors[sk.skill] || "bg-primary";
                return (
                  <motion.div
                    key={sk.skill}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="text-sm font-medium text-foreground">{sk.skill}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge style={growth.inlineStyle} className="text-[9px] px-1.5 py-0 border-0">{growth.text}</Badge>
                        <span className="text-xs text-muted-foreground w-8 text-right">{sk.current}%</span>
                      </div>
                    </div>
                    <Progress value={sk.current} className="h-1.5" />
                  </motion.div>
                );
              })}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Radar Chart - centered, compact */}
            <div className="flex flex-col items-center">
              <div className="flex gap-3 mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-[11px] text-muted-foreground">Current</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground opacity-50" />
                  <span className="text-[11px] text-muted-foreground">Target</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={skills} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                  <Radar
                    name="Target"
                    dataKey="target"
                    stroke="hsl(var(--muted-foreground))"
                    fill="hsl(var(--muted))"
                    fillOpacity={0.2}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                  <Radar
                    name="Current"
                    dataKey="current"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.35}
                    strokeWidth={2}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Skill Breakdown - directly below chart */}
            <div className="space-y-2.5">
              {skills
                .sort((a, b) => b.current - a.current)
                .map((sk, i) => {
                  const growth = getGrowthLabel(sk.current);
                  const color = skillColors[sk.skill] || "bg-primary";
                  return (
                    <motion.div
                      key={sk.skill}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${color}`} />
                          <span className="text-xs font-medium text-foreground">{sk.skill}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge style={growth.inlineStyle} className="text-[9px] px-1.5 py-0 border-0">{growth.text}</Badge>
                          <span className="text-xs text-muted-foreground w-8 text-right">{sk.current}%</span>
                        </div>
                      </div>
                      <Progress value={sk.current} className="h-1.5" />
                    </motion.div>
                  );
                })}

              {/* Total summary */}
              <div className="pt-2 mt-1 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{totalPoints} / {maxPoints} total skill points</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SkillGrowthChart;
