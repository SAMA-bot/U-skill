import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for system theme changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      console.log('[ThemeToggle] System theme changed to:', mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const handleRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setTimeout(() => setRipple(null), 500);
  }, []);

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    handleRipple(e);
    const newTheme = isDark ? 'light' : 'dark';
    console.log('[ThemeToggle] Switching theme:', resolvedTheme, '→', newTheme);
    setTheme(newTheme);
  }, [isDark, resolvedTheme, setTheme, handleRipple]);

  if (!mounted) {
    return (
      <button
        className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-secondary/50"
        aria-label="Toggle theme"
      >
        <Sun className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <motion.button
      ref={buttonRef}
      onClick={toggleTheme}
      className="relative w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden bg-secondary/50 hover:bg-secondary border border-border/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      whileTap={{ scale: 0.9 }}
    >
      {/* Ripple effect */}
      <AnimatePresence>
        {ripple && (
          <motion.span
            key={`${ripple.x}-${ripple.y}`}
            className="absolute rounded-full bg-primary/20 pointer-events-none"
            initial={{ width: 0, height: 0, opacity: 0.5 }}
            animate={{ width: 80, height: 80, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              left: ripple.x - 40,
              top: ripple.y - 40,
            }}
          />
        )}
      </AnimatePresence>

      {/* Animated icon swap */}
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.div
            key="sun"
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Sun className="w-[18px] h-[18px] text-amber-400" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ rotate: 90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Moon className="w-[18px] h-[18px] text-primary" />
          </motion.div>
        )}
      </AnimatePresence>

      <span className="sr-only">Toggle theme</span>
    </motion.button>
  );
}
