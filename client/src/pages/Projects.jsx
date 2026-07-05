import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import StatTile from '../components/StatTile';
import { IconFolder, IconTarget } from '../components/icons';

const STATUSES = ['planned', 'ongoing', 'completed', 'paused'];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : null);
const daysBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [goals, setGoals] = useState([]);
  const [skills, setSkills] = useState([]);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ name: '', description: '', techStack: '', repoUrl: '', liveUrl: '' });
  const [goalForm, setGoalForm] = useState({ title: '', type: 'career', targetDate: '', milestones: '' });

  const load = () => {
    api.get('/projects').then((r) => setProjects(r.data));
    api.get('/goals').then((r) => setGoals(r.data));
    api.get('/skills').then((r) => setSkills(r.data));
  };
  useEffect(load, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await api.post('/projects', {
      ...form,
      techStack: form.techStack.split(',').map((t) => t.trim()).filter(Boolean),
      startedAt: new Date(),
    });
    setForm({ name: '', description: '', techStack: '', repoUrl: '', liveUrl: '' });
    load();
  };

  const addGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.title.trim()) return;
    await api.post('/goals', {
      title: goalForm.title,
      type: goalForm.type,
      targetDate: goalForm.targetDate || undefined,
      milestones: goalForm.milestones.split(',').map((t) => t.trim()).filter(Boolean).map((title) => ({ title })),
    });
    setGoalForm({ title: '', type: 'career', targetDate: '', milestones: '' });
    load();
  };

  const setStatus = async (p, status) => {
    await api.put(`/projects/${p.id}`, { status, ...(status === 'completed' ? { completedAt: new Date() } : {}) });
    load();
  };

  const toggleMilestone = async (goal, idx) => {
    const milestones = goal.milestones.map((m, i) => (i === idx ? { ...m, done: !m.done } : m));
    const completed = milestones.length > 0 && milestones.every((m) => m.done);
    await api.put(`/goals/${goal.id}`, { milestones, completed });
    load();
  };

  const stats = useMemo(() => {
    const ongoing = projects.filter((p) => p.status === 'ongoing').length;
    const completed = projects.filter((p) => p.status === 'completed').length;
    const tech = new Set(projects.flatMap((p) => p.techStack || [])).size;
    const goalsDone = goals.filter((g) => g.completed).length;
    return { ongoing, completed, tech, goalsDone };
  }, [projects, goals]);

  const linkedSkills = (p) => skills.filter((s) => s.projects?.includes(p.id)).map((s) => s.name);
  const visible = projects.filter((p) => filter === 'all' || p.status === filter);

  return (
    <>
      <h1 className="page-title">Projects &amp; Goals</h1>
      <p className="page-sub">What you're building, and where it's taking you.</p>

      <div className="board">
        <div className="stat-strip">
          <StatTile label="In flight" value={stats.ongoing} delta={`${projects.length} total projects`} />
          <StatTile label="Shipped" value={stats.completed} delta="completed projects" up={stats.completed > 0} />
          <StatTile label="Technologies" value={stats.tech} delta="across your stack" />
          <StatTile label="Goals met" value={`${stats.goalsDone}/${goals.length || 0}`} delta="milestone-complete" up={stats.goalsDone > 0} />
        </div>

        <div className="widget w-12">
          <h3><IconFolder size={15} /> New project</h3>
          <form onSubmit={add}>
            <div className="form-row" style={{ marginBottom: 10 }}>
              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input style={{ flex: 2 }} placeholder="One-line description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <input placeholder="Tech, stack, comma-separated" value={form.techStack} onChange={(e) => setForm({ ...form, techStack: e.target.value })} />
            </div>
            <div className="form-row">
              <input placeholder="Repository URL" value={form.repoUrl} onChange={(e) => setForm({ ...form, repoUrl: e.target.value })} />
              <input placeholder="Live URL (optional)" value={form.liveUrl} onChange={(e) => setForm({ ...form, liveUrl: e.target.value })} />
              <button style={{ flex: '0 0 auto' }}>Add project</button>
            </div>
          </form>
        </div>

        <div className="w-12 chip-list">
          {['all', ...STATUSES].map((s) => (
            <button key={s} type="button" className={`chip ${filter === s ? 'on' : ''}`} onClick={() => setFilter(s)}>
              {s}{s !== 'all' && ` · ${projects.filter((p) => p.status === s).length}`}
            </button>
          ))}
        </div>

        {visible.map((p) => (
          <div key={p.id} className="widget w-6 project-card">
            <div className="row-between">
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17 }}>{p.name}</div>
              <span className={`badge status-${p.status}`}>{p.status}</span>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--dim)', letterSpacing: '0.08em', marginTop: 3 }}>
              {fmtDate(p.startedAt) && <>started {fmtDate(p.startedAt)}</>}
              {p.completedAt && <> → shipped {fmtDate(p.completedAt)} · {daysBetween(p.startedAt || p.createdAt, p.completedAt)} days</>}
              {!p.completedAt && p.startedAt && <> · day {daysBetween(p.startedAt, new Date())}</>}
            </div>
            {p.description && <p style={{ color: 'var(--silver)', margin: '10px 0 0', fontSize: 13.5 }}>{p.description}</p>}

            {(p.techStack?.length > 0 || linkedSkills(p).length > 0) && (
              <div className="chip-list" style={{ marginTop: 12 }}>
                {p.techStack?.map((t) => <span key={t} className="badge tag">{t}</span>)}
                {linkedSkills(p).map((s) => <span key={s} className="badge medium">{s}</span>)}
              </div>
            )}

            <div className="row-between" style={{ marginTop: 14 }}>
              <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {p.repoUrl && <a href={p.repoUrl} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>repo ↗</a>}
                {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>live ↗</a>}
              </span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={p.status} onChange={(e) => setStatus(p, e.target.value)} style={{ width: 130 }}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="danger" onClick={() => api.delete(`/projects/${p.id}`).then(load)}>✕</button>
              </span>
            </div>
          </div>
        ))}
        {visible.length === 0 && <div className="widget w-12"><div className="empty">Nothing here — add a project above.</div></div>}

        <div className="widget w-12">
          <h3><IconTarget size={15} /> New goal</h3>
          <form onSubmit={addGoal} className="form-row">
            <input style={{ flex: 2 }} placeholder="Goal (e.g. Land a backend internship)" value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} />
            <select value={goalForm.type} onChange={(e) => setGoalForm({ ...goalForm, type: e.target.value })} style={{ flex: '0 0 110px' }}>
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="career">career</option>
            </select>
            <input type="date" value={goalForm.targetDate} onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })} style={{ flex: '0 0 150px' }} />
            <input style={{ flex: 2 }} placeholder="Milestones, comma, separated" value={goalForm.milestones} onChange={(e) => setGoalForm({ ...goalForm, milestones: e.target.value })} />
            <button style={{ flex: '0 0 auto' }}>Add goal</button>
          </form>
        </div>

        {goals.map((g) => {
          const done = g.milestones.filter((m) => m.done).length;
          const pct = g.milestones.length ? Math.round((done / g.milestones.length) * 100) : g.completed ? 100 : 0;
          const daysLeft = g.targetDate ? Math.round((new Date(g.targetDate) - Date.now()) / 86400000) : null;
          return (
            <div key={g.id} className="widget w-6">
              <div className="row-between">
                <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15 }}>
                  {g.completed && <span style={{ color: 'var(--forest)' }}>✓ </span>}{g.title}
                </div>
                <span className="badge tag">{g.type}</span>
              </div>
              <div className="row-between" style={{ margin: '10px 0 6px' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--dim)', letterSpacing: '0.08em' }}>
                  {done}/{g.milestones.length} milestones
                  {daysLeft !== null && !g.completed && <> · {daysLeft >= 0 ? `${daysLeft}d left` : `${-daysLeft}d past target`}</>}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--slate)' }}>{pct}%</span>
              </div>
              <div className="progress mb-16"><div style={{ width: `${pct}%` }} /></div>
              {g.milestones.map((m, i) => (
                <div key={i} className={`item-row ${m.done ? 'done' : ''}`}>
                  <input type="checkbox" className="checkbox" checked={m.done} onChange={() => toggleMilestone(g, i)} />
                  <div className="grow title">{m.title}</div>
                </div>
              ))}
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <button className="danger" onClick={() => api.delete(`/goals/${g.id}`).then(load)}>delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
