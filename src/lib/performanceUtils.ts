export const getPerformanceBadgeLabel = (score: number): string => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Average";
  return "Needs Improvement";
};

export const getPerformanceBadgeColor = (score: number): string => {
  if (score >= 80)
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
  if (score >= 60)
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
};
