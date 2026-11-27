import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  /** `switch` = full labelled switch (sidebar); `icon` = compact round button. */
  variant?: 'switch' | 'icon';
  collapsed?: boolean;
  className?: string;
}

/** Light ⇄ HUD Dark theme switch. Persisted in localStorage (`finoracle-theme`). */
export function ThemeToggle({ variant = 'switch', collapsed = false, className = '' }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? 'Switch to Light mode' : 'Switch to HUD Dark mode';

  if (variant === 'icon' || collapsed) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        title={label}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border border-card-border bg-card text-text-secondary transition-all hover:border-primary hover:text-primary hover:shadow-glow ${className}`}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={label}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-card-hover hover:text-text-primary ${className}`}
    >
      {isDark ? (
        <Moon className="h-5 w-5 flex-shrink-0 text-primary" />
      ) : (
        <Sun className="h-5 w-5 flex-shrink-0 text-text-muted group-hover:text-text-secondary" />
      )}
      <span className="truncate">{isDark ? 'HUD Dark Mode' : 'Light Mode'}</span>
      <span
        className={`ml-auto relative h-5 w-9 flex-shrink-0 rounded-full border transition-colors ${
          isDark ? 'border-primary bg-primary/30' : 'border-card-border bg-background-secondary'
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
            isDark ? 'left-[18px] bg-primary shadow-[0_0_8px_rgba(31,191,139,0.8)]' : 'left-0.5 bg-text-dim'
          }`}
        />
      </span>
    </button>
  );
}
