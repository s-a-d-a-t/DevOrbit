// ============================================================================
// Skills.jsx  —  SKILL TRACKER WITH MASTERY %, LEVELS, AND TREND CHARTS
// ----------------------------------------------------------------------------
// Same CRUD + StatTile + Modal skeleton as Tasks, but a great place to learn some
// hand-drawn SVG dataviz. Three small presentational components are defined first:
//   - Ring:       a circular progress dial (the "how do you draw a % ring?" trick)
//   - LevelLadder: beginner→expert rungs that light up
//   - Sparkline:  a tiny inline trend line of past progress checkpoints
// Then SkillCard combines them per skill, and the Skills page ties it together.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import StatTile from '../components/StatTile';
import Modal from '../components/Modal';
import { IconSpark, IconPlus, IconEdit, IconFolder, IconChart, IconFlame } from '../components/icons';

const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert']; // the ordered skill ladder
const BLANK = { name: '', level: 'beginner', progress: 10, category: '' };

/* circular progress ring */
// Draws a donut where a colored arc represents `value`% of a full circle. The trick:
// a circle's stroke can be dashed; we set the dash length to the full circumference,
// then offset it by the "unfilled" fraction so only the filled part shows.
function Ring({ value, size = 72, stroke = 7 }) {
  const r = (size - stroke) / 2;      // radius (leave room so the thick stroke isn't clipped)
  const c = 2 * Math.PI * r;          // circumference = total dash length
  const off = c * (1 - Math.min(100, Math.max(0, value)) / 100); // how much to "hide" (clamped 0..100)
  const id = `ring-${size}`;          // unique id for the gradient definition
  return (
    <svg width={size} height={size} className="ring" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold-strong)" />
          <stop offset="1" stopColor="var(--gold)" />
        </linearGradient>
      </defs>
      {/* Track circle: the full faint background ring. */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
      {/* Progress arc: same circle, but dashed + offset so only `value`% shows. The
          rotate(-90) starts the arc at 12 o'clock; the transition animates changes. */}
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s var(--ease)' }}
      />
      {/* The number in the middle. dy nudges it to vertical center. */}
      <text x="50%" y="50%" dy="0.34em" textAnchor="middle" className="ring-text">{value}</text>
    </svg>
  );
}

/* beginner → expert ladder */
// Four rungs; every rung up to and including the current level gets the "on" class.
function LevelLadder({ level }) {
  const idx = LEVELS.indexOf(level); // position of the current level in the ladder
  return (
    <div className="ladder" title={level}>
      {LEVELS.map((l, i) => (
        <span key={l} className={`rung${i <= idx ? ' on' : ''}`} />
      ))}
    </div>
  );
}

/* history trend sparkline */
// A miniature line chart of past progress values, drawn by hand as an SVG polyline.
// Needs at least 2 points to draw a line. The `xy` helper maps a data point to
// pixel coordinates: index -> x across the width, value -> y (inverted, since SVG
// y grows downward). `line` is the stroke; `area` closes it to the bottom for a fill.
function Sparkline({ history }) {
  if (!history || history.length < 2) return null;
  const w = 116, h = 34, pad = 3;                       // canvas size + padding
  const vals = history.map((p) => p.progress);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;                          // avoid divide-by-zero if flat
  const xy = (v, i) => [pad + (i / (vals.length - 1)) * (w - pad * 2), h - pad - ((v - min) / span) * (h - pad * 2)];
  const line = vals.map((v, i) => xy(v, i).join(',')).join(' '); // "x1,y1 x2,y2 ..."
  const [lx, ly] = xy(vals[vals.length - 1], vals.length - 1);   // last point (for the dot)
  const area = `${pad},${h} ${line} ${w - pad},${h}`;  // polygon: line + down to baseline
  return (
    <svg width={w} height={h} className="spark" aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spark-fill)" />
      <polyline points={line} fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.6" fill="var(--gold)" />
    </svg>
  );
}

