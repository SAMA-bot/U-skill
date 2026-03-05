import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  checklist_date: string;
}

const DailyChecklist = () => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  const fetchItems = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("daily_checklist")
      .select("*")
      .eq("user_id", user.id)
      .eq("checklist_date", today)
      .order("created_at", { ascending: true });

    if (data) setItems(data as ChecklistItem[]);
    if (error) console.error(error);
    setLoading(false);
  };

  const addItem = async () => {
    if (!user || !newItem.trim()) return;
    const { data, error } = await supabase
      .from("daily_checklist")
      .insert({ user_id: user.id, title: newItem.trim(), checklist_date: today })
      .select()
      .single();

    if (data) {
      setItems((prev) => [...prev, data as ChecklistItem]);
      setNewItem("");
    }
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
  };

  const toggleItem = async (item: ChecklistItem) => {
    const { error } = await supabase
      .from("daily_checklist")
      .update({ completed: !item.completed })
      .eq("id", item.id);

    if (!error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, completed: !i.completed } : i)));
    }
  };

  const deleteItem = async (id: string) => {
    await supabase.from("daily_checklist").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const completedCount = items.filter((i) => i.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

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
          <CheckSquare className="h-5 w-5 text-primary" />
          Daily Productivity Checklist
        </CardTitle>
        <CardDescription>
          {completedCount}/{items.length} tasks completed today
        </CardDescription>
        {items.length > 0 && <Progress value={progress} className="h-2 mt-2" />}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Add a task..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <Button size="icon" onClick={addItem} disabled={!newItem.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 group"
            >
              <Checkbox
                checked={item.completed}
                onCheckedChange={() => toggleItem(item)}
              />
              <span
                className={`flex-1 text-sm ${
                  item.completed ? "line-through text-muted-foreground" : "text-foreground"
                }`}
              >
                {item.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteItem(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tasks yet. Add your first task for today!
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyChecklist;
