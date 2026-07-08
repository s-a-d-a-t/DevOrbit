// ============================================================================
// chartTheme.js  —  COLOR PALETTES FOR THE CHARTS, IN BOTH LIGHT & DARK
// ----------------------------------------------------------------------------
// WHY THIS EXISTS: our regular UI colors live in CSS variables, but the charting
// library draws to <canvas>/<svg> using plain JavaScript values, so it can't read
// CSS. This file holds the exact colors charts should use, for each theme, as JS
// constants — and swaps them when the user toggles the theme.
//
// THE CLEVER BIT — "live bindings": at the bottom we export `let` variables
// (SERIES, INK, ...). `applyChartTheme()` REASSIGNS them. Because ES modules
// export live references (not copies), any component that imported `SERIES` sees
// the new value on its next render. That's how one function recolors every chart.
// ============================================================================

// A reusable font stack for chart text (tooltips, labels). Falls back gracefully
// if JetBrains Mono isn't available.
const MONO = "'JetBrains Mono', ui-monospace, monospace";

// The two complete palettes. Each key (SERIES, INK, GRID, ...) is a role a chart
// needs a color for. Keeping them side by side makes it easy to keep the two
// themes visually consistent.
const THEMES = {
  // Warm minimal — terracotta-led, distinguishable on warm cream (#FBF9F5).
  light: {
    SERIES: ['#BF5A35', '#5F7D57', '#B4792B', '#8A3A57', '#4E6E74'], // one color per data series (line/bar #1, #2, ...)
    INK: { primary: '#211C16', secondary: '#453E34', muted: '#6C6355' }, // text colors, by importance
    GRID: '#E7DFD2',   // the faint background grid lines
    AXIS: '#D3C9B9',   // the x/y axis lines
    SURFACE: '#FBF9F5',// the chart's background (matches the page)
    // Sequential terracotta ramp (level 0 recedes to the surface).
    // Used by the Heatmap: index 0 = no activity, index 4 = most activity.
    HEAT: ['#ECE5DA', '#E8C9A9', '#DC9A63', '#C6702F', '#9E4A1E'],
    CURSOR: 'rgba(33, 28, 22, 0.05)', // the highlight box that follows the mouse on a chart
    // Inline styles for the little popup box that appears when you hover a data point.
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

// These are the "live bindings" other files import. They start undefined and get
// filled in by applyChartTheme() below. Declared with `let` (not `const`) precisely
// so they can be reassigned when the theme changes.
export let SERIES, INK, GRID, AXIS, SURFACE, HEAT, CURSOR, tooltipStyle;

// Swap all the exported colors to the requested theme's palette. The `?? THEMES.light`
// is a safety fallback: if `mode` is anything unexpected, default to light.
// The parentheses around the assignment let us destructure into already-declared
// variables (a JS syntax requirement for "assign, don't declare").
export function applyChartTheme(mode) {
  ({ SERIES, INK, GRID, AXIS, SURFACE, HEAT, CURSOR, tooltipStyle } = THEMES[mode] ?? THEMES.light);
}

// Run once at import time to set the initial palette. We check `typeof document`
// because this file could theoretically run where there's no browser DOM
// (e.g. server-side); guarding avoids a crash. Otherwise: match whatever theme
// index.html already put on <html>.
applyChartTheme(
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
    ? 'dark'
    : 'light'
);
