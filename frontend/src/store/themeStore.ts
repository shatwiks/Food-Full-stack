import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const applyThemeToDOM = (theme: ThemeMode) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () =>
        set((state) => {
          const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
          applyThemeToDOM(nextTheme);
          return { theme: nextTheme };
        }),
      setTheme: (theme: ThemeMode) => {
        applyThemeToDOM(theme);
        set({ theme });
      },
    }),
    {
      name: 'orderflow-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDOM(state.theme);
        } else {
          applyThemeToDOM('dark');
        }
      },
    }
  )
);

// Initial application on module load
if (typeof document !== 'undefined') {
  const saved = localStorage.getItem('orderflow-theme');
  let initialTheme: ThemeMode = 'dark';
  try {
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.state?.theme === 'light' || parsed.state?.theme === 'dark') {
        initialTheme = parsed.state.theme;
      }
    }
  } catch {
    // fallback
  }
  applyThemeToDOM(initialTheme);
}
