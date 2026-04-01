import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface SmartEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  illustrationColor?: string;
  illustration?: ReactNode;
}

const SmartEmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  illustrationColor = "from-primary/20 to-accent/20",
  illustration,
}: SmartEmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {/* Illustration or icon */}
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : (
        <div className="relative mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="relative z-10"
          >
            <div className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${illustrationColor} flex items-center justify-center shadow-lg`}>
              <Icon className="h-10 w-10 text-primary" />
            </div>
          </motion.div>
          {/* Decorative rings */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.3 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="absolute -inset-3 rounded-3xl border-2 border-dashed border-primary/20"
          />
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.15 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="absolute -inset-6 rounded-[2rem] border-2 border-dashed border-primary/10"
          />
          {/* Floating dots */}
          <motion.div
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-primary/30"
          />
          <motion.div
            animate={{ y: [3, -3, 3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute -bottom-1 -left-3 h-2 w-2 rounded-full bg-accent/40"
          />
        </div>
      )}

      {/* Text */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-semibold text-foreground mb-2"
      >
        {title}
      </motion.h3>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed"
      >
        {description}
      </motion.p>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap items-center gap-3"
      >
        {actionLabel && onAction && (
          <Button onClick={onAction} className="gap-2">
            <Icon className="h-4 w-4" />
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="outline" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
};

export default SmartEmptyState;
