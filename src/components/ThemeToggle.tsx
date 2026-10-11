import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="switch"
          aria-checked={isDark}
          aria-label={label}
          disabled={!mounted}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="h-9 w-[76px] shrink-0 gap-1 rounded-lg bg-secondary/50 p-1"
        >
          <span className={`flex h-7 w-7 items-center justify-center rounded-md ${!isDark ? 'bg-card text-primary-ink' : 'text-muted-foreground'}`}>
            <Sun aria-hidden="true" />
          </span>
          <span className={`flex h-7 w-7 items-center justify-center rounded-md ${isDark ? 'bg-card text-primary-ink' : 'text-muted-foreground'}`}>
            <Moon aria-hidden="true" />
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
