import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'finoracle-theme';

/** Recharts / SVG colours that cannot use Tailwind classes. */
export interface ChartPalette {
  grid: string;
  tick: string;
  axis: string;
  text: string;
  surface: string;
  tooltipBg: string;
  tooltipBorder: string;
  primary: string;
  negative: string;
  ink: string;
}

const LIGHT_CHART: ChartPalette = {
  grid: '#E2E8F0',
  tick: '#64748B',
  axis: '#64748B',
  text: '#172B4D',
  surface: '#FFFFFF',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#E2E8F0',
  primary: '#159B72',
  negative: '#D65A50',
  ink: '#172B4D',
};

const DARK_CHART: ChartPalette = {
  grid: '#1E252E',
  tick: '#8693A3',
  axis: '#8693A3',
  text: '#E8EEF4',
  surface: '#0F1217',
  tooltipBg: '#12161C',
  tooltipBorder: '#26303B',
  primary: '#1FBF8B',
  negative: '#F06E64',
  ink: '#E8EEF4',
};

interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  chart: ChartPalette;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.style.colorScheme = mode;
  root.classList.toggle('dark', mode === 'dark');
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', mode === 'dark' ? '#080A0D' : '#FFFFFF');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // storage unavailable — theme still applies for this session
    }
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    setThemeState(mode);
    window.setTimeout(() => root.classList.remove('theme-transition'), 350);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark: theme === 'dark',
      chart: theme === 'dark' ? DARK_CHART : LIGHT_CHART,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so isolated component tests render without a provider
    return {
      theme: 'light',
      isDark: false,
      chart: LIGHT_CHART,
      setTheme: () => undefined,
      toggleTheme: () => undefined,
    };
  }
  return ctx;
}
