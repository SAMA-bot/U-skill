import { Zap, BookOpen, GraduationCap, Flame } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserXp } from "@/hooks/useUserXp";
import { motion } from "framer-motion";

const XpSummaryCard = () => {
  const { total, lesson, course, streak, recent, loading } = useUserXp();

  const items = [
    { label: "Lessons", value: lesson, icon: BookOpen, color: "text-blue-500" },
    { label: "Courses", value: course, icon: GraduationCap, color: "text-green-500" },
    { label: "Streaks", value: streak, icon: Flame, color: "text-orange-500" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Total XP
        </CardTitle>
        <CardDescription>Earned across lessons, courses & streaks</CardDescription>
      </CardHeader>
      <CardContent>
        <motion.div
          key={total}
          initial={{ scale: 0.95, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-bold text-foreground mb-4"
        >
          {loading ? "—" : total} <span className="text-base font-normal text-muted-foreground">XP</span>
        </motion.div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <div key={it.label} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <Icon className={`h-4 w-4 mx-auto mb-1 ${it.color}`} />
                <p className="text-lg font-bold text-foreground">{it.value}</p>
                <p className="text-[10px] text-muted-foreground">{it.label}</p>
              </div>
            );
          })}
        </div>

        {recent.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground mb-1">Recent</p>
            {recent.slice(0, 4).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-foreground truncate flex-1 mr-2">{r.description || r.source_type}</span>
                <span className="text-primary font-semibold whitespace-nowrap">+{r.xp_amount} XP</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default XpSummaryCard;
