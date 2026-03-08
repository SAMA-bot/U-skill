export const getPerformanceBadgeLabel = (score: number): string => {
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 60) return "Average";
  return "Needs Improvement";
};

export const getPerformanceBadgeColor = (score: number): string => {
  if (score >= 80)
    return "bg-[rgba(59,130,246,0.15)] text-[#3b82f6] border-[rgba(59,130,246,0.3)] dark:bg-[rgba(59,130,246,0.2)] dark:text-[#60a5fa] dark:border-[rgba(59,130,246,0.4)]";
  if (score >= 70)
    return "bg-[rgba(34,197,94,0.15)] text-[#22c55e] border-[rgba(34,197,94,0.3)] dark:bg-[rgba(34,197,94,0.2)] dark:text-[#4ade80] dark:border-[rgba(34,197,94,0.4)]";
  if (score >= 60)
    return "bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border-[rgba(245,158,11,0.3)] dark:bg-[rgba(245,158,11,0.2)] dark:text-[#fbbf24] dark:border-[rgba(245,158,11,0.4)]";
  return "bg-[rgba(239,68,68,0.15)] text-[#ef4444] border-[rgba(239,68,68,0.3)] dark:bg-[rgba(239,68,68,0.2)] dark:text-[#f87171] dark:border-[rgba(239,68,68,0.4)]";
};
