import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Wand2, BookOpen, Clock, Star, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface GeneratedLesson {
  title: string;
  description: string;
  xp_reward: number;
  duration_minutes: number;
  content: string;
}
export interface GeneratedModule {
  title: string;
  description: string;
  lessons: GeneratedLesson[];
}
export interface GeneratedPath {
  title: string;
  description: string;
  difficulty: string;
  estimated_hours: number;
  target_audience: string;
  modules: GeneratedModule[];
}

interface AiPathBuilderProps {
  onCreated: () => void;
  sortOrder: number;
}

const DIFFICULTIES = ["beginner", "intermediate", "advanced"];

const AiPathBuilder = ({ onCreated, sortOrder }: AiPathBuilderProps) => {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<GeneratedPath | null>(null);
  const [publish, setPublish] = useState(false);
  const [form, setForm] = useState({
    topic: "",
    difficulty: "beginner",
    moduleCount: "3",
    lessonsPerModule: "3",
    audience: "College faculty members",
    notes: "",
  });

  const { user } = useAuth();
  const { toast } = useToast();

  const reset = () => {
    setPlan(null);
    setGenerating(false);
    setSaving(false);
  };

  const generate = async () => {
    if (!form.topic.trim()) return;
    setGenerating(true);
    setPlan(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-learning-path", {
        body: {
          topic: form.topic.trim(),
          difficulty: form.difficulty,
          moduleCount: Number(form.moduleCount),
          lessonsPerModule: Number(form.lessonsPerModule),
          audience: form.audience,
          notes: form.notes,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setPlan((data as any).plan as GeneratedPath);
    } catch (err: any) {
      toast({
        title: "Could not generate the path",
        description: err.message ?? "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const savePlan = async () => {
    if (!plan || !user) return;
    setSaving(true);
    try {
      const { data: path, error: pathError } = await supabase
        .from("learning_paths")
        .insert({
          title: plan.title,
          description: plan.description,
          difficulty: DIFFICULTIES.includes(plan.difficulty) ? plan.difficulty : "beginner",
          estimated_hours: Number(plan.estimated_hours) || 0,
          target_audience: plan.target_audience,
          created_by: user.id,
          sort_order: sortOrder,
          is_published: publish,
        })
        .select("id")
        .single();
      if (pathError) throw pathError;

      for (const [mi, mod] of plan.modules.entries()) {
        const { data: moduleRow, error: modError } = await supabase
          .from("learning_modules")
          .insert({ path_id: path.id, title: mod.title, description: mod.description, sort_order: mi })
          .select("id")
          .single();
        if (modError) throw modError;

        for (const [li, lesson] of mod.lessons.entries()) {
          const { data: lessonRow, error: lessonError } = await supabase
            .from("lessons")
            .insert({
              module_id: moduleRow.id,
              title: lesson.title,
              description: lesson.description,
              xp_reward: Math.round(Number(lesson.xp_reward) || 10),
              duration_minutes: Math.round(Number(lesson.duration_minutes) || 15),
              sort_order: li,
            })
            .select("id")
            .single();
          if (lessonError) throw lessonError;

          if (lesson.content?.trim()) {
            const { error: contentError } = await supabase.from("lesson_content").insert({
              lesson_id: lessonRow.id,
              content_type: "text",
              title: lesson.title,
              text_content: lesson.content,
              sort_order: 0,
            });
            if (contentError) throw contentError;
          }
        }
      }

      toast({ title: "Learning path created", description: `${plan.title} is ready${publish ? " and published" : " as a draft"}.` });
      setOpen(false);
      reset();
      onCreated();
    } catch (err: any) {
      toast({ title: "Could not save the path", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalLessons = plan?.modules.reduce((s, m) => s + m.lessons.length, 0) ?? 0;
  const totalXp = plan?.modules.reduce((s, m) => s + m.lessons.reduce((x, l) => x + (Number(l.xp_reward) || 0), 0), 0) ?? 0;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Sparkles className="h-4 w-4 text-primary" /> Build with AI
      </Button>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" /> AI Learning Path Builder
            </DialogTitle>
            <DialogDescription>
              Describe the topic and shape of the path — AI drafts the modules, lessons and teaching notes for you to review before saving.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-topic">Topic *</Label>
              <Input
                id="ai-topic"
                value={form.topic}
                onChange={e => setForm({ ...form, topic: e.target.value })}
                placeholder="e.g., Outcome-Based Education and Rubric Design"
                maxLength={200}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={v => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map(d => (
                      <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modules</Label>
                <Select value={form.moduleCount} onValueChange={v => setForm({ ...form, moduleCount: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={String(n)}>{n} modules</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lessons / module</Label>
                <Select value={form.lessonsPerModule} onValueChange={v => setForm({ ...form, lessonsPerModule: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} lessons</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-audience">Target audience</Label>
              <Input
                id="ai-audience"
                value={form.audience}
                onChange={e => setForm({ ...form, audience: e.target.value })}
                placeholder="e.g., First-year engineering faculty"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-notes">Extra requirements (optional)</Label>
              <Textarea
                id="ai-notes"
                rows={2}
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g., Include NAAC criteria and a capstone reflection lesson"
              />
            </div>

            <Button onClick={generate} disabled={generating || !form.topic.trim()} className="w-full gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Drafting your path…" : plan ? "Regenerate draft" : "Generate draft"}
            </Button>

            {generating && (
              <p className="text-xs text-center text-muted-foreground">
                This usually takes 20–60 seconds while the AI structures the curriculum.
              </p>
            )}

            {plan && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-muted/20 p-4 space-y-4"
              >
                <div>
                  <h3 className="font-semibold tracking-tight text-foreground">{plan.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className="capitalize">{plan.difficulty}</Badge>
                    <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{plan.estimated_hours}h</Badge>
                    <Badge variant="outline" className="gap-1"><BookOpen className="h-3 w-3" />{totalLessons} lessons</Badge>
                    <Badge variant="outline" className="gap-1 text-primary border-primary/30"><Star className="h-3 w-3" />{totalXp} XP</Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {plan.modules.map((mod, mi) => (
                    <div key={mi} className="rounded-lg border border-border/60 bg-card p-3">
                      <p className="text-sm font-medium text-foreground">{mi + 1}. {mod.title}</p>
                      <ul className="mt-2 space-y-1">
                        {mod.lessons.map((lesson, li) => (
                          <li key={li} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-success" />
                            <span className="flex-1">{lesson.title}</span>
                            <span className="tabular-nums shrink-0">{lesson.duration_minutes}m · +{lesson.xp_reward} XP</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <Switch id="ai-publish" checked={publish} onCheckedChange={setPublish} />
                  <Label htmlFor="ai-publish">Publish to faculty immediately</Label>
                </div>
              </motion.div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={savePlan} disabled={!plan || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save learning path
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AiPathBuilder;
