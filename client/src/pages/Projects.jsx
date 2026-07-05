import { useEffect, useState } from 'react';
import api from '../api';

const STATUSES = ['planned', 'ongoing', 'completed', 'paused'];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', techStack: '', repoUrl: '' });
  const [goalForm, setGoalForm] = useState({ title: '', type: 'career', milestones: '' });

  const load = () => {
    api.get('/projects').then((r) => setProjects(r.data));
    api.get('/goals').then((r) => setGoals(r.data));
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
    setForm({ name: '', description: '', techStack: '', repoUrl: '' });
    load();
  };

  const addGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.title.trim()) return;
    await api.post('/goals', {
      title: goalForm.title,
      type: goalForm.type,
      milestones: goalForm.milestones.split(',').map((t) => t.trim()).filter(Boolean).map((title) => ({ title })),
    });
    setGoalForm({ title: '', type: 'career', milestones: '' });
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

  return (
    <>
      <h1 className="page-title">Projects & Goals</h1>
      <p className="page-sub">What you're building, and where you're heading.</p>

      <div className="card mb-16">
        <h3>New project</h3>
        <form onSubmit={add} className="form-row">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input style={{ flex: 2 }} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input placeholder="Tech, stack" value={form.techStack} onChange={(e) => setForm({ ...form, techStack: e.target.value })} />
          <input placeholder="Repo URL" value={form.repoUrl} onChange={(e) => setForm({ ...form, repoUrl: e.target.value })} />
          <button style={{ flex: '0 0 auto' }}>Add</button>
        </form>
      </div>

      <div className="grid cols-2 mb-16">
        {projects.map((p) => (
          <div key={p.id} className="card">
            <div className="row-between">
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {p.repoUrl ? <a href={p.repoUrl} target="_blank" rel="noreferrer">{p.name}</a> : p.name}
              </div>
              <span className={`badge status-${p.status}`}>{p.status}</span>
            </div>
            {p.description && <p style={{ color: 'var(--ink-2)', margin: '8px 0' }}>{p.description}</p>}
            <div className="chip-list">
              {p.techStack?.map((t) => <span key={t} className="badge tag">{t}</span>)}
            </div>
            <div className="row-between mt-8">
              <select value={p.status} onChange={(e) => setStatus(p, e.target.value)} style={{ width: 140 }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="danger" onClick={() => api.delete(`/projects/${p.id}`).then(load)}>delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-16">
        <h3>New goal</h3>
        <form onSubmit={addGoal} className="form-row">
          <input style={{ flex: 2 }} placeholder="Goal (e.g. Land a backend internship)" value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} />
          <select value={goalForm.type} onChange={(e) => setGoalForm({ ...goalForm, type: e.target.value })}>
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="career">career</option>
          </select>
          <input style={{ flex: 2 }} placeholder="Milestones, comma, separated" value={goalForm.milestones} onChange={(e) => setGoalForm({ ...goalForm, milestones: e.target.value })} />
          <button style={{ flex: '0 0 auto' }}>Add</button>
        </form>
      </div>

      <div className="grid cols-2">
        {goals.map((g) => (
          <div key={g.id} className="card">
            <div className="row-between">
              <div style={{ fontWeight: 700 }}>{g.completed ? '✓ ' : ''}{g.title}</div>
              <span className="badge tag">{g.type}</span>
            </div>
            <div className="mt-8">
              {g.milestones.map((m, i) => (
                <div key={i} className={`item-row ${m.done ? 'done' : ''}`}>
                  <input type="checkbox" className="checkbox" checked={m.done} onChange={() => toggleMilestone(g, i)} />
                  <div className="grow title">{m.title}</div>
                </div>
              ))}
            </div>
            <div className="row-between mt-8">
              <span className="meta" style={{ color: 'var(--muted)', fontSize: 12 }}>
                {g.milestones.filter((m) => m.done).length}/{g.milestones.length} milestones
              </span>
              <button className="danger" onClick={() => api.delete(`/goals/${g.id}`).then(load)}>delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
