// Chart-grade palettes for both themes. Exports are live bindings swapped by
// applyChartTheme(); components pick the new values up on their next render.
const MONO = "'JetBrains Mono', ui-monospace, monospace";

const THEMES = {
  // Warm minimal — terracotta-led, distinguishable on warm cream (#FBF9F5).
  light: {
    SERIES: ['#BF5A35', '#5F7D57', '#B4792B', '#8A3A57', '#4E6E74'],
    INK: { primary: '#211C16', secondary: '#453E34', muted: '#6C6355' },
    GRID: '#E7DFD2',
    AXIS: '#D3C9B9',
    SURFACE: '#FBF9F5',
    // Sequential terracotta ramp (level 0 recedes to the surface).
    HEAT: ['#ECE5DA', '#E8C9A9', '#DC9A63', '#C6702F', '#9E4A1E'],
    CURSOR: 'rgba(33, 28, 22, 0.05)',
    tooltipStyle: {
      background: '#FBF9F5',
      border: '1px solid #E1D8C9',
      borderRadius: 10,
      color: '#211C16',
      fontSize: 12.5,
      fontFamily: MONO,
      boxShadow: '0 12px 32px -12px rgba(60, 45, 30, .22)',
    },
  },
  // Warm charcoal dark — terracotta-led, lighter tints on #211C16.
  dark: {
    SERIES: ['#D77B50', '#8FB586', '#D9A95F', '#C98598', '#7FA6AD'],
    INK: { primary: '#F1EBDF', secondary: '#D6CDBD', muted: '#A59A87' },
    GRID: '#2C2619',
    AXIS: '#3A3324',
    SURFACE: '#211C16',
    // Sequential terracotta/gold ramp (level 0 recedes to the surface).
    HEAT: ['#282219', '#5A4222', '#8A5A2C', '#B77039', '#D77B50'],
    CURSOR: 'rgba(255, 255, 255, 0.04)',
    tooltipStyle: {
      background: '#282219',
      border: '1px solid #40392D',
      borderRadius: 10,
      color: '#F1EBDF',
      fontSize: 12.5,
      fontFamily: MONO,
      boxShadow: '0 12px 32px -12px rgba(0,0,0,.7)',
    },
  },
};

export let SERIES, INK, GRID, AXIS, SURFACE, HEAT, CURSOR, tooltipStyle;

export function applyChartTheme(mode) {
  ({ SERIES, INK, GRID, AXIS, SURFACE, HEAT, CURSOR, tooltipStyle } = THEMES[mode] ?? THEMES.light);
}

applyChartTheme(
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
    ? 'dark'
    : 'light'
);
