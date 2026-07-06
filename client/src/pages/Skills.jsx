import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import StatTile from '../components/StatTile';
import Modal from '../components/Modal';
import { IconSpark, IconPlus, IconEdit } from '../components/icons';

const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
const BLANK = { name: '', level: 'beginner', progress: 10, category: '' };

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

function SkillCard({ s, projects, projectName, update, onEdit, onDelete }) {
  const [draft, setDraft] = useState(s.progress);
  const dirty = draft !== s.progress;

  return (
    <div className="widget">
      <div className="row-between">
        <div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16 }}>{s.name}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
            {s.level} · since {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            {s.history?.length > 1 && ` · ${s.history.length} checkpoints`}
          </div>
        </div>
        <span className="row-actions">
          <Sparkline history={s.history} />
          <button className="icon-act" onClick={onEdit} title="Edit skill"><IconEdit size={15} /></button>
          <button className="icon-act del" onClick={onDelete} title="Delete skill">✕</button>
        </span>
      </div>

      <div style={{ margin: '16px 0 14px' }}>
        <label>Linked projects</label>
        <select onChange={(e) => e.target.value && update(s, { projects: [...(s.projects || []), +e.target.value] })} value="">
          <option value="">+ link a project…</option>
          {projects.filter((p) => !s.projects?.includes(p.id)).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
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
        and drawn on the trend line and in Analytics.
      </div>
      {dirty && (
        <div className="row-between mt-8" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="ghost small" onClick={() => setDraft(s.progress)}>Reset</button>
          <button className="small" onClick={() => update(s, { progress: draft })}>Save {draft}%</button>
        </div>
      )}
    </div>
  );
}

export default function Skills() {
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | skill
  const [form, setForm] = useState(BLANK);

  const load = () => {
    api.get('/skills').then((r) => setSkills(r.data));
    api.get('/projects').then((r) => setProjects(r.data));
  };
  useEffect(load, []);

  const openCreate = () => { setForm(BLANK); setEditing('new'); };
  const openEdit = (s) => {
    setForm({ name: s.name, level: s.level, progress: s.progress, category: s.category || 'general' });
    setEditing(s);
  };
  const close = () => setEditing(null);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editing === 'new') {
      await api.post('/skills', { ...form, category: form.category.trim() || 'general' });
    } else {
      await api.put(`/skills/${editing.id}`, {
        name: form.name.trim(),
        level: form.level,
        category: form.category.trim() || 'general',
      });
    }
    close();
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
      <div className="page-head">
        <div>
          <h1 className="page-title">Skills</h1>
          <p className="page-sub">Your stack, honestly assessed — and its trajectory.</p>
        </div>
        <button className="btn-icon" onClick={openCreate}><IconPlus size={15} /> Add skill</button>
      </div>

      <div className="board">
        <div className="stat-strip">
          <StatTile label="Tracked" value={stats.count} delta={`${categories.length} categories`} />
          <StatTile label="Avg progress" value={<>{stats.avg}<em>%</em></>} delta="across the stack" />
          <StatTile label="Strongest" value={stats.top?.name ?? '–'} delta={stats.top ? `${stats.top.progress}% · ${stats.top.level}` : ''} />
          <StatTile label="Improving" value={stats.improving} delta="up in the last 30 days" up={stats.improving > 0} />
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
                  onEdit={() => openEdit(s)}
                  onDelete={() => api.delete(`/skills/${s.id}`).then(load)}
                />
              ))}
            </div>
          </div>
        ))}
        {skills.length === 0 && <div className="widget w-12"><div className="empty">No skills tracked yet — add your first with the button above.</div></div>}
      </div>

      <Modal
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'Track a skill' : 'Edit skill'}
        sub={editing === 'new' ? 'Name it, categorize it, set a starting point.' : 'Progress is edited on the card itself.'}
      >
        <form onSubmit={save}>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div style={{ flex: 2 }}>
              <label>Skill name</label>
              <input autoFocus placeholder="e.g. TypeScript" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label>Category</label>
              <input placeholder="frontend, dsa…" list="skill-cats" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <datalist id="skill-cats">{categories.map(([c]) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div className="form-row">
            <div>
              <label>Current level</label>
              <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            {editing === 'new' && (
              <div style={{ flex: '0 0 130px' }}>
                <label>Starting %</label>
                <input type="number" min="0" max="100" value={form.progress} onChange={(e) => setForm({ ...form, progress: +e.target.value })} />
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={close}>Cancel</button>
            <button type="submit">{editing === 'new' ? 'Add skill' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
