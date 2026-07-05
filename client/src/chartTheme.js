// Dark-surface palette, validated for CVD separation and 3:1 contrast on #1a1a19.
export const SERIES = ['#3987e5', '#199e70', '#c98500', '#008300', '#9085e9', '#e66767'];
export const INK = { primary: '#ffffff', secondary: '#c3c2b7', muted: '#898781' };
export const GRID = '#2c2c2a';
export const AXIS = '#383835';
export const SURFACE = '#1a1a19';
// Sequential blue ramp for the heatmap (level 0 = no activity, recedes to surface).
export const HEAT = ['#242423', '#104281', '#1c5cab', '#2a78d6', '#5598e7'];
export const STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' };

export const tooltipStyle = {
  background: '#242423',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: INK.primary,
  fontSize: 13,
};
