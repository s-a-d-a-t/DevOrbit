import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import StatTile from '../components/StatTile';
import Heatmap from '../components/Heatmap';
import { IconTarget, IconRepeat, IconBell, IconFlame, IconClock, IconLink } from '../components/icons';

// Compact resources widget: grouped by category, unread first.
function ResourcesByCategory({ resources }) {
  const groups = new Map();
  for (const r of resources) {
    const cat = r.category || 'General';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(r);
  }
  const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconLink size={15} /> Resources by category
        </h3>
        <Link to="/learning">Manage →</Link>
      </div>
      {sorted.length === 0 && <div className="empty">No saved resources yet — add some on the Learning page.</div>}
      {sorted.map(([cat, items]) => (
        <div key={cat} className="res-cat">
          <div className="res-cat-head">
            <span className="name">{cat}</span>
            <span className="count">{items.filter((r) => !r.consumed).length} unread · {items.length}</span>
          </div>
          {items
            .sort((a, b) => a.consumed - b.consumed)
            .slice(0, 3)
            .map((r) => (
              <div key={r.id} className={`item-row ${r.consumed ? 'done' : ''}`}>
                <div className="grow">
                  <div className="title">{r.title}</div>
                  <div className="meta">
                    {(r.links || []).slice(0, 3).map((l, i) => (
                      <span key={i}>
                        {i > 0 && ' · '}
                        <a href={l.url} target="_blank" rel="noreferrer">{l.label || l.url}</a>
                      </span>
                    ))}
                    {(r.links || []).length > 3 && ` +${r.links.length - 3} more`}
                  </div>
                </div>
                <span className="res-type">{r.type}</span>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

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
    <div className="card">
      <h3><IconClock size={15} /> Focus session</h3>
      {secondsLeft === null ? (
        <>
          <div className="form-row mb-16">
            <div>
              <label>Label</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <label>Minutes</label>
              <select value={minutes} onChange={(e) => setMinutes(+e.target.value)}>
                {[15, 25, 45, 60, 90].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={start}>Start Pomodoro</button>
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

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [streak, setStreak] = useState(null);
  const [plan, setPlan] = useState([]);
  const [habits, setHabits] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
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
    api.get('/resources').then((r) => setResources(r.data));
  };
  useEffect(load, []);

  const toggleHabit = async (h) => {
    await api.post(`/habits/${h.id}/toggle`);
    load();
  };
  const addHabit = async (e) => {
    e.preventDefault();
    if (!newHabit.trim()) return;
    await api.post('/habits', { name: newHabit.trim() });
    setNewHabit('');
    load();
  };

  return (
    <>
      <h1 className="page-title">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]}</h1>
      <p className="page-sub">Here's your day at a glance.</p>

      <div className="grid cols-4 mb-16">
        <StatTile label="Streak" value={`${streak?.current ?? '–'} days`} delta={streak ? `longest: ${streak.longest}` : ''} up={streak?.current > 0} />
        <StatTile label="Tasks done (7d)" value={summary?.tasksCompleted ?? '–'} delta={`${summary?.pendingTasks ?? 0} pending`} />
        <StatTile label="Learning (7d)" value={`${summary?.learningHours ?? '–'}h`} delta={`goal ${user.dailyGoalHours}h/day`} />
        <StatTile label="Activity score (7d)" value={summary?.score ?? '–'} delta={`${summary?.activeDays ?? 0}/7 active days`} up />
      </div>

      <div className="grid cols-2 mb-16">
        <div className="stack">
        <div className="card">
          <h3><IconTarget size={15} /> Today's plan</h3>
          {plan.length === 0 && <div className="empty">Nothing urgent — pick something from your backlog.</div>}
          {plan.map((p, i) => (
            <div key={i} className="item-row">
              <div className="grow">
                <div className="title">{p.label}</div>
                <div className="meta">{p.kind}</div>
              </div>
              <span className={`badge ${p.priority}`}>{p.priority}</span>
            </div>
          ))}
        </div>
        <ResourcesByCategory resources={resources} />
        </div>

        <div className="stack">
          <FocusTimer onLogged={load} />
          <div className="card">
            <h3><IconRepeat size={15} /> Habits today</h3>
            {habits.map((h) => (
              <div key={h.id} className="item-row">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={h.checkins.includes(today)}
                  onChange={() => toggleHabit(h)}
                />
                <div className="grow title">
                  {h.icon} {h.name}
                </div>
                <span className="meta">{h.checkins.length} check-ins</span>
              </div>
            ))}
            <form onSubmit={addHabit} className="form-row mt-8">
              <input placeholder="New habit (e.g. gym, reading)" value={newHabit} onChange={(e) => setNewHabit(e.target.value)} />
              <button className="small" style={{ flex: '0 0 auto' }}>Add</button>
            </form>
          </div>
        </div>
      </div>

      {reminders.length > 0 && (
        <div className="card mb-16">
          <h3><IconBell size={15} /> Reminders — due or overdue</h3>
          {reminders.map((t) => (
            <div key={t.id} className="item-row">
              <div className="grow">
                <div className="title">{t.title}</div>
                <div className="meta">due {new Date(t.dueDate).toLocaleDateString()}</div>
              </div>
              <span className={`badge ${t.priority}`}>{t.priority}</span>
              <Link to="/tasks">open</Link>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><IconFlame size={15} /> Activity — last 6 months</h3>
          <Link to="/analytics">Full analytics →</Link>
        </div>
        <Heatmap data={heatmap} days={180} />
      </div>
    </>
  );
}
