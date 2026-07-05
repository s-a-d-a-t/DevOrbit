import { useMemo } from 'react';
import { HEAT } from '../chartTheme';

const dayKey = (d) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
};

// GitHub-style contribution calendar: columns are weeks, rows Sun–Sat.
export default function Heatmap({ data, days = 365 }) {
  const { weeks, monthLabels, max } = useMemo(() => {
    const byDate = Object.fromEntries((data || []).map((d) => [d.date, d]));
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days + 1);
    start.setDate(start.getDate() - start.getDay()); // align to Sunday

    const weeks = [];
    let max = 1;
    const monthLabels = [];
    let lastMonth = -1;
    for (let w = new Date(start); w <= end; w.setDate(w.getDate() + 7)) {
      const col = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(w);
        d.setDate(d.getDate() + i);
        if (d > end) break;
        const cell = byDate[dayKey(d)];
        if (cell?.score > max) max = cell.score;
        col.push({ date: dayKey(d), ...cell });
      }
      if (w.getMonth() !== lastMonth) {
        monthLabels.push({ index: weeks.length, label: w.toLocaleString('en', { month: 'short' }) });
        lastMonth = w.getMonth();
      }
      weeks.push(col);
    }
    return { weeks, monthLabels, max };
  }, [data, days]);

  const levelOf = (score) => {
    if (!score) return 0;
    const t = score / max;
    return t > 0.75 ? 4 : t > 0.5 ? 3 : t > 0.25 ? 2 : 1;
  };

  return (
    <div className="heatmap">
      <div className="heatmap-months">
        {monthLabels.map((m, i) => {
          const next = monthLabels[i + 1]?.index ?? weeks.length;
          return (
            <span key={m.index} style={{ width: (next - m.index) * 15 - 4 }}>
              {m.label}
            </span>
          );
        })}
      </div>
      <div className="heatmap-grid">
        {weeks.flatMap((col, wi) =>
          col.map((cell, di) => (
            <div
              key={`${wi}-${di}`}
              className="heatmap-cell"
              style={{ background: HEAT[levelOf(cell.score)] }}
              title={
                cell.score
                  ? `${cell.date} — score ${cell.score} · ${cell.tasksCompleted || 0} tasks · ${cell.learningHours || 0}h learning`
                  : `${cell.date} — no activity`
              }
            />
          ))
        )}
      </div>
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
