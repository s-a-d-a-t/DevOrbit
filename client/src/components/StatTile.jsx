// ============================================================================
// StatTile.jsx  —  A SINGLE "STAT" CARD (a small KPI box)
// ----------------------------------------------------------------------------
// These are the little cards at the top of the Dashboard/Analytics that show one
// number: "12 tasks done", "3.5h learning", etc. This is a tiny "presentational"
// component — it has no state and no logic; it just takes props and displays them.
// Reusing it keeps every stat card visually identical.
// ============================================================================

import { IconArrowUpRight } from './icons';

// Props:
//   label   - the caption under/over the number ("Tasks completed").
//   value   - the big number/text itself.
//   delta   - optional change indicator text ("+12%").
//   up      - boolean: is the delta a positive/upward change? (styles it green-ish)
//   feature - boolean: render the larger "featured" variant.
//   icon    - optional icon element shown in the corner.
export default function StatTile({ label, value, delta, up, feature, icon }) {
  return (
    // Conditionally append the ' feature' class when `feature` is true.
    <div className={`stat-card${feature ? ' feature' : ''}`}>
      <div className="stat-card-head">
        {/* Show the icon only if one was passed in. */}
        {icon && <span className="stat-card-icon">{icon}</span>}
        <span className="stat-card-arrow"><IconArrowUpRight size={14} /></span>
      </div>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {/* Show the delta line only if provided; add the `up` class for upward changes. */}
      {delta && <div className={`delta ${up ? 'up' : ''}`}>{delta}</div>}
    </div>
  );
}
