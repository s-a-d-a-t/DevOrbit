// Chart-grade palettes for both themes. Exports are live bindings swapped by
// applyChartTheme(); components pick the new values up on their next render.
const MONO = "'JetBrains Mono', ui-monospace, monospace";

const THEMES = {
  // WC26 daylight — validated (worst adjacent CVD ΔE 12.1, all ≥3:1 on #FFFFFF).
  light: {
    SERIES: ['#2B5FD9', '#177E3E', '#CC2B41', '#A16207', '#6D3FC4'],
    INK: { primary: '#0F1728', secondary: '#333F54', muted: '#66718A' },
    GRID: '#E7EAF0',
    AXIS: '#C9D0DC',
    SURFACE: '#FFFFFF',
    // Sequential pitch-green ramp (level 0 recedes to the surface).
    HEAT: ['#EAEEF2', '#B7E4C7', '#67C587', '#2FA35C', '#15713B'],
    CURSOR: 'rgba(15, 23, 40, 0.05)',
    tooltipStyle: {
      background: '#FFFFFF',
      border: '1px solid #D7DDE6',
      borderRadius: 8,
      color: '#0F1728',
      fontSize: 12.5,
      fontFamily: MONO,
      boxShadow: '0 12px 32px -12px rgba(15, 23, 40, .25)',
    },
  },
  // Industrial dark — validated (CVD ΔE 16.2, ≥3:1 on #1B1D21).
  dark: {
    SERIES: ['#c08a1e', '#4f9e57', '#d95f26', '#5c8fd6', '#b04a5a'],
    INK: { primary: '#F3F4F6', secondary: '#C7CBD1', muted: '#9CA3AF' },
    GRID: '#26292e',
    AXIS: '#33373d',
    SURFACE: '#1B1D21',
    // Sequential gold ramp (level 0 recedes to the surface).
    HEAT: ['#22252a', '#55431c', '#7b5f22', '#a1802f', '#C9A86A'],
    CURSOR: 'rgba(255, 255, 255, 0.04)',
    tooltipStyle: {
      background: '#22252a',
      border: '1px solid #3A4048',
      borderRadius: 8,
      color: '#F3F4F6',
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
