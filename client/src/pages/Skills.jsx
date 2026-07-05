import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import StatTile from '../components/StatTile';
import { IconSpark } from '../components/icons';

const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

/* tiny inline history sparkline */
function Sparkline({ history }) {
  if (!history || history.length < 2) return null;
  const w = 120, h = 30, pad = 2;
  const vals = history.map((p) => p.progress);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const pts = vals
    .map((v, i) => `${pad + (i / (vals.length - 1)) * (w - pad * 2)},${h - pad - ((v - min) / span) * (h - pad * 2)}`)
    .join(' ');
  return (
    <svg width={w} height={h} className="spark" aria-hidden>
      <polyline points={pts} fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

function SkillCard({ s, projects, projectName, update, onDelete }) {
  const [draft, setDraft] = useState(s.progress);
  const dirty = draft !== s.progress;

  return (
    <div className="widget">
      <div className="row-between">
        <div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16 }}>{s.name}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
            since {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            {s.history?.length > 1 && ` · ${s.history.length} checkpoints`}
          </div>
        </div>
        <Sparkline history={s.history} />
      </div>

      <div className="form-row" style={{ margin: '16px 0 14px' }}>
        <div>
          <label>Self-assessed level</label>
          <select value={s.level} onChange={(e) => update(s, { level: e.target.value })}>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label>Linked projects</label>
          <select onChange={(e) => e.target.value && update(s, { projects: [...(s.projects || []), +e.target.value] })} value="">
            <option value="">+ link a project…</option>
            {projects.filter((p) => !s.projects?.includes(p.id)).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      {s.projects?.length > 0 && (
        <div className="chip-list" style={{ marginBottom: 14 }}>
          {s.projects.map((pid) => projectName(pid) && <span key={pid} className="badge tag">{projectName(pid)}</span>)}
        </div>
      )}

      <div className="row-between" style={{ marginBottom: 6 }}>
        <label style={{ margin: 0 }}>Progress</label>
        <strong style={{ fontFamily: 'var(--mono)', fontSize: 15, color: dirty ? 'var(--gold)' : 'inherit' }}>{draft}%</strong>
      </div>
      <div className="progress"><div style={{ width: `${draft}%` }} /></div>
      <input
        type="range" min="0" max="100" value={draft}
        onChange={(e) => setDraft(+e.target.value)}
        style={{ marginTop: 10, padding: 0, accentColor: 'var(--gold)' }}
        aria-label={`${s.name} progress percentage`}
      />
      <div className="hint">
        Drag to your current mastery, then <strong>save</strong> — every save is recorded as a checkpoint
        and drawn on the trend line above and in Analytics.
      </div>
      <div className="row-between mt-8">
        <button className="danger" onClick={onDelete}>delete skill</button>
        {dirty && (
          <span style={{ display: 'flex', gap: 8 }}>
            <button className="ghost small" onClick={() => setDraft(s.progress)}>Reset</button>
            <button className="small" onClick={() => update(s, { progress: draft })}>Save {draft}%</button>
          </span>
        )}
      </div>
    </div>
  );
}

export default function Skills() {
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ name: '', level: 'beginner', progress: 10, category: '' });

  const load = () => {
    api.get('/skills').then((r) => setSkills(r.data));
    api.get('/projects').then((r) => setProjects(r.data));
  };
  useEffect(load, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await api.post('/skills', { ...form, category: form.category.trim() || 'general' });
    setForm({ name: '', level: 'beginner', progress: 10, category: form.category });
    load();
  };

  const update = async (skill, patch) => { await api.put(`/skills/${skill.id}`, patch); load(); };
  const projectName = (id) => projects.find((p) => p.id === id)?.name;

  const stats = useMemo(() => {
    const avg = skills.length ? Math.round(skills.reduce((a, s) => a + s.progress, 0) / skills.length) : 0;
    const top = [...skills].sort((a, b) => b.progress - a.progress)[0];
    const monthAgo = Date.now() - 30 * 86400000;
    const improving = skills.filter((s) => {
      const h = s.history || [];
      const old = h.filter((p) => new Date(p.date) < monthAgo).pop();
      return old && s.progress > old.progress;
    }).length;
    return { count: skills.length, avg, top, improving };
  }, [skills]);

  const categories = useMemo(() => {
    const map = new Map();
    for (const s of skills) {
      const c = s.category || 'general';
      if (!map.has(c)) map.set(c, []);
      map.get(c).push(s);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [skills]);

  return (
    <>
      <h1 className="page-title">Skills</h1>
      <p className="page-sub">Your stack, honestly assessed — and its trajectory.</p>

      <div className="board">
        <div className="stat-strip">
          <StatTile label="Tracked" value={stats.count} delta={`${categories.length} categories`} />
          <StatTile label="Avg progress" value={<>{stats.avg}<em>%</em></>} delta="across the stack" />
          <StatTile label="Strongest" value={stats.top?.name ?? '–'} delta={stats.top ? `${stats.top.progress}% · ${stats.top.level}` : ''} />
          <StatTile label="Improving" value={stats.improving} delta="up in the last 30 days" up={stats.improving > 0} />
        </div>

        <div className="widget w-12">
          <h3><IconSpark size={15} /> Track a skill</h3>
          <form onSubmit={add} className="form-row" style={{ alignItems: 'flex-end' }}>
            <div style={{ flex: 2 }}>
              <label>Skill name</label>
              <input placeholder="e.g. TypeScript" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label>Category</label>
              <input placeholder="frontend, dsa…" list="skill-cats" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <datalist id="skill-cats">{categories.map(([c]) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label>Current level</label>
              <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div style={{ flex: '0 0 110px' }}>
              <label>Progress %</label>
              <input type="number" min="0" max="100" value={form.progress} onChange={(e) => setForm({ ...form, progress: +e.target.value })} />
            </div>
            <button style={{ flex: '0 0 auto' }}>Add skill</button>
          </form>
        </div>

        {categories.map(([cat, items]) => (
          <div key={cat} className="w-12">
            <div className="res-cat-head" style={{ marginBottom: 12 }}>
              <span className="name" style={{ textTransform: 'capitalize' }}>{cat}</span>
              <span className="count">{items.length} · avg {Math.round(items.reduce((a, s) => a + s.progress, 0) / items.length)}%</span>
            </div>
            <div className="grid cols-2">
              {items.map((s) => (
                <SkillCard
                  key={`${s.id}-${s.progress}`}
                  s={s}
                  projects={projects}
                  projectName={projectName}
                  update={update}
                  onDelete={() => api.delete(`/skills/${s.id}`).then(load)}
                />
              ))}
            </div>
          </div>
        ))}
        {skills.length === 0 && <div className="widget w-12"><div className="empty">No skills tracked yet — add your first above.</div></div>}
      </div>
    </>
  );
}
