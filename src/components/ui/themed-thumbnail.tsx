import { useTheme } from "next-themes";
import { getCourseThumbnail, getPathThumbnail } from "@/lib/thumbnailUtils";

interface ThemedThumbnailProps {
  item: { title: string; thumbnail_url?: string | null };
  kind?: "course" | "path";
  className?: string;
}

/** Re-resolves generated SVG colors when the global theme changes. */
export function ThemedThumbnail({ item, kind = "path", className }: ThemedThumbnailProps) {
  const { resolvedTheme } = useTheme();
  const source = kind === "course"
    ? getCourseThumbnail({ ...item, thumbnail_url: item.thumbnail_url ?? null })
    : getPathThumbnail(item);
  return <img key={resolvedTheme} src={source} alt={item.title} className={className} />;
}