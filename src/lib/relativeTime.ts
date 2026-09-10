/** Human friendly relative timestamps, e.g. "just now", "5m ago", "3d ago". */
export const formatRelativeTime = (date: Date): string => {
  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 0) {
    const ahead = Math.abs(diffSecs);
    if (ahead < 60) return "in a moment";
    if (ahead < 3600) return `in ${Math.floor(ahead / 60)}m`;
    if (ahead < 86400) return `in ${Math.floor(ahead / 3600)}h`;
    return `in ${Math.floor(ahead / 86400)}d`;
  }

  if (diffSecs < 45) return "Just now";
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  const diffDays = Math.floor(diffSecs / 86400);
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

export type TimeBucket = "Today" | "Yesterday" | "This week" | "Earlier";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Buckets a timestamp into a section label for grouped lists. */
export const getTimeBucket = (date: Date, now: Date = new Date()): TimeBucket => {
  const dayMs = 86_400_000;
  const diffDays = Math.floor((startOfDay(now) - startOfDay(date)) / dayMs);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This week";
  return "Earlier";
};

export const TIME_BUCKET_ORDER: TimeBucket[] = ["Today", "Yesterday", "This week", "Earlier"];
