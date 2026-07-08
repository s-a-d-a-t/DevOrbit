// ============================================================================
// Heatmap.jsx  —  A GITHUB-STYLE "CONTRIBUTION CALENDAR"
// ----------------------------------------------------------------------------
// You know the grid of little squares on a GitHub profile showing how active you
// were each day? This builds the same thing from your activity data: one column
// per week, seven rows (Sunday..Saturday), each square shaded darker the more you
// did that day.
//
// The tricky part is turning a flat list of {date, score} into a 2D grid of weeks,
// which is what the useMemo block below does.
// ============================================================================

import { useMemo } from 'react';
import { HEAT } from '../chartTheme'; // the 5-step color ramp (index 0..4)

// Convert a Date into a "YYYY-MM-DD" string in the LOCAL timezone.
// Why the offset math: toISOString() converts to UTC, which can shift the date
// across midnight. We subtract the timezone offset first so the day stays correct
// for the user's local time.
const dayKey = (d) => {
  const tz = d.getTimezoneOffset() * 60000; // offset in milliseconds
  return new Date(d - tz).toISOString().slice(0, 10); // keep just the date part
};

// GitHub-style contribution calendar: columns are weeks, rows Sun–Sat.
// Props: `data` = array of { date, score, ... }; `days` = how far back to show.
export default function Heatmap({ data, days = 365 }) {
  // useMemo caches this expensive calculation and only re-runs it when `data` or
  // `days` change — not on every unrelated re-render. It returns the grid plus
  // the month labels and the max score (used to decide shading intensity).
  const { weeks, monthLabels, max } = useMemo(() => {
    // Build a lookup so we can find a day's data by its date string in O(1).
    const byDate = Object.fromEntries((data || []).map((d) => [d.date, d]));

    const end = new Date();            // today
    const start = new Date();
    start.setDate(end.getDate() - days + 1); // go back `days` days
    start.setDate(start.getDate() - start.getDay()); // align to Sunday // step back to the nearest Sunday so columns are whole weeks

    const weeks = [];      // the output: an array of columns, each column = 7 days
    let max = 1;           // track the busiest day's score (min 1 to avoid /0)
    const monthLabels = []; // where to place "Jan", "Feb"... above the grid
    let lastMonth = -1;    // helps us add a label only when the month changes

    // Walk week by week from `start` to `end` (w advances 7 days each loop).
    for (let w = new Date(start); w <= end; w.setDate(w.getDate() + 7)) {
      const col = []; // this week's 7 cells
      for (let i = 0; i < 7; i++) {
        const d = new Date(w);
        d.setDate(d.getDate() + i); // the i-th day of this week
        if (d > end) break;          // don't render future days
        const cell = byDate[dayKey(d)]; // this day's data, if any
        if (cell?.score > max) max = cell.score; // update the running maximum
        col.push({ date: dayKey(d), ...cell });  // store date + any activity fields
      }
      // When we cross into a new month, remember to print its short label here.
      if (w.getMonth() !== lastMonth) {
        monthLabels.push({ index: weeks.length, label: w.toLocaleString('en', { month: 'short' }) });
        lastMonth = w.getMonth();
      }
      weeks.push(col);
    }
    return { weeks, monthLabels, max };
  }, [data, days]);

  // Map a raw score to a shade level 0..4 based on how it compares to the max.
  // 0 = no activity; 4 = in the top quarter of your activity.
  const levelOf = (score) => {
    if (!score) return 0;
    const t = score / max; // fraction of the busiest day (0..1)
    return t > 0.75 ? 4 : t > 0.5 ? 3 : t > 0.25 ? 2 : 1;
  };

  return (
    <div className="heatmap">
      {/* Month labels row. Each label's width spans the number of week-columns until
          the next month starts (× 15px per column, minus a small gap). */}
      <div className="heatmap-months">
        {monthLabels.map((m, i) => {
          const next = monthLabels[i + 1]?.index ?? weeks.length; // start of next month, or the end
          return (
            <span key={m.index} style={{ width: (next - m.index) * 15 - 4 }}>
              {m.label}
            </span>
          );
        })}
      </div>

      {/* The grid of squares. flatMap flattens the array-of-weeks into one flat list
          of cells; CSS grid then wraps them into columns visually. */}
      <div className="heatmap-grid">
        {weeks.flatMap((col, wi) =>
          col.map((cell, di) => (
            <div
              key={`${wi}-${di}`} // unique key = week index + day index
              className="heatmap-cell"
              style={{ background: HEAT[levelOf(cell.score)] }} // pick shade by level
              // Native browser tooltip on hover, summarizing that day.
              title={
                cell.score
                  ? `${cell.date} — score ${cell.score} · ${cell.tasksCompleted || 0} tasks · ${cell.learningHours || 0}h learning`
                  : `${cell.date} — no activity`
              }
            />
          ))
        )}
      </div>

      {/* The "Less [] [] [] [] [] More" legend showing the shade scale. */}
      <div className="heatmap-legend">
        Less
        {HEAT.map((c) => (
          <span key={c} className="heatmap-cell" style={{ background: c }} />
        ))}
        More
      </div>
    </div>
  );
}
