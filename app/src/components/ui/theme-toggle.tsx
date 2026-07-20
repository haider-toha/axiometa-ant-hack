'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// Dependency-free dark-mode toggle: flips the `dark` class on <html> and
// persists the choice. The token system ships both themes; this makes "test
// light and dark together" exercisable from the first render.

const STORAGE_KEY = 'theme';

function apply(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  window.localStorage.setItem(STORAGE_KEY, theme);
}

function ThemeToggle({ className, ...props }: React.ComponentProps<'button'>) {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initial = stored === 'dark' || stored === 'light' ? stored : system;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only theme hydration
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      data-slot="theme-toggle"
      aria-label={`Switch to ${next} theme`}
      className={cn(
        'inline-flex h-8 items-center justify-center rounded-md border border-input bg-transparent px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 outline-none',
        className,
      )}
      onClick={() => {
        setTheme(next);
        apply(next);
      }}
      {...props}
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}

export { ThemeToggle };
