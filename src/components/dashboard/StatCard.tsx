import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import AnimatedCounter from "@/components/dashboard/AnimatedCounter";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  badge?: { label: string; className?: string };
  index?: number;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
}

/**
 * Shared metric tile. Calm surface, tinted icon chip, tabular figure —
 * no heavy gradients, consistent across Faculty / HOD / Admin dashboards.
 */
const StatCard = ({
  icon: Icon,
  label,
  value,
  suffix,
  badge,
  index = 0,
  onClick,
  children,
  className,
  compact = false,
}: StatCardProps) => {
  const interactive = Boolean(onClick);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.3 }}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card transition-all duration-200",
        "hover:border-primary/30 hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.35)]",
        interactive && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        compact ? "p-4 gap-2" : "p-5 gap-3",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <p className="pt-1.5 text-[13px] font-medium leading-tight text-muted-foreground min-w-0 break-words">
          {label}
        </p>
        {interactive && (
          <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>

      <AnimatedCounter
        value={value}
        suffix={suffix}
        className={cn(
          "font-semibold tracking-tight text-foreground tabular-nums",
          compact ? "text-2xl" : "text-[28px] sm:text-3xl",
        )}
      />

      {badge && (
        <span
          className={cn(
            "inline-flex items-center self-start rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
            badge.className ?? "bg-muted text-muted-foreground border-border",
          )}
        >
          {badge.label}
        </span>
      )}

      {children && <div className="mt-auto flex flex-col gap-2 pt-1">{children}</div>}
    </motion.div>
  );
};

export default StatCard;
