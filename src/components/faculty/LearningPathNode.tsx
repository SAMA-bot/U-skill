import { motion } from "framer-motion";
import { Lock, CheckCircle2, Play, Video, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export type NodeState = "locked" | "available" | "in_progress" | "completed";

interface LearningPathNodeProps {
  title: string;
  state: NodeState;
  contentType: string;
  xp: number;
  index: number;
  onClick: () => void;
}

const stateConfig: Record<NodeState, { bg: string; border: string; icon: typeof Lock; iconColor: string; pulse: boolean }> = {
  locked: {
    bg: "bg-muted/60",
    border: "border-border/50",
    icon: Lock,
    iconColor: "text-muted-foreground/50",
    pulse: false,
  },
  available: {
    bg: "bg-gradient-to-br from-primary to-primary/80",
    border: "border-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.3)]",
    icon: Play,
    iconColor: "text-primary-foreground",
    pulse: true,
  },
  in_progress: {
    bg: "bg-gradient-to-br from-accent to-accent/80",
    border: "border-accent/60 shadow-[0_0_20px_hsl(var(--accent)/0.3)]",
    icon: Play,
    iconColor: "text-accent-foreground",
    pulse: true,
  },
  completed: {
    bg: "bg-gradient-to-br from-success to-success/80",
    border: "border-success/60",
    icon: CheckCircle2,
    iconColor: "text-success-foreground",
    pulse: false,
  },
};

const getContentIcon = (contentType: string) => {
  switch (contentType) {
    case "platform_video": return <Video className="h-3.5 w-3.5" />;
    case "pdf_course": return <FileText className="h-3.5 w-3.5" />;
    case "external_url": return <ExternalLink className="h-3.5 w-3.5" />;
    default: return <Play className="h-3.5 w-3.5" />;
  }
};

const LearningPathNode = ({ title, state, contentType, xp, index, onClick }: LearningPathNodeProps) => {
  const config = stateConfig[state];
  const Icon = config.icon;
  const isInteractive = state !== "locked";
  
  // Zigzag offset: alternate left and right
  const offsetX = index % 2 === 0 ? -40 : 40;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 200 }}
      className="flex flex-col items-center"
      style={{ transform: `translateX(${offsetX}px)` }}
    >
      {/* Node button */}
      <motion.button
        whileHover={isInteractive ? { scale: 1.12 } : undefined}
        whileTap={isInteractive ? { scale: 0.95 } : undefined}
        disabled={!isInteractive}
        onClick={onClick}
        className={cn(
          "relative flex items-center justify-center w-16 h-16 rounded-full border-[3px] transition-all duration-300",
          config.bg,
          config.border,
          isInteractive ? "cursor-pointer" : "cursor-not-allowed opacity-60",
        )}
      >
        {/* Pulse ring for available/in_progress */}
        {config.pulse && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-current" />
        )}
        <Icon className={cn("h-6 w-6 relative z-10", config.iconColor)} />
      </motion.button>

      {/* Title + XP label */}
      <div className="mt-2 text-center max-w-[140px]">
        <p className={cn(
          "text-xs font-semibold leading-tight line-clamp-2",
          state === "locked" ? "text-muted-foreground/50" : "text-foreground"
        )}>
          {title}
        </p>
        <div className="flex items-center justify-center gap-1 mt-1">
          {getContentIcon(contentType)}
          <span className={cn(
            "text-[10px] font-bold",
            state === "completed" ? "text-success" : state === "locked" ? "text-muted-foreground/40" : "text-primary"
          )}>
            +{xp} XP
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default LearningPathNode;
