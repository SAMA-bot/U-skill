import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TourStep {
  /** Value of data-tour attribute to highlight */
  target: string;
  title: string;
  description: string;
}

interface OnboardingTourProps {
  /** Unique key per role so each user sees their own tour once */
  storageKey: string;
  steps: TourStep[];
  /** Force start (e.g. from a "Take tour" button) */
  autoStart?: boolean;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;

const OnboardingTour = ({ storageKey, steps, autoStart = true }: OnboardingTourProps) => {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // Filter to steps whose targets actually exist in the DOM
  const visibleSteps = steps;

  useEffect(() => {
    if (!autoStart) return;
    try {
      if (!localStorage.getItem(storageKey)) {
        // Slight delay so sidebar mounts first
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, [autoStart, storageKey]);

  const measure = useCallback(() => {
    const step = visibleSteps[stepIndex];
    if (!step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [stepIndex, visibleSteps]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, measure]);

  const finish = () => {
    try {
      localStorage.setItem(storageKey, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setOpen(false);
    setStepIndex(0);
  };

  if (!open || visibleSteps.length === 0) return null;

  const step = visibleSteps[stepIndex];
  const isLast = stepIndex === visibleSteps.length - 1;

  // Position tooltip: to the right of the highlight on desktop, below on mobile
  const tooltipStyle: React.CSSProperties = rect
    ? (() => {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          return {
            top: Math.min(rect.top + rect.height + PADDING + 8, window.innerHeight - 260),
            left: 16,
            right: 16,
            maxWidth: "unset",
          };
        }
        return {
          top: Math.max(16, Math.min(rect.top, window.innerHeight - 260)),
          left: rect.left + rect.width + PADDING + 16,
          width: 320,
        };
      })()
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 320 };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[100]"
        aria-live="polite"
      >
        {/* Dim backdrop with spotlight cutout via box-shadow */}
        <div
          className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          style={
            rect
              ? {
                  background: "transparent",
                  boxShadow: `0 0 0 9999px hsl(var(--background) / 0.75)`,
                  clipPath: "none",
                }
              : undefined
          }
          onClick={finish}
        />

        {/* Spotlight ring */}
        {rect && (
          <motion.div
            layout
            initial={false}
            animate={{
              top: rect.top - PADDING,
              left: rect.left - PADDING,
              width: rect.width + PADDING * 2,
              height: rect.height + PADDING * 2,
            }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="pointer-events-none absolute rounded-xl ring-2 ring-primary shadow-[0_0_0_9999px_hsl(var(--background)/0.78)]"
            style={{
              boxShadow:
                "0 0 0 9999px hsl(var(--background) / 0.78), 0 0 24px 4px hsl(var(--primary) / 0.55)",
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          key={`tip-${stepIndex}`}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="absolute glass-card p-5 rounded-xl border border-border/60 shadow-2xl"
          style={tooltipStyle}
          role="dialog"
          aria-labelledby="tour-title"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {stepIndex + 1} of {visibleSteps.length}
                </p>
                <h3 id="tour-title" className="text-sm font-bold text-foreground leading-tight">
                  {step.title}
                </h3>
              </div>
            </div>
            <button
              onClick={finish}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {step.description}
          </p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mb-4">
            {visibleSteps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === stepIndex
                    ? "w-6 bg-gradient-to-r from-blue-500 to-purple-600"
                    : i < stepIndex
                    ? "w-1.5 bg-primary/60"
                    : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={finish}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                >
                  Back
                </Button>
              )}
              <Button
                size="sm"
                variant="gradient"
                onClick={() => (isLast ? finish() : setStepIndex((i) => i + 1))}
              >
                {isLast ? "Got it" : "Next"}
                {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default OnboardingTour;
