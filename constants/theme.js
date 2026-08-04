import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@collectionapp_theme';
const defaultMode = 'light';

export const LIGHT_COLORS = {
  primary: '#6366F1',
  primaryDark: '#4338CA',
  primaryLight: '#818CF8',
  background: '#F0F1F8',
  white: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  success: '#22C55E',
  successBg: '#DCFCE7',
  successText: '#15803D',
  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  dangerText: '#991B1B',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  warningText: '#92400E',
  info: '#3B82F6',
  infoBg: '#DBEAFE',
  infoText: '#1D4ED8',
};

export const DARK_COLORS = {
  primary: '#818CF8',
  primaryDark: '#6366F1',
  primaryLight: '#A5B4FC',
  background: '#0D0F14',
  white: '#1A1D24',
  textPrimary: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#2A2E37',
  success: '#4ADE80',
  successBg: '#14311F',
  successText: '#86EFAC',
  danger: '#F87171',
  dangerBg: '#3B1414',
  dangerText: '#FCA5A5',
  warning: '#FBBF24',
  warningBg: '#3B2A0A',
  warningText: '#FDE68A',
  info: '#60A5FA',
  infoBg: '#122A4A',
  infoText: '#93C5FD',
};

// Backward-compatible static export — always light. Screens that need to react
// to the user's theme choice should use `useTheme()` instead.
export const COLORS = LIGHT_COLORS;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 100,
};

const ThemeContext = createContext({
  mode: defaultMode,
  colors: LIGHT_COLORS,
  isDark: false,
  toggleTheme: () => {},
  setMode: () => {},
});

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(defaultMode);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark') {
          setModeState(saved);
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const setMode = useCallback(async (next) => {
    if (next !== 'light' && next !== 'dark') return;
    setModeState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      mode,
      colors: mode === 'dark' ? DARK_COLORS : LIGHT_COLORS,
      isDark: mode === 'dark',
      toggleTheme,
      setMode,
    }),
    [mode, toggleTheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export { ThemeContext };

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
