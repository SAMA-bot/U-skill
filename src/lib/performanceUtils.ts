export const getPerformanceBadgeLabel = (score: number): string => {
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 60) return "Average";
  return "Needs Improvement";
};

export const getPerformanceBadgeColor = (score: number): string => {
  if (score >= 80)
    return "bg-info/15 text-info border-info/30 dark:bg-info/20 dark:text-info dark:border-info/40";
  if (score >= 70)
    return "bg-success/15 text-success border-success/30 dark:bg-success/20 dark:text-success dark:border-success/40";
  if (score >= 60)
    return "bg-warning/15 text-warning border-warning/30 dark:bg-warning/20 dark:text-warning dark:border-warning/40";
  return "bg-destructive/15 text-destructive border-destructive/30 dark:bg-destructive/20 dark:text-destructive dark:border-destructive/40";
};
