import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  animated?: boolean;
  showGlow?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, animated = true, showGlow = false, ...props }, ref) => {
  const [displayValue, setDisplayValue] = React.useState(animated ? 0 : (value || 0));

  React.useEffect(() => {
    if (!animated) {
      setDisplayValue(value || 0);
      return;
    }
    // Delay to trigger CSS transition on mount
    const timer = setTimeout(() => setDisplayValue(value || 0), 100);
    return () => clearTimeout(timer);
  }, [value, animated]);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary/40", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 rounded-full bg-gradient-to-r from-primary via-primary/80 to-accent transition-all duration-700 ease-out",
          showGlow && "shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
        )}
        style={{ transform: `translateX(-${100 - (displayValue as number)}%)` }}
      />
      {/* Animated shimmer overlay */}
      {animated && (displayValue as number) > 0 && (displayValue as number) < 100 && (
        <div
          className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - (displayValue as number)}% 0 0)` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
        </div>
      )}
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
