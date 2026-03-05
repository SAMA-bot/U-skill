import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Edit2, Trash2, Save, Loader2, Smile, Meh, Frown, Heart, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: string;
  journal_date: string;
  created_at: string;
}

const moodOptions = [
  { value: "great", icon: Heart, label: "Great", color: "text-green-500" },
  { value: "good", icon: Smile, label: "Good", color: "text-blue-500" },
  { value: "neutral", icon: Meh, label: "Neutral", color: "text-muted-foreground" },
  { value: "low", icon: Frown, label: "Low", color: "text-orange-500" },
  { value: "energized", icon: Zap, label: "Energized", color: "text-yellow-500" },
];

const ReflectionJournal = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", mood: "neutral" });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) fetchEntries();
  }, [user]);

  const fetchEntries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("reflection_journal")
      .select("*")
      .eq("user_id", user.id)
      .order("journal_date", { ascending: false })
      .limit(20);
    if (data) setEntries(data as JournalEntry[]);
    setLoading(false);
  };

  const saveEntry = async () => {
    if (!user || !form.title.trim() || !form.content.trim()) return;

    if (editingId) {
      const { error } = await supabase
        .from("reflection_journal")
        .update({ title: form.title, content: form.content, mood: form.mood, updated_at: new Date().toISOString() })
        .eq("id", editingId);
      if (!error) {
        toast({ title: "Entry updated" });
        fetchEntries();
      }
    } else {
      const { error } = await supabase
        .from("reflection_journal")
        .insert({ user_id: user.id, title: form.title, content: form.content, mood: form.mood });
      if (!error) {
        toast({ title: "Journal entry saved" });
        fetchEntries();
      }
    }
    resetForm();
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("reflection_journal").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast({ title: "Entry deleted" });
  };

  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setForm({ title: entry.title, content: entry.content, mood: entry.mood });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setForm({ title: "", content: "", mood: "neutral" });
    setEditingId(null);
    setDialogOpen(false);
  };

  const getMoodIcon = (mood: string) => {
    const m = moodOptions.find((o) => o.value === mood);
    if (!m) return null;
    const Icon = m.icon;
    return <Icon className={`h-4 w-4 ${m.color}`} />;
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Reflection Journal
            </CardTitle>
            <CardDescription>Record your thoughts, learnings, and reflections</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-1" /> New Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Entry" : "New Reflection"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <Input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <Textarea
                  placeholder="Write your reflection..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={5}
                />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">How are you feeling?</p>
                  <div className="flex gap-2">
                    {moodOptions.map((m) => (
                      <Button
                        key={m.value}
                        variant={form.mood === m.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setForm({ ...form, mood: m.value })}
                        className="flex items-center gap-1"
                      >
                        <m.icon className="h-4 w-4" />
                        <span className="text-xs">{m.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={saveEntry} disabled={!form.title.trim() || !form.content.trim()}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No journal entries yet. Start reflecting on your day!
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getMoodIcon(entry.mood)}
                    <h4 className="text-sm font-medium text-foreground">{entry.title}</h4>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(entry)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteEntry(entry.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.content}</p>
                <p className="text-xs text-muted-foreground mt-2">{formatDate(entry.journal_date)}</p>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReflectionJournal;
