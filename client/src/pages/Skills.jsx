import { useEffect, useState } from 'react';
import api from '../api';

const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

export default function Skills() {
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ name: '', level: 'beginner', progress: 10, category: 'general' });

  const load = () => {
    api.get('/skills').then((r) => setSkills(r.data));
    api.get('/projects').then((r) => setProjects(r.data));
  };
  useEffect(load, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await api.post('/skills', form);
    setForm({ name: '', level: 'beginner', progress: 10, category: 'general' });
    load();
  };

  const update = async (skill, patch) => {
    await api.put(`/skills/${skill.id}`, patch);
    load();
  };

  const projectName = (id) => projects.find((p) => p.id === id)?.name;

  return (
    <>
      <h1 className="page-title">Skills</h1>
      <p className="page-sub">Track your stack and watch progress climb.</p>

      <div className="card mb-16">
        <h3>Add skill</h3>
        <form onSubmit={add} className="form-row">
          <input placeholder="Skill (e.g. TypeScript)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input type="number" min="0" max="100" value={form.progress} onChange={(e) => setForm({ ...form, progress: +e.target.value })} title="Progress %" />
          <button style={{ flex: '0 0 auto' }}>Add</button>
        </form>
      </div>

      <div className="grid cols-2">
        {skills.map((s) => (
          <div key={s.id} className="card">
            <div className="row-between">
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</div>
                <div className="meta" style={{ color: 'var(--muted)', fontSize: 12 }}>{s.category}</div>
              </div>
              <select value={s.level} onChange={(e) => update(s, { level: e.target.value })} style={{ width: 140 }}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="row-between" style={{ margin: '14px 0 6px' }}>
              <span style={{ color: 'var(--ink-2)', fontSize: 13 }}>Progress</span>
              <strong>{s.progress}%</strong>
            </div>
            <div className="progress"><div style={{ width: `${s.progress}%` }} /></div>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue={s.progress}
              onMouseUp={(e) => update(s, { progress: +e.target.value })}
              onTouchEnd={(e) => update(s, { progress: +e.target.value })}
              style={{ marginTop: 10, padding: 0 }}
            />
            {s.projects?.length > 0 && (
              <div className="chip-list mt-8">
                {s.projects.map((pid) => projectName(pid) && <span key={pid} className="badge tag">{projectName(pid)}</span>)}
              </div>
            )}
            <div className="row-between mt-8">
              <select onChange={(e) => e.target.value && update(s, { projects: [...(s.projects || []), +e.target.value] })} value="">
                <option value="">+ link project…</option>
                {projects.filter((p) => !s.projects?.includes(p.id)).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button className="danger" onClick={() => api.delete(`/skills/${s.id}`).then(load)}>delete</button>
            </div>
          </div>
        ))}
        {skills.length === 0 && <div className="empty">No skills tracked yet.</div>}
      </div>
    </>
  );
}
