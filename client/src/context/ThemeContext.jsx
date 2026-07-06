import { createContext, useContext, useState } from 'react';
import { applyChartTheme } from '../chartTheme';

const ThemeContext = createContext(null);

// index.html stamps data-theme on <html> before anything renders,
// so it is the single source of truth for the initial value.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  );

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('dp_theme', next);
    applyChartTheme(next);
    setTheme(next);
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
