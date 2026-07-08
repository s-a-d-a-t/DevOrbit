// ============================================================================
// ThemeContext.jsx  —  APP-WIDE LIGHT / DARK THEME STATE
// ----------------------------------------------------------------------------
// Same Context pattern as AuthContext, but for the visual theme. Any component
// can read the current theme ('light' | 'dark') and call toggleTheme() to flip it.
//
// HOW THE THEME ACTUALLY CHANGES THE LOOK: we set a `data-theme` attribute on the
// root <html> element. Our CSS then has rules like `:root[data-theme="dark"] { ... }`
// that swap colors. So JS's only job is to set that attribute; CSS does the painting.
// ============================================================================

import { createContext, useContext, useState } from 'react';
// Charts (from a charting library) don't read our CSS variables automatically,
// so we have a helper that re-colors them whenever the theme changes.
import { applyChartTheme } from '../chartTheme';

const ThemeContext = createContext(null);

// index.html stamps data-theme on <html> before anything renders,
// so it is the single source of truth for the initial value.
export function ThemeProvider({ children }) {
  // Initialize state by READING the attribute index.html already set. Passing a
  // function to useState (a "lazy initializer") means this runs only once, on
  // first render — not on every re-render.
  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  );

  // Flip between the two themes and persist the choice.
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next; // 1. tell CSS to repaint
    localStorage.setItem('dp_theme', next);        // 2. remember for next visit
    applyChartTheme(next);                          // 3. recolor the charts
    setTheme(next);                                 // 4. re-render subscribers
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

// Convenience hook: `const { theme, toggleTheme } = useTheme();`
export const useTheme = () => useContext(ThemeContext);
