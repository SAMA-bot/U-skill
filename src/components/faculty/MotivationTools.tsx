import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import GoalSetting from "./GoalSetting";
import DailyChecklist from "./DailyChecklist";
import ReflectionJournal from "./ReflectionJournal";
import MotivationIndexCard from "./MotivationIndexCard";
import StreakTracker from "./StreakTracker";
import AchievementBadges from "./AchievementBadges";

const MotivationTools = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Motivation Tools
        </h1>
        <p className="text-muted-foreground mt-1">
          Stay motivated, track your streaks, and earn achievements
        </p>
      </div>

      {/* Top row: Motivation Index + Streaks + Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MotivationIndexCard />
        <StreakTracker />
        <DailyChecklist />
      </div>

      {/* Achievement Badges */}
      <AchievementBadges />

      {/* Goal Setting */}
      <GoalSetting />

      {/* Reflection Journal */}
      <ReflectionJournal />
    </motion.div>
  );
};

export default MotivationTools;
