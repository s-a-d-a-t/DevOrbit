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
  const axisProps = { stroke: AXIS, tick: { fill: INK.muted, fontSize: 12 }, tickLine: false };
  const [range, setRange] = useState('week');
  const [summary, setSummary] = useState(null);
  const [studyHours, setStudyHours] = useState([]);
  const [breakdown, setBreakdown] = useState(null);
  const [skillProgress, setSkillProgress] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    api.get(`/analytics/summary?range=${range}`).then((r) => setSummary(r.data));
  }, [range]);

  useEffect(() => {
    api.get('/analytics/study-hours?weeks=10').then((r) => setStudyHours(r.data));
    api.get('/analytics/tasks-breakdown').then((r) => setBreakdown(r.data));
    api.get('/analytics/skill-progress').then((r) => setSkillProgress(r.data));
    api.get('/activities/heatmap?days=365').then((r) => setHeatmap(r.data));
    api.get('/activities/streak').then((r) => setStreak(r.data));
  }, []);

  // Merge every skill's history snapshots onto a shared date axis.
  const skillSeries = useMemo(() => {
    const dates = new Set();
    skillProgress.forEach((s) => s.history.forEach((h) => dates.add(h.date.slice(0, 10))));
    const sorted = [...dates].sort();
    return sorted.map((d) => {
      const row = { date: d };
      skillProgress.forEach((s) => {
        const pts = s.history.filter((h) => h.date.slice(0, 10) <= d);
        if (pts.length) row[s.name] = pts[pts.length - 1].progress;
      });
      return row;
    });
  }, [skillProgress]);

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
                  type="monotone"
                  dataKey={s.name}
                  stroke={SERIES[i % SERIES.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: SERIES[i % SERIES.length] }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}
