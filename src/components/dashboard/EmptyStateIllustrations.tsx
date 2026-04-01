import { motion } from "framer-motion";

/**
 * Inline SVG illustrations for various empty states.
 * Each returns an animated SVG scene, no external assets needed.
 */

export const NoCoursesSVG = () => (
  <motion.svg
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
    viewBox="0 0 200 160"
    className="w-44 h-36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Book stack */}
    <motion.rect
      x="50" y="90" width="100" height="14" rx="3"
      fill="hsl(var(--primary))" fillOpacity="0.15"
      stroke="hsl(var(--primary))" strokeWidth="1.5" strokeOpacity="0.4"
      initial={{ y: 120 }} animate={{ y: 90 }} transition={{ delay: 0.2 }}
    />
    <motion.rect
      x="55" y="74" width="90" height="14" rx="3"
      fill="hsl(var(--accent))" fillOpacity="0.12"
      stroke="hsl(var(--accent))" strokeWidth="1.5" strokeOpacity="0.4"
      initial={{ y: 120 }} animate={{ y: 74 }} transition={{ delay: 0.3 }}
    />
    <motion.rect
      x="60" y="58" width="80" height="14" rx="3"
      fill="hsl(var(--primary))" fillOpacity="0.08"
      stroke="hsl(var(--primary))" strokeWidth="1.5" strokeOpacity="0.3"
      initial={{ y: 120 }} animate={{ y: 58 }} transition={{ delay: 0.4 }}
    />
    {/* Sparkle */}
    <motion.circle
      cx="145" cy="52" r="3"
      fill="hsl(var(--primary))" fillOpacity="0.6"
      animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    <motion.circle
      cx="52" cy="68" r="2"
      fill="hsl(var(--accent))" fillOpacity="0.5"
      animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.9, 0.5] }}
      transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
    />
    {/* Search magnifier */}
    <motion.g
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.6 }}
    >
      <circle cx="100" cy="35" r="14" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeOpacity="0.3" />
      <line x1="110" y1="45" x2="118" y2="53" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round" />
    </motion.g>
  </motion.svg>
);

export const NoDataSVG = () => (
  <motion.svg
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
    viewBox="0 0 200 160"
    className="w-44 h-36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Chart bars */}
    {[0, 1, 2, 3, 4].map((i) => (
      <motion.rect
        key={i}
        x={40 + i * 28}
        width="18"
        rx="4"
        fill={i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))"}
        fillOpacity={0.1 + i * 0.04}
        stroke={i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))"}
        strokeWidth="1"
        strokeOpacity="0.3"
        initial={{ y: 130, height: 0 }}
        animate={{ y: 130 - (20 + i * 12), height: 20 + i * 12 }}
        transition={{ delay: 0.2 + i * 0.1, duration: 0.4, ease: "easeOut" }}
      />
    ))}
    {/* Baseline */}
    <line x1="35" y1="132" x2="175" y2="132" stroke="hsl(var(--border))" strokeWidth="1.5" />
    {/* Floating question mark */}
    <motion.text
      x="100" y="42"
      textAnchor="middle"
      fontSize="28" fontWeight="700"
      fill="hsl(var(--muted-foreground))"
      fillOpacity="0.2"
      animate={{ y: [42, 36, 42] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      ?
    </motion.text>
  </motion.svg>
);

export const NoDocumentsSVG = () => (
  <motion.svg
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
    viewBox="0 0 200 160"
    className="w-44 h-36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Document */}
    <motion.g initial={{ y: 10 }} animate={{ y: 0 }} transition={{ delay: 0.2 }}>
      <rect x="60" y="30" width="80" height="100" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <rect x="72" y="50" width="56" height="4" rx="2" fill="hsl(var(--muted-foreground))" fillOpacity="0.15" />
      <rect x="72" y="62" width="40" height="4" rx="2" fill="hsl(var(--muted-foreground))" fillOpacity="0.12" />
      <rect x="72" y="74" width="48" height="4" rx="2" fill="hsl(var(--muted-foreground))" fillOpacity="0.1" />
      <rect x="72" y="86" width="32" height="4" rx="2" fill="hsl(var(--muted-foreground))" fillOpacity="0.08" />
    </motion.g>
    {/* Upload arrow */}
    <motion.g
      animate={{ y: [-2, 2, -2] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d="M100 20 L108 30 L104 30 L104 42 L96 42 L96 30 L92 30 Z" fill="hsl(var(--primary))" fillOpacity="0.4" />
    </motion.g>
  </motion.svg>
);

export const NoActivitySVG = () => (
  <motion.svg
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
    viewBox="0 0 200 160"
    className="w-44 h-36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Timeline */}
    <line x1="60" y1="30" x2="60" y2="130" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 4" />
    {[0, 1, 2].map((i) => (
      <motion.g key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.15 }}>
        <circle cx="60" cy={50 + i * 30} r="6" fill="hsl(var(--primary))" fillOpacity={0.2 - i * 0.05} stroke="hsl(var(--primary))" strokeWidth="1.5" strokeOpacity={0.4 - i * 0.1} />
        <rect x="76" y={44 + i * 30} width={60 - i * 10} height="12" rx="4" fill="hsl(var(--muted))" fillOpacity="0.5" />
      </motion.g>
    ))}
    {/* Clock */}
    <motion.g
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      style={{ transformOrigin: "150px 45px" }}
    >
      <circle cx="150" cy="45" r="16" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeOpacity="0.2" />
      <line x1="150" y1="45" x2="150" y2="35" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
      <line x1="150" y1="45" x2="158" y2="45" stroke="hsl(var(--primary))" strokeWidth="1" strokeOpacity="0.3" strokeLinecap="round" />
    </motion.g>
  </motion.svg>
);
