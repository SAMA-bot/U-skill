import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: ReactNode;
  className?: string;
}

/**
 * Consistent page header used across all dashboard sections.
 * Linear/Notion inspired: tight type scale, muted eyebrow, right-aligned actions.
 */
const PageHeader = ({ eyebrow, title, description, icon: Icon, actions, className }: PageHeaderProps) => (
  <motion.div
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className={cn(
      "flex flex-col gap-4 pb-5 mb-6 border-b border-border/70 md:flex-row md:items-end md:justify-between",
      className,
    )}
  >
    <div className="min-w-0">
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 mb-1.5">
          {eyebrow}
        </p>
      )}
      <h1 className="text-[22px] sm:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
        {Icon && (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
        <span className="truncate">{title}</span>
      </h1>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">{description}</p>
      )}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
  </motion.div>
);

export default PageHeader;
