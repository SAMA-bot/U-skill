import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeToggle } from './ThemeToggle';

function renderToggle() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="app-theme">
      <TooltipProvider><ThemeToggle /></TooltipProvider>
    </ThemeProvider>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove('dark', 'light');
});

describe('Theme selection persistence', () => {
  it('saves an explicit dark selection and restores it after remounting', async () => {
    localStorage.setItem('app-theme', 'light');
    const first = renderToggle();
    await userEvent.click(await screen.findByRole('switch', { name: 'Switch to dark mode' }));
    await waitFor(() => expect(localStorage.getItem('app-theme')).toBe('dark'));
    expect(document.documentElement).toHaveClass('dark');
    first.unmount();
    renderToggle();
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true'));
    expect(document.documentElement).toHaveClass('dark');
  });

  it('saves an explicit light selection and restores it after remounting', async () => {
    localStorage.setItem('app-theme', 'dark');
    const first = renderToggle();
    await userEvent.click(await screen.findByRole('switch', { name: 'Switch to light mode' }));
    await waitFor(() => expect(localStorage.getItem('app-theme')).toBe('light'));
    expect(document.documentElement).not.toHaveClass('dark');
    first.unmount();
    renderToggle();
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false'));
    expect(document.documentElement).not.toHaveClass('dark');
  });
});