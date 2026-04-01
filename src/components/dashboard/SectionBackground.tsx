import { cn } from "@/lib/utils";

interface SectionBackgroundProps {
  variant?: "dots" | "grid" | "gradient" | "mesh";
  className?: string;
  children: React.ReactNode;
}

/**
 * Decorative section wrapper with subtle background patterns.
 * Adds visual depth without overwhelming content.
 */
const SectionBackground = ({ variant = "dots", className, children }: SectionBackgroundProps) => {
  return (
    <div className={cn("relative", className)}>
      {/* Pattern overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
        {variant === "dots" && (
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        )}
        {variant === "grid" && (
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        )}
        {variant === "gradient" && (
          <>
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-accent/5 rounded-full blur-3xl" />
          </>
        )}
        {variant === "mesh" && (
          <>
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-primary/[0.03] to-transparent" />
            <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-accent/[0.03] to-transparent" />
          </>
        )}
      </div>
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default SectionBackground;
