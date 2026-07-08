// ============================================================================
// Analytics.jsx  —  CHARTS DASHBOARD (mostly read-only visualizations)
// ----------------------------------------------------------------------------
// Unlike the CRUD pages, this one only READS data and draws charts with recharts.
// The most instructive part is `skillSeries` below: reshaping many skills' separate
// history timelines into ONE table the multi-line chart can plot — a common and
// genuinely tricky "data wrangling" task you'll meet often in real dashboards.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend,
} from 'recharts';
import api from '../api';
import StatTile from '../components/StatTile';
import Heatmap from '../components/Heatmap';
import { IconChart, IconCheck, IconBook, IconClock } from '../components/icons';
import { SERIES, INK, GRID, AXIS, CURSOR, tooltipStyle } from '../chartTheme';

export default function Analytics() {
  // Shared axis styling reused by every chart, spread in with {...axisProps}.
  const axisProps = { stroke: AXIS, tick: { fill: INK.muted, fontSize: 12 }, tickLine: false };
  const [range, setRange] = useState('week');       // 'week' | 'month' — drives the summary
  const [summary, setSummary] = useState(null);
  const [studyHours, setStudyHours] = useState([]);
  const [breakdown, setBreakdown] = useState(null);
  const [skillProgress, setSkillProgress] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [streak, setStreak] = useState(null);

  // This effect re-runs whenever `range` changes (it's in the dependency array),
  // so switching between 7/30 days re-fetches just the summary.
  useEffect(() => {
    api.get(`/analytics/summary?range=${range}`).then((r) => setSummary(r.data));
  }, [range]);

  // The rest of the data only needs to load once (empty dependency array).
  useEffect(() => {
    api.get('/analytics/study-hours?weeks=10').then((r) => setStudyHours(r.data));
    api.get('/analytics/tasks-breakdown').then((r) => setBreakdown(r.data));
    api.get('/analytics/skill-progress').then((r) => setSkillProgress(r.data));
    api.get('/activities/heatmap?days=365').then((r) => setHeatmap(r.data));
    api.get('/activities/streak').then((r) => setStreak(r.data));
  }, []);

  // Merge every skill's history snapshots onto a shared date axis.
  // Each skill has its own list of {date, progress} checkpoints on different dates.
  // A multi-line chart needs rows like { date, SkillA: 40, SkillB: 65 }. So we:
  //   1. collect ALL dates any skill has a checkpoint on, sorted,
  //   2. for each date, look up each skill's MOST RECENT progress up to that date
  //      (carry the last known value forward so lines don't have gaps).
  const skillSeries = useMemo(() => {
    const dates = new Set();
    skillProgress.forEach((s) => s.history.forEach((h) => dates.add(h.date.slice(0, 10))));
    const sorted = [...dates].sort();
    return sorted.map((d) => {
      const row = { date: d };
      skillProgress.forEach((s) => {
        const pts = s.history.filter((h) => h.date.slice(0, 10) <= d);
        if (pts.length) row[s.name] = pts[pts.length - 1].progress; // last value on/before this date
      });
      return row;
    });
  }, [skillProgress]);

  // Shape the task-status counts into the 3 rows the "Tasks by status" chart wants.
  const taskData = breakdown
    ? [
        { name: 'Pending', count: breakdown.byStatus['pending'] || 0 },
        { name: 'In progress', count: breakdown.byStatus['in-progress'] || 0 },
        { name: 'Done', count: breakdown.byStatus['done'] || 0 },
      ]
    : [];

  return (
    <>
      <div className="row-between">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Your progress, visualized.</p>
        </div>
        <div className="chip-list">
          <button className={range === 'week' ? 'small' : 'small ghost'} onClick={() => setRange('week')}>Last 7 days</button>
          <button className={range === 'month' ? 'small' : 'small ghost'} onClick={() => setRange('month')}>Last 30 days</button>
        </div>
      </div>

      <div className="stat-cards mb-16">
        <StatTile feature icon={<IconChart size={17} />} label="Productivity score" value={summary?.score ?? '–'} delta={`${summary?.activeDays ?? 0}/${summary?.range ?? 0} active days`} up />
        <StatTile icon={<IconCheck size={17} />} label="Tasks completed" value={summary?.tasksCompleted ?? '–'} delta={`${summary?.pendingTasks ?? 0} still pending`} />
        <StatTile icon={<IconBook size={17} />} label="Learning hours" value={`${summary?.learningHours ?? '–'}h`} />
        <StatTile icon={<IconClock size={17} />} label="Focus time" value={`${Math.round((summary?.codingMinutes ?? 0) / 60 * 10) / 10}h`} delta={`${summary?.focusSessions ?? 0} sessions`} />
      </div>

      <div className="card mb-16">
        <h3>Activity — last 12 months {streak && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {streak.current}-day streak, {streak.activeDays} active days</span>}</h3>
        <Heatmap data={heatmap} days={365} />
      </div>

      <div className="grid cols-2 mb-16">
        <div className="card">
          <h3>Study hours per week</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={studyHours} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="week" {...axisProps} tickFormatter={(w) => w.split('-')[1]} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: CURSOR }} />
              <Bar dataKey="hours" name="Hours" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Tasks by status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={taskData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" {...axisProps} allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={80} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: CURSOR }} />
              <Bar dataKey="count" name="Tasks" fill={SERIES[1]} radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Multi-line skill chart. We render one <Line> per skill, cycling through the
          SERIES palette with `i % SERIES.length` so colors repeat if there are many. */}
      <div className="card">
        <h3>Skill progress over time</h3>
        {skillSeries.length === 0 ? (
          <div className="empty">Add skills and update their progress to see this chart.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={skillSeries} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="date" {...axisProps} />
              <YAxis {...axisProps} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: INK.secondary }} />
              {skillProgress.map((s, i) => (
                <Line
                  key={s.id}
                  type="monotone"                       // smooth curved line
                  dataKey={s.name}                      // which column of skillSeries this line plots
                  stroke={SERIES[i % SERIES.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: SERIES[i % SERIES.length] }}
                  connectNulls                          // bridge gaps where a skill has no value yet
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}
