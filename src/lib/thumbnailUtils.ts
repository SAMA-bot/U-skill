/**
 * Generates a deterministic gradient thumbnail SVG data URL from a course title.
 * Each title produces a unique, visually distinct gradient.
 */

const GRADIENT_PAIRS = [
  ["#3b82f6", "#8b5cf6"], // blue → purple
  ["#06b6d4", "#3b82f6"], // cyan → blue
  ["#8b5cf6", "#ec4899"], // purple → pink
  ["#10b981", "#06b6d4"], // emerald → cyan
  ["#f59e0b", "#ef4444"], // amber → red
  ["#6366f1", "#06b6d4"], // indigo → cyan
  ["#ec4899", "#f59e0b"], // pink → amber
  ["#14b8a6", "#8b5cf6"], // teal → purple
  ["#f43f5e", "#a855f7"], // rose → violet
  ["#0ea5e9", "#22c55e"], // sky → green
];

const ICONS: Record<string, string> = {
  cyber: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  security: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  cloud: "M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z",
  ai: "M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1.27c.34-.6.99-1 1.73-1a2 2 0 110 4c-.74 0-1.39-.4-1.73-1H20a7 7 0 01-7 7v1.27c.6.34 1 .99 1 1.73a2 2 0 11-4 0c0-.74.4-1.39 1-1.73V23a7 7 0 01-7-7H2.73c-.34.6-.99 1-1.73 1a2 2 0 110-4c.74 0 1.39.4 1.73 1H4a7 7 0 017-7V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z",
  machine: "M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1.27c.34-.6.99-1 1.73-1a2 2 0 110 4c-.74 0-1.39-.4-1.73-1H20a7 7 0 01-7 7v1.27c.6.34 1 .99 1 1.73a2 2 0 11-4 0c0-.74.4-1.39 1-1.73V23a7 7 0 01-7-7H2.73c-.34.6-.99 1-1.73 1a2 2 0 110-4c.74 0 1.39.4 1.73 1H4a7 7 0 017-7V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z",
  web: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  data: "M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.58 4 8 4s8-1.79 8-4M4 7c0-2.21 3.58-4 8-4s8 1.79 8 4M4 12c0 2.21 3.58 4 8 4s8-1.79 8-4",
  teach: "M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z",
  lead: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2h0M9 7a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  default: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getIconPath(title: string): string {
  const lower = title.toLowerCase();
  for (const [keyword, path] of Object.entries(ICONS)) {
    if (keyword !== "default" && lower.includes(keyword)) return path;
  }
  return ICONS.default;
}

function getInitials(title: string): string {
  return title
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");
}

export function generateCourseThumbnail(title: string): string {
  const hash = hashString(title);
  const [color1, color2] = GRADIENT_PAIRS[hash % GRADIENT_PAIRS.length];
  const angle = (hash % 4) * 45 + 135;
  const iconPath = getIconPath(title);
  const initials = getInitials(title);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle})">
        <stop offset="0%" stop-color="${color1}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${color2}" stop-opacity="1"/>
      </linearGradient>
      <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="white" stop-opacity="0.1"/>
        <stop offset="100%" stop-color="black" stop-opacity="0.15"/>
      </linearGradient>
    </defs>
    <rect width="320" height="180" rx="12" fill="url(#bg)"/>
    <rect width="320" height="180" rx="12" fill="url(#overlay)"/>
    <circle cx="260" cy="40" r="60" fill="white" fill-opacity="0.06"/>
    <circle cx="60" cy="150" r="40" fill="white" fill-opacity="0.04"/>
    <g transform="translate(140, 50) scale(1.7)" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
      <path d="${iconPath}"/>
    </g>
    <text x="160" y="145" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="16" fill="white" opacity="0.85">${initials}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function getCourseThumbnail(course: { title: string; thumbnail_url: string | null }): string {
  return course.thumbnail_url || generateCourseThumbnail(course.title);
}
