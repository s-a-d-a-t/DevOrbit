// ============================================================================
// Dashboard.jsx  —  THE HOME SCREEN AFTER LOGIN (the "cockpit")
// ----------------------------------------------------------------------------
// This is the busiest page: it pulls together data from ~9 backend endpoints and
// lays it out as a grid of "widgets" (stat tiles, charts, a focus timer, habits,
// a heatmap, etc.). Study it to see how a real dashboard is wired:
//   - several small helper components (FocusTimer, QuickNote, ProgressGauge) are
//     defined ABOVE the main Dashboard component and used inside it,
//   - one load() function fetches everything into state, called once on mount,
//   - some values (this week's bars, the greeting) are DERIVED from that data.
//
// Charts come from "recharts", a React charting library. We feed it our themed
// colors (SERIES, INK, ...) imported from chartTheme so charts match light/dark.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
// Recharts building blocks: a responsive wrapper plus bar-chart and radial-gauge parts.
import {
  ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import StatTile from '../components/StatTile';
import Heatmap from '../components/Heatmap';
import {
  IconTarget, IconRepeat, IconBell, IconFlame, IconClock, IconLink, IconNote,
  IconSpark, IconChart, IconFolder, IconCheck, IconBook, IconStop, IconClose,
} from '../components/icons';
import { SERIES, INK, GRID, CURSOR, tooltipStyle } from '../chartTheme';

/* ---- focus timer ---- */
// A countdown timer widget. You pick a length + label, hit start, and when it
// reaches zero (or you stop early) it logs a focus session to the server.
// `onLogged` is a callback the parent passes so the dashboard can refresh its data.
function FocusTimer({ onLogged }) {
  const [minutes, setMinutes] = useState(25);          // chosen session length
  const [label, setLabel] = useState('Deep work');     // what you're focusing on
  const [secondsLeft, setSecondsLeft] = useState(null);// null = idle; a number = running
  const timerRef = useRef(null);                        // holds the setInterval id so we can clear it

  // Cleanup on unmount: if the component disappears mid-countdown, stop the interval
  // so it doesn't keep firing (a classic memory-leak guard).
  useEffect(() => () => clearInterval(timerRef.current), []);

  // Begin the countdown. setInterval ticks every second; the updater form
  // setSecondsLeft(s => ...) safely decrements. At zero we log the session and reset.
  const start = () => {
    setSecondsLeft(minutes * 60);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          api.post('/focus', { label, minutes }).then(onLogged); // record the completed session
          return null; // back to idle
        }
        return s - 1;
      });
    }, 1000);
  };

  // Stop early. If `log` is true and at least a minute passed, save the partial session.
  const stop = async (log) => {
    clearInterval(timerRef.current);
    const elapsed = Math.round((minutes * 60 - secondsLeft) / 60);
    setSecondsLeft(null);
    if (log && elapsed >= 1) {
      await api.post('/focus', { label, minutes: elapsed });
      onLogged();
    }
  };

  // Format seconds as MM:SS, padding each part to two digits.
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Two different UIs depending on state: the setup form (idle) vs the live timer.
  return (
    <div className={`widget w-4${secondsLeft === null ? '' : ' time-tracker'}`}>
      {secondsLeft === null ? (
        <>
          <h3><IconClock size={15} /> Current focus</h3>
          <div className="form-row mb-16">
            <div style={{ flex: 2 }}>
              <label>Session</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <label>Length</label>
              <select value={minutes} onChange={(e) => setMinutes(+e.target.value)}>
                {[15, 25, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
          </div>
          <button onClick={start}>Start session</button>
        </>
      ) : (
        <>
          <h3><IconClock size={15} /> Time tracker</h3>
          <div className="tt-label">{label}</div>
          <div className="timer-display">{fmt(secondsLeft)}</div>
          <div className="tt-controls">
            <button className="tt-btn log" onClick={() => stop(true)} title="Stop &amp; log" aria-label="Stop and log">
              <IconStop size={18} />
            </button>
            <button className="tt-btn discard" onClick={() => stop(false)} title="Discard" aria-label="Discard">
              <IconClose size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---- quick notes (writes to a dedicated note) ---- */
// A small autosaving scratchpad. It reads/writes a single special note titled
// "Scratchpad". The interesting technique here is DEBOUNCED autosave: we wait
// until you stop typing for 900ms before hitting the server, instead of saving on
// every keystroke.
function QuickNote() {
  const [note, setNote] = useState(null);  // the Scratchpad note record (once loaded/created)
  const [text, setText] = useState('');    // the textarea contents
  const [state, setState] = useState('');  // tiny status: '…' while saving, 'saved' after
  const timer = useRef(null);              // the debounce timeout id

  // On mount, find the existing Scratchpad note (if any) and load its text.
  useEffect(() => {
    api.get('/notes').then((r) => {
      const scratch = r.data.find((n) => n.title === 'Scratchpad');
      if (scratch) { setNote(scratch); setText(scratch.content); }
    });
  }, []);

  // Called on every keystroke. It updates the visible text immediately, but delays
  // the actual save: each keystroke cancels the previous pending save (clearTimeout)
  // and schedules a new one 900ms out. So we only save once typing pauses.
  const onChange = (v) => {
    setText(v);
    setState('…');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (note) await api.put(`/notes/${note.id}`, { content: v }); // update existing
      else {
        // First time: create the Scratchpad note, then remember it for next saves.
        const { data } = await api.post('/notes', { title: 'Scratchpad', content: v });
        setNote(data);
      }
      setState('saved');
    }, 900);
  };

  return (
    <div className="widget w-4 quick-note">
      <div className="row-between" style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}><IconNote size={15} /> Quick notes</h3>
        <span className="save-state saved">{state}</span>
      </div>
      <textarea placeholder="Scratch anything — it autosaves to your Notes." value={text} onChange={(e) => onChange(e.target.value)} />
      <div className="mt-8" style={{ textAlign: 'right' }}>
        <Link to="/notes">Open editor →</Link>
      </div>
    </div>
  );
}

/* ---- radial progress gauge ---- */
// A circular "% of tasks completed" gauge built from a recharts RadialBarChart.
// Given done/pending counts it computes a percentage and draws the arc.
function ProgressGauge({ done, pending }) {
  const total = done + pending;
  const pct = total ? Math.round((done / total) * 100) : 0; // guard against divide-by-zero
  return (
    <div className="widget w-4">
      <h3><IconTarget size={15} /> Task progress · 7d</h3>
      <div className="gauge">
        <ResponsiveContainer width="100%" height={168}>
          <RadialBarChart data={[{ value: pct }]} innerRadius="74%" outerRadius="100%" startAngle={220} endAngle={-40} barSize={16}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={12} fill={SERIES[0]} background={{ fill: GRID }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="gauge-center">
          <div className="gauge-value">{pct}%</div>
          <div className="gauge-sub">completed</div>
        </div>
      </div>
      <div className="gauge-legend">
        <span><i style={{ background: SERIES[0] }} />{done} done</span>
        <span><i style={{ background: GRID }} />{pending} pending</span>
      </div>
    </div>
  );
}

/* ---- dashboard ---- */
// The main page component. Holds one piece of state per data source, loads them
// all on mount, and renders the widget grid.
export default function Dashboard() {
  const { user } = useAuth();
  // Each backend resource gets its own state slot. Objects start null (so we can
  // show loading skeletons), lists start as empty arrays.
  const [summary, setSummary] = useState(null);
  const [streak, setStreak] = useState(null);
  const [plan, setPlan] = useState([]);
  const [habits, setHabits] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [skills, setSkills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [resources, setResources] = useState([]);
  const [newHabit, setNewHabit] = useState('');
  // Today's date as "YYYY-MM-DD". 'en-CA' locale conveniently formats dates that way.
  const today = new Date().toLocaleDateString('en-CA');

  // Fetch everything the dashboard needs. Each call independently drops its result
  // into the matching state slot. Defined as one function so we can re-run it after
  // any change (e.g. toggling a habit) to refresh the whole page.
  const load = () => {
    api.get('/analytics/summary?range=week').then((r) => setSummary(r.data));
    api.get('/activities/streak').then((r) => setStreak(r.data));
    api.get('/analytics/today-plan').then((r) => setPlan(r.data));
    api.get('/habits').then((r) => setHabits(r.data));
    api.get('/analytics/reminders').then((r) => setReminders(r.data));
    api.get('/activities/heatmap?days=180').then((r) => setHeatmap(r.data));
    api.get('/skills').then((r) => setSkills(r.data));
    api.get('/goals').then((r) => setGoals(r.data));
    api.get('/resources').then((r) => setResources(r.data));
  };
  // Run load() once on mount. (Passing `load` directly works because it ignores its args.)
  useEffect(load, []);

  // Check/uncheck a habit for today, then refresh so the UI reflects the change.
  const toggleHabit = async (h) => { await api.post(`/habits/${h.id}/toggle`); load(); };
  // Add a new habit from the little inline form.
  const addHabit = async (e) => {
    e.preventDefault();
    if (!newHabit.trim()) return;
    await api.post('/habits', { name: newHabit.trim() });
    setNewHabit('');
    load();
  };

  // DERIVED DATA: build the last 7 days as {day, score} for the weekly bar chart.
  // This is an IIFE (immediately-invoked function) — a self-running function whose
  // return value becomes `week`. It walks from 6 days ago to today, looking up each
  // day's score in the heatmap data.
  const week = (() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-CA');
      const row = heatmap.find((h) => h.date === key);
      out.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), score: row?.score || 0 });
    }
    return out;
  })();

  // More derived values used in the UI:
  const peak = Math.max(0, ...week.map((w) => w.score));                    // biggest day this week (highlights that bar)
  const recent = [...heatmap].reverse().filter((h) => h.score > 0).slice(0, 6); // last 6 active days for the feed
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'; // time-based greeting

  return (
    <>
      <div className="row-between" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">{greeting}, {user.name.split(' ')[0]}.</h1>
          <p className="page-sub">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            {streak?.current > 1 && <> — {streak.current}-day streak</>}
          </p>
        </div>
      </div>

      {/* The widget grid. Each child's `w-N` class sets how many of the 12 columns
          it spans (like a mini layout grid). Below: stat tiles, heatmap, focus timer,
          weekly chart, gauge, today's plan, quick note, habits, skills, goals, etc. */}
      <div className="board">
        {/* Top row of KPI cards. `??` and `?` supply fallbacks/skeletons while data loads. */}
        <div className="stat-cards">
          <StatTile feature icon={<IconFlame size={17} />} label="Streak" value={streak ? <>{streak.current}<em>days</em></> : <span className="skeleton" style={{ display: 'inline-block', width: 50 }} />} delta={streak ? `longest ${streak.longest}` : ''} up={streak?.current > 0} />
          <StatTile icon={<IconCheck size={17} />} label="Tasks · 7d" value={summary?.tasksCompleted ?? '–'} delta={`${summary?.pendingTasks ?? 0} pending`} />
          <StatTile icon={<IconBook size={17} />} label="Study · 7d" value={summary ? <>{summary.learningHours}<em>h</em></> : '–'} delta={`goal ${user.dailyGoalHours}h/day`} />
          <StatTile icon={<IconClock size={17} />} label="Focus · 7d" value={summary ? <>{Math.round(summary.codingMinutes / 6) / 10}<em>h</em></> : '–'} delta={`${summary?.focusSessions ?? 0} sessions`} />
          <StatTile icon={<IconChart size={17} />} label="Score · 7d" value={summary?.score ?? '–'} delta={`${summary?.activeDays ?? 0}/7 active days`} up />
        </div>

        <div className="widget w-8">
          <div className="row-between" style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}><IconFlame size={15} /> Contribution — 6 months</h3>
            <Link to="/analytics">Analytics →</Link>
          </div>
          <Heatmap data={heatmap} days={180} />
        </div>

        <FocusTimer onLogged={load} />

        <div className="widget w-8">
          <div className="row-between" style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}><IconChart size={15} /> Weekly rhythm</h3>
            <span className="chart-note">peak {peak}</span>
          </div>
          {/* A recharts bar chart of the `week` data. ResponsiveContainer makes it fill
              its box. We render one <Cell> per bar so we can color the peak day differently. */}
          <ResponsiveContainer width="100%" height={168}>
            <BarChart data={week} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="day" stroke="none" tick={{ fill: INK.muted, fontSize: 10.5, fontFamily: 'JetBrains Mono' }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: CURSOR }} />
              <Bar dataKey="score" name="Score" radius={[9, 9, 9, 9]} maxBarSize={30}>
                {week.map((w, i) => (
                  // Highlight the peak day in the accent color; other days use the grid gray.
                  <Cell key={i} fill={w.score === peak && peak > 0 ? SERIES[0] : GRID} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <ProgressGauge done={summary?.tasksCompleted ?? 0} pending={summary?.pendingTasks ?? 0} />

        <div className="widget w-5">
          <h3><IconTarget size={15} /> Today's plan</h3>
          {plan.length === 0 && <div className="empty">Nothing urgent — pick from your backlog.</div>}
          {plan.slice(0, 6).map((p, i) => (
            <div key={i} className="item-row">
              <div className="grow">
                <div className="title">{p.label}</div>
                <div className="meta">{p.kind}</div>
              </div>
              <span className={`badge ${p.priority}`}>{p.priority}</span>
            </div>
          ))}
        </div>

        <QuickNote />

        <div className="widget w-3">
          <h3><IconRepeat size={15} /> Habits</h3>
          {habits.map((h) => (
            <div key={h.id} className="item-row">
              <input type="checkbox" className="checkbox" checked={h.checkins.includes(today)} onChange={() => toggleHabit(h)} />
              <div className="grow title">{h.icon} {h.name}</div>
            </div>
          ))}
          <form onSubmit={addHabit} className="form-row mt-8">
            <input placeholder="New habit" value={newHabit} onChange={(e) => setNewHabit(e.target.value)} />
          </form>
        </div>

        <div className="widget w-4">
          <div className="row-between" style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}><IconSpark size={15} /> Skill progression</h3>
            <Link to="/skills">All →</Link>
          </div>
          {[...skills].sort((a, b) => b.progress - a.progress).slice(0, 4).map((s) => (
            <div key={s.id} style={{ marginBottom: 12 }}>
              <div className="row-between" style={{ marginBottom: 5 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{s.name}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--slate)' }}>{s.progress}%</span>
              </div>
              <div className="progress"><div style={{ width: `${s.progress}%` }} /></div>
            </div>
          ))}
          {skills.length === 0 && <div className="empty">No skills tracked yet.</div>}
        </div>

        <div className="widget w-4">
          <div className="row-between" style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}><IconFolder size={15} /> Goal progress</h3>
            <Link to="/projects">All →</Link>
          </div>
          {goals.slice(0, 3).map((g) => {
            const total = g.milestones.length;
            const done = g.milestones.filter((m) => m.done).length;
            const pct = total ? Math.round((done / total) * 100) : g.completed ? 100 : 0;
            return (
              <div key={g.id} style={{ marginBottom: 12 }}>
                <div className="row-between" style={{ marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{g.title}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--slate)' }}>{done}/{total || '–'}</span>
                </div>
                <div className="progress"><div style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
          {goals.length === 0 && <div className="empty">No goals yet.</div>}
        </div>

        {reminders.length > 0 && (
          <div className="widget w-4">
            <h3><IconBell size={15} /> Upcoming deadlines</h3>
            {reminders.slice(0, 5).map((t) => (
              <div key={t.id} className="item-row">
                <div className="grow">
                  <div className="title">{t.title}</div>
                  <div className="meta">due {new Date(t.dueDate).toLocaleDateString()}</div>
                </div>
                <span className={`badge ${t.priority}`}>{t.priority}</span>
              </div>
            ))}
          </div>
        )}

        <div className={`widget ${reminders.length > 0 ? 'w-6' : 'w-4'}`}>
          <div className="row-between" style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}><IconLink size={15} /> Library</h3>
            <Link to="/learning">Manage →</Link>
          </div>
          {resources.slice(0, 4).map((r) => (
            <div key={r.id} className={`item-row ${r.consumed ? 'done' : ''}`}>
              <div className="grow">
                <div className="title">{r.title}</div>
                <div className="meta">
                  {r.category} · {(r.links || []).slice(0, 2).map((l, i) => (
                    <span key={i}>{i > 0 && ' · '}<a href={l.url} target="_blank" rel="noreferrer">{l.label || l.url}</a></span>
                  ))}
                  {(r.links || []).length > 2 && ` +${r.links.length - 2}`}
                </div>
              </div>
              <span className="res-type">{r.type}</span>
            </div>
          ))}
          {resources.length === 0 && <div className="empty">No saved resources yet.</div>}
        </div>

        <div className={`widget ${reminders.length > 0 ? 'w-6' : 'w-12'}`}>
          <h3><IconClock size={15} /> Recent activity</h3>
          <div className="feed">
            {recent.map((h) => (
              <div key={h.date} className="feed-item">
                <div className="what">
                  {h.tasksCompleted > 0 && `${h.tasksCompleted} task${h.tasksCompleted > 1 ? 's' : ''} · `}
                  {h.learningHours > 0 && `${h.learningHours}h study · `}
                  {h.focusSessions > 0 && `${h.focusSessions} focus · `}
                  score {h.score}
                </div>
                <div className="when">{new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
              </div>
            ))}
            {recent.length === 0 && <div className="empty">Activity will appear as you work.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
