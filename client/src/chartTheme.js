// Chart-grade steps of the industrial palette — validated (CVD ΔE 16.2, ≥3:1 on #1B1D21).
// UI accents stay muted; these are their data-mark counterparts.
export const SERIES = ['#c08a1e', '#4f9e57', '#d95f26', '#5c8fd6', '#b04a5a'];
export const INK = { primary: '#F3F4F6', secondary: '#C7CBD1', muted: '#9CA3AF' };
export const GRID = '#26292e';
export const AXIS = '#33373d';
export const SURFACE = '#1B1D21';
// Sequential gold ramp for the heatmap (level 0 recedes to the surface).
export const HEAT = ['#22252a', '#55431c', '#7b5f22', '#a1802f', '#C9A86A'];

export const tooltipStyle = {
  background: '#22252a',
  border: '1px solid #3A4048',
  borderRadius: 8,
  color: INK.primary,
  fontSize: 12.5,
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  boxShadow: '0 12px 32px -12px rgba(0,0,0,.7)',
};
