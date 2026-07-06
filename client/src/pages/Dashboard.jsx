import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import StatTile from '../components/StatTile';
import Heatmap from '../components/Heatmap';
import {
  IconTarget, IconRepeat, IconBell, IconFlame, IconClock, IconLink, IconNote,
  IconSpark, IconChart, IconFolder,
} from '../components/icons';
import { SERIES, INK, CURSOR, tooltipStyle } from '../chartTheme';

/* ---- focus timer ---- */
function FocusTimer({ onLogged }) {
  const [minutes, setMinutes] = useState(25);
  const [label, setLabel] = useState('Deep work');
  const [secondsLeft, setSecondsLeft] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const start = () => {
    setSecondsLeft(minutes * 60);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          api.post('/focus', { label, minutes }).then(onLogged);
          return null;
        }
        return s - 1;
      });
    }, 1000);
  };

  const stop = async (log) => {
    clearInterval(timerRef.current);
    const elapsed = Math.round((minutes * 60 - secondsLeft) / 60);
    setSecondsLeft(null);
    if (log && elapsed >= 1) {
      await api.post('/focus', { label, minutes: elapsed });
      onLogged();
    }
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="widget w-4">
      <h3><IconClock size={15} /> Current focus</h3>
      {secondsLeft === null ? (
        <>
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
          <div className="timer-display">{fmt(secondsLeft)}</div>
          <div className="form-row">
            <button className="ghost" onClick={() => stop(true)}>Stop &amp; log</button>
            <button className="danger" onClick={() => stop(false)}>Discard</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---- quick notes (writes to a dedicated note) ---- */
function QuickNote() {
  const [note, setNote] = useState(null);
  const [text, setText] = useState('');
  const [state, setState] = useState('');
  const timer = useRef(null);

  useEffect(() => {
    api.get('/notes').then((r) => {
      const scratch = r.data.find((n) => n.title === 'Scratchpad');
      if (scratch) { setNote(scratch); setText(scratch.content); }
    });
  }, []);

  const onChange = (v) => {
    setText(v);
    setState('…');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (note) await api.put(`/notes/${note.id}`, { content: v });
      else {
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

/* ---- dashboard ---- */
export default function Dashboard() {
  const { user } = useAuth();
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
  const today = new Date().toLocaleDateString('en-CA');

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
  useEffect(load, []);

  const toggleHabit = async (h) => { await api.post(`/habits/${h.id}/toggle`); load(); };
  const addHabit = async (e) => {
    e.preventDefault();
    if (!newHabit.trim()) return;
    await api.post('/habits', { name: newHabit.trim() });
    setNewHabit('');
    load();
  };

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

  const recent = [...heatmap].reverse().filter((h) => h.score > 0).slice(0, 6);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

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

      <div className="board">
        <div className="stat-strip">
          <StatTile label="Streak" value={streak ? <>{streak.current}<em>days</em></> : <span className="skeleton" style={{ display: 'inline-block', width: 50 }} />} delta={streak ? `longest ${streak.longest}` : ''} up={streak?.current > 0} />
          <StatTile label="Tasks · 7d" value={summary?.tasksCompleted ?? '–'} delta={`${summary?.pendingTasks ?? 0} pending`} />
          <StatTile label="Study · 7d" value={summary ? <>{summary.learningHours}<em>h</em></> : '–'} delta={`goal ${user.dailyGoalHours}h/day`} />
          <StatTile label="Focus · 7d" value={summary ? <>{Math.round(summary.codingMinutes / 6) / 10}<em>h</em></> : '–'} delta={`${summary?.focusSessions ?? 0} sessions`} />
          <StatTile label="Score · 7d" value={summary?.score ?? '–'} delta={`${summary?.activeDays ?? 0}/7 active days`} up />
        </div>

        <div className="widget w-8">
          <div className="row-between" style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}><IconFlame size={15} /> Contribution — 6 months</h3>
            <Link to="/analytics">Analytics →</Link>
          </div>
          <Heatmap data={heatmap} days={180} />
        </div>

        <FocusTimer onLogged={load} />

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
          <h3><IconChart size={15} /> Weekly rhythm</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={week} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="day" stroke="none" tick={{ fill: INK.muted, fontSize: 10.5, fontFamily: 'JetBrains Mono' }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: CURSOR }} />
              <Bar dataKey="score" name="Score" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
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
          <div className="widget w-5">
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

        <div className={`widget ${reminders.length > 0 ? 'w-7' : 'w-6'}`}>
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

        <div className={`widget ${reminders.length > 0 ? 'w-12' : 'w-6'}`}>
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
