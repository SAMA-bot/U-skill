import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Edit3, Loader2, Save, BookOpen, Target, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { useToast } from "@/hooks/use-toast";

interface MetricRow {
  id: string | null;
  month: string;
  year: number;
  teaching_score: number;
  research_score: number;
  service_score: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const EditableMetrics = () => {
  const { user } = useAuth();
  const { selectedYear } = useAcademicYear();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const academicStartYear = parseInt(selectedYear.split("-")[0]);

  useEffect(() => {
    if (user) fetchMetrics();
  }, [user, selectedYear]);

  const fetchMetrics = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("performance_metrics")
        .select("*")
        .eq("user_id", user.id)
        .or(`year.eq.${academicStartYear},year.eq.${academicStartYear + 1}`)
        .order("year", { ascending: true })
        .order("month", { ascending: true });

      setMetrics(
        (data || []).map((d) => ({
          id: d.id,
          month: d.month,
          year: d.year,
          teaching_score: d.teaching_score || 0,
          research_score: d.research_score || 0,
          service_score: d.service_score || 0,
        }))
      );
    } catch (err) {
      console.error("Error fetching metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateMetric = (index: number, field: keyof MetricRow, value: number) => {
    setMetrics((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, [field]: Math.min(Math.max(value, 0), 100) } : m
      )
    );
  };

  const saveMetric = async (index: number) => {
    if (!user) return;
    const metric = metrics[index];
    setSaving(true);
    try {
      if (metric.id) {
        const { error } = await supabase
          .from("performance_metrics")
          .update({
            teaching_score: metric.teaching_score,
            research_score: metric.research_score,
            service_score: metric.service_score,
          })
          .eq("id", metric.id);
        if (error) throw error;
      }
      toast({ title: "📊 Performance Updated", description: `${metric.month} ${metric.year} scores saved — Teaching: ${metric.teaching_score}, Research: ${metric.research_score}, Service: ${metric.service_score}` });
      setEditingIndex(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const categoryIcons = {
    teaching_score: BookOpen,
    research_score: Target,
    service_score: Users,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Edit3 className="h-5 w-5 text-primary" />
          Edit Performance Metrics — {selectedYear}
        </CardTitle>
        <CardDescription>
          Adjust your monthly scores for teaching, research, and service
        </CardDescription>
      </CardHeader>
      <CardContent>
        {metrics.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No metrics recorded for this academic year yet. Complete activities to generate metrics.
          </div>
        ) : (
          <div className="space-y-3">
            {metrics.map((metric, idx) => {
              const isEditing = editingIndex === idx;
              const avg = Math.round(
                (metric.teaching_score + metric.research_score + metric.service_score) / 3
              );

              return (
                <motion.div
                  key={`${metric.month}-${metric.year}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`p-4 rounded-lg border transition-colors ${
                    isEditing
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-foreground text-sm">
                        {metric.month} {metric.year}
                      </span>
                      <span className="text-xs text-muted-foreground">Avg: {avg}/100</span>
                    </div>
                    {isEditing ? (
                      <Button
                        size="sm"
                        onClick={() => saveMetric(idx)}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                        Save
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingIndex(idx)}
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      {(["teaching_score", "research_score", "service_score"] as const).map(
                        (field) => {
                          const Icon = categoryIcons[field];
                          const label = field.replace("_score", "").replace(/^\w/, (c) => c.toUpperCase());
                          return (
                            <div key={field} className="space-y-2">
                              <Label className="flex items-center gap-1.5 text-xs">
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                              </Label>
                              <div className="flex items-center gap-2">
                                <Slider
                                  value={[metric[field]]}
                                  onValueChange={([v]) => updateMetric(idx, field, v)}
                                  max={100}
                                  step={1}
                                  className="flex-1"
                                />
                                <Input
                                  type="number"
                                  className="w-16 h-8 text-xs text-center"
                                  value={metric[field]}
                                  onChange={(e) =>
                                    updateMetric(idx, field, parseInt(e.target.value) || 0)
                                  }
                                  min={0}
                                  max={100}
                                />
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {(["teaching_score", "research_score", "service_score"] as const).map(
                        (field) => {
                          const Icon = categoryIcons[field];
                          const label = field.replace("_score", "").replace(/^\w/, (c) => c.toUpperCase());
                          return (
                            <div key={field} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Icon className="h-3.5 w-3.5" />
                              <span>{label}:</span>
                              <span className="font-medium text-foreground">{metric[field]}</span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EditableMetrics;
