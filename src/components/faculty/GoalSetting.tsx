import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface PerformanceGoal {
  id: string;
  category: "teaching" | "research" | "service";
  target_score: number;
  current_score: number;
  deadline: string;
  notes: string;
}

interface PerformanceMetric {
  teaching_score: number;
  research_score: number;
  service_score: number;
}

const GoalSetting = () => {
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PerformanceGoal | null>(null);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetric | null>(null);

  const [formData, setFormData] = useState({
    category: "teaching" as "teaching" | "research" | "service",
    target_score: 85,
    deadline: "",
    notes: "",
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch current performance metrics
      const { data: perfData } = await supabase
        .from("performance_metrics")
        .select("teaching_score, research_score, service_score")
        .eq("user_id", user.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (perfData) {
        setCurrentMetrics(perfData);
      }

      // Fetch stored goals from localStorage (since we don't have a goals table)
      const storedGoals = localStorage.getItem(`goals_${user.id}`);
      if (storedGoals) {
        const parsedGoals = JSON.parse(storedGoals);
        // Update current scores based on latest metrics
        const updatedGoals = parsedGoals.map((goal: PerformanceGoal) => ({
          ...goal,
          current_score: perfData
            ? perfData[`${goal.category}_score` as keyof PerformanceMetric] || 0
            : goal.current_score,
        }));
        setGoals(updatedGoals);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveGoals = (newGoals: PerformanceGoal[]) => {
    if (!user) return;
    localStorage.setItem(`goals_${user.id}`, JSON.stringify(newGoals));
    setGoals(newGoals);
  };

  const handleAddGoal = () => {
    if (!user || !currentMetrics) return;

    setSaving(true);

    const currentScore =
      currentMetrics[`${formData.category}_score` as keyof PerformanceMetric] || 0;

    const newGoal: PerformanceGoal = {
      id: crypto.randomUUID(),
      category: formData.category,
      target_score: formData.target_score,
      current_score: currentScore,
      deadline: formData.deadline,
      notes: formData.notes,
    };

    if (editingGoal) {
      const updatedGoals = goals.map((g) =>
        g.id === editingGoal.id ? { ...newGoal, id: editingGoal.id } : g
      );
      saveGoals(updatedGoals);
      toast({
        title: "Goal updated",
        description: "Your performance goal has been updated successfully.",
      });
    } else {
      saveGoals([...goals, newGoal]);
      toast({
        title: "Goal created",
        description: "Your new performance goal has been set.",
      });
    }

    resetForm();
    setSaving(false);
  };

  const handleDeleteGoal = (goalId: string) => {
    const updatedGoals = goals.filter((g) => g.id !== goalId);
    saveGoals(updatedGoals);
    toast({
      title: "Goal deleted",
      description: "The goal has been removed.",
    });
  };

  const handleEditGoal = (goal: PerformanceGoal) => {
    setEditingGoal(goal);
    setFormData({
      category: goal.category,
      target_score: goal.target_score,
      deadline: goal.deadline,
      notes: goal.notes,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      category: "teaching",
      target_score: 85,
      deadline: "",
      notes: "",
    });
    setEditingGoal(null);
    setDialogOpen(false);
  };

  const getProgressPercentage = (goal: PerformanceGoal) => {
    const progress = (goal.current_score / goal.target_score) * 100;
    return Math.min(progress, 100);
  };

  const getStatusBadge = (goal: PerformanceGoal) => {
    const progress = getProgressPercentage(goal);
    const isOverdue = new Date(goal.deadline) < new Date();

    if (progress >= 100) {
      return <Badge className="bg-green-500">Achieved</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (progress >= 75) {
      return <Badge className="bg-blue-500">On Track</Badge>;
    }
    return <Badge variant="secondary">In Progress</Badge>;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "teaching":
        return "hsl(var(--primary))";
      case "research":
        return "hsl(var(--accent))";
      case "service":
        return "#22c55e";
      default:
        return "hsl(var(--primary))";
    }
  };

  const formatDeadline = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Performance Goals
          </h3>
          <p className="text-muted-foreground mt-1">
            Set personal targets and track your progress toward achieving them
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
              <DialogDescription>
                Set a performance target for a specific category
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: "teaching" | "research" | "service") =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teaching">Teaching</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="target">Target Score (out of 100)</Label>
                <Input
                  id="target"
                  type="number"
                  min={1}
                  max={100}
                  value={formData.target_score}
                  onChange={(e) =>
                    setFormData({ ...formData, target_score: parseInt(e.target.value) || 0 })
                  }
                />
                {currentMetrics && (
                  <p className="text-xs text-muted-foreground">
                    Current{" "}
                    {formData.category.charAt(0).toUpperCase() + formData.category.slice(1)} score:{" "}
                    {currentMetrics[`${formData.category}_score` as keyof PerformanceMetric]}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="deadline">Target Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="Any notes or strategies..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={handleAddGoal}
                disabled={saving || !formData.deadline || formData.target_score <= 0}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {editingGoal ? "Update" : "Create"} Goal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium text-foreground mb-2">No Goals Set</h4>
            <p className="text-muted-foreground mb-4">
              Start by creating your first performance goal to track your progress
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal, index) => {
            const progress = getProgressPercentage(goal);
            const gap = goal.target_score - goal.current_score;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCategoryColor(goal.category) }}
                        />
                        <CardTitle className="text-base capitalize">{goal.category}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusBadge(goal)}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditGoal(goal)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>Target: {formatDeadline(goal.deadline)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {goal.current_score} / {goal.target_score}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
                        {gap > 0 ? (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            {gap} points to go
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Goal achieved!
                          </span>
                        )}
                      </div>
                      {goal.notes && (
                        <p className="text-xs text-muted-foreground italic border-t pt-2 mt-2">
                          {goal.notes}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GoalSetting;
