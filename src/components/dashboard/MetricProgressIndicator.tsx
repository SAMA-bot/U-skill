import { motion } from "framer-motion";

interface MetricProgressIndicatorProps {
  type: "capacity" | "performance" | "motivation" | "training_hours";
  value: number;
  maxValue?: number;
}

const getColorForScore = (score: number) => {
  if (score >= 80) return "hsl(217, 91%, 60%)";   // blue
  if (score >= 70) return "hsl(142, 71%, 45%)";    // green
  if (score >= 60) return "hsl(38, 92%, 50%)";     // amber
  return "hsl(0, 84%, 60%)";                       // red
};

/** Capacity: horizontal progress bar */
const CapacityBar = ({ value }: { value: number }) => {
  const color = getColorForScore(value);
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
      />
    </div>
  );
};

/** Performance: three-dot status indicator with pulse on active */
const PerformanceDots = ({ value }: { value: number }) => {
  const tier = value >= 80 ? 3 : value >= 60 ? 2 : value > 0 ? 1 : 0;
  const colors = [
    "hsl(0, 84%, 60%)",
    "hsl(38, 92%, 50%)",
    "hsl(142, 71%, 45%)",
  ];

  return (
    <div className="flex items-center gap-1.5 justify-center">
      {[0, 1, 2].map((i) => {
        const active = i < tier;
        return (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: active ? colors[i] : "hsl(var(--muted))",
            }}
            initial={{ scale: 0 }}
            animate={{
              scale: 1,
              ...(active && i === tier - 1
                ? { boxShadow: [`0 0 0px ${colors[i]}`, `0 0 6px ${colors[i]}`, `0 0 0px ${colors[i]}`] }
                : {}),
            }}
            transition={{
              scale: { duration: 0.3, delay: 0.4 + i * 0.1 },
              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        );
      })}
    </div>
  );
};

/** Motivation: mini circular progress ring */
const MotivationRing = ({ value }: { value: number }) => {
  const color = getColorForScore(value);
  const circumference = 2 * Math.PI * 14;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="mx-auto">
      <circle
        cx="18" cy="18" r="14"
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="3"
      />
      <motion.circle
        cx="18" cy="18" r="14"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
};

/** Training: segmented time blocks */
const TrainingBlocks = ({ value, maxValue = 200 }: { value: number; maxValue?: number }) => {
  const segments = 5;
  const filled = Math.min(Math.round((value / maxValue) * segments), segments);

  return (
    <div className="flex items-center gap-1 justify-center">
      {Array.from({ length: segments }).map((_, i) => (
        <motion.div
          key={i}
          className="h-2 rounded-sm"
          style={{
            width: 12,
            backgroundColor: i < filled ? "hsl(var(--primary))" : "hsl(var(--muted))",
          }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
        />
      ))}
    </div>
  );
};

const MetricProgressIndicator = ({ type, value, maxValue }: MetricProgressIndicatorProps) => {
  switch (type) {
    case "capacity":
      return <CapacityBar value={value} />;
    case "performance":
      return <PerformanceDots value={value} />;
    case "motivation":
      return <MotivationRing value={value} />;
    case "training_hours":
      return <TrainingBlocks value={value} maxValue={maxValue} />;
    default:
      return null;
  }
};

export default MetricProgressIndicator;