// One card per skill. Combines the Ring, LevelLadder, Sparkline and an inline
// "update mastery" slider. `draft` holds the slider value locally until you save,
// so dragging feels instant without hitting the server on every pixel.
function SkillCard({ s, projects, projectName, update, onEdit, onDelete }) {
  const [draft, setDraft] = useState(s.progress); // local, unsaved mastery value
  const [tuning, setTuning] = useState(false);    // is the slider panel open?
  const dirty = draft !== s.progress;             // has the draft diverged from saved?
  // Overall trend since the first recorded checkpoint (positive = improved).
  const trend = (() => {
    const h = s.history || [];
    if (h.length < 2) return null;
    return s.progress - h[0].progress;
  })();

  // Persist the drafted mastery value as a new checkpoint, then close the panel.
  const commit = () => { update(s, { progress: draft }); setTuning(false); };

  return (
    <div className="skill-card">
      <div className="skill-card-top">
        <Ring value={draft} />
        <div className="skill-meta">
          <div className="skill-name">{s.name}</div>
          <LevelLadder level={s.level} />
          <div className="skill-sub">
            <span className="cap">{s.level}</span>
            <span className="dot">·</span>
            since {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
            {trend != null && trend !== 0 && (
              <span className={`trend ${trend > 0 ? 'up' : 'down'}`}>{trend > 0 ? '▲' : '▼'} {Math.abs(trend)}</span>
            )}
          </div>
        </div>
        <span className="row-actions">
          <button className="icon-act" onClick={onEdit} title="Edit skill"><IconEdit size={15} /></button>
          <button className="icon-act del" onClick={onDelete} title="Delete skill">✕</button>
        </span>
      </div>

      {s.history?.length > 1 && (
        <div className="skill-spark"><Sparkline history={s.history} /></div>
      )}

      {/* Projects this skill is linked to, plus a dropdown to link another. The
          `+e.target.value` converts the selected option string to a number id. */}
      <div className="skill-projects">
        {(s.projects || []).map((pid) => projectName(pid) && (
          <span key={pid} className="badge tag">{projectName(pid)}</span>
        ))}
        <select
          className="link-select"
          onChange={(e) => e.target.value && update(s, { projects: [...(s.projects || []), +e.target.value] })}
          value=""
        >
          <option value="">+ link project</option>
          {projects.filter((p) => !s.projects?.includes(p.id)).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {!tuning ? (
        <button className="ghost small tune-btn" onClick={() => { setDraft(s.progress); setTuning(true); }}>
          Update mastery
        </button>
      ) : (
        <div className="tune">
          <div className="row-between" style={{ marginBottom: 8 }}>
            <label style={{ margin: 0 }}>Mastery</label>
            <strong style={{ fontFamily: 'var(--mono)', fontSize: 15, color: dirty ? 'var(--gold)' : 'inherit' }}>{draft}%</strong>
          </div>
          <input
            type="range" min="0" max="100" value={draft}
            onChange={(e) => setDraft(+e.target.value)}
            style={{ padding: 0, accentColor: 'var(--gold)' }}
            aria-label={`${s.name} mastery percentage`}
          />
          <div className="row-between mt-8" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button className="ghost small" onClick={() => setTuning(false)}>Cancel</button>
            <button className="small" onClick={commit} disabled={!dirty}>Save checkpoint</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Skills() {
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([]); // for the "link project" dropdown on each card
  const [editing, setEditing] = useState(null); // null | 'new' | skill
  const [form, setForm] = useState(BLANK);
  const [filter, setFilter] = useState('all');  // active category filter

  // Skills need projects too (to show/link them), so load both.
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

  // Patch any field(s) of a skill (used by the slider, project links, etc.).
  const update = async (skill, patch) => { await api.put(`/skills/${skill.id}`, patch); load(); };
  // Look up a project's name by id (returns undefined if not found).
  const projectName = (id) => projects.find((p) => p.id === id)?.name;

  // Derived summary numbers for the top StatTiles: count, average mastery, the
  // strongest skill, and how many improved in the last 30 days.
  const stats = useMemo(() => {
    const avg = skills.length ? Math.round(skills.reduce((a, s) => a + s.progress, 0) / skills.length) : 0;
    const top = [...skills].sort((a, b) => b.progress - a.progress)[0];
    const monthAgo = Date.now() - 30 * 86400000;
    const improving = skills.filter((s) => {
      const h = s.history || [];
      const old = h.filter((p) => new Date(p.date) < monthAgo).pop(); // last checkpoint before a month ago
      return old && s.progress > old.progress;
    }).length;
    return { count: skills.length, avg, top, improving };
  }, [skills]);

  // Group skills by category and compute each category's average mastery, sorted
  // strongest-first. Drives the "Mastery by category" bars and the filter chips.
  const categories = useMemo(() => {
    const map = new Map();
    for (const s of skills) {
      const c = s.category || 'general';
      if (!map.has(c)) map.set(c, []);
      map.get(c).push(s);
    }
    return [...map.entries()]
      .map(([name, items]) => ({
        name,
        items,
        avg: Math.round(items.reduce((a, s) => a + s.progress, 0) / items.length),
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [skills]);

  // The skills actually shown: filtered by category, sorted by mastery descending.
  const visible = useMemo(() => {
    const list = filter === 'all' ? skills : skills.filter((s) => (s.category || 'general') === filter);
    return [...list].sort((a, b) => b.progress - a.progress);
  }, [skills, filter]);

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
        <div className="stat-cards">
          <StatTile feature icon={<IconSpark size={17} />} label="Tracked" value={stats.count} delta={`${categories.length} categories`} />
          <StatTile icon={<IconChart size={17} />} label="Avg mastery" value={<>{stats.avg}<em>%</em></>} delta="across the stack" />
          <StatTile icon={<IconFlame size={17} />} label="Strongest" value={stats.top?.name ?? '–'} delta={stats.top ? `${stats.top.progress}% · ${stats.top.level}` : ''} />
          <StatTile icon={<IconFolder size={17} />} label="Improving" value={stats.improving} delta="up in the last 30 days" up={stats.improving > 0} />
        </div>

        {categories.length > 0 && (
          <div className="widget w-12">
            <h3><IconChart size={15} /> Mastery by category</h3>
            <div className="cat-bars">
              {categories.map((c) => (
                <button
                  key={c.name}
                  className={`cat-bar${filter === c.name ? ' on' : ''}`}
                  onClick={() => setFilter(filter === c.name ? 'all' : c.name)}
                >
                  <div className="cat-bar-head">
                    <span className="cat-name">{c.name}</span>
                    <span className="cat-val">{c.avg}%<em>· {c.items.length}</em></span>
                  </div>
                  <div className="progress"><div style={{ width: `${c.avg}%` }} /></div>
                </button>
              ))}
            </div>
          </div>
        )}

        {skills.length > 0 && (
          <div className="w-12">
            <div className="chip-list filter-row">
              <button className={`chip${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>
                All · {skills.length}
              </button>
              {categories.map((c) => (
                <button key={c.name} className={`chip${filter === c.name ? ' on' : ''}`} onClick={() => setFilter(c.name)}>
                  {c.name} · {c.items.length}
                </button>
              ))}
            </div>
            <div className="skill-grid">
              {visible.map((s) => (
                // Including progress in the key forces React to remount the card when
                // mastery changes, so its internal `draft` slider state resets cleanly.
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
        )}

        {skills.length === 0 && (
          <div className="widget w-12"><div className="empty">No skills tracked yet — add your first with the button above.</div></div>
        )}
      </div>

      <Modal
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'Track a skill' : 'Edit skill'}
        sub={editing === 'new' ? 'Name it, categorize it, set a starting point.' : 'Mastery is edited on the card itself.'}
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
              <datalist id="skill-cats">{categories.map((c) => <option key={c.name} value={c.name} />)}</datalist>
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
