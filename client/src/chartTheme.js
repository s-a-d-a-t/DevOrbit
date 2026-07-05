// Categorical series: dark-surface palette, validated for CVD separation and 3:1 contrast.
export const SERIES = ['#3987e5', '#199e70', '#c98500', '#008300', '#9085e9', '#e66767'];
export const INK = { primary: '#f4f4f8', secondary: '#b8b8c6', muted: '#6f6f7e' };
export const GRID = '#23232e';
export const AXIS = '#2e2e3b';
export const SURFACE = '#121218';
// Sequential lime ramp for the heatmap (level 0 = no activity, recedes to surface).
export const HEAT = ['#1b1b23', '#2c4a12', '#4a7719', '#71ab24', '#a3e635'];

export const tooltipStyle = {
  background: '#191922',
  border: '1px solid #2e2e3b',
  borderRadius: 10,
  color: INK.primary,
  fontSize: 12.5,
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
};
