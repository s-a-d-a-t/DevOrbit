import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import StatTile from '../components/StatTile';
import Modal from '../components/Modal';
import { IconFolder, IconTarget, IconPlus, IconEdit, IconCheck, IconSpark } from '../components/icons';

const STATUSES = ['planned', 'ongoing', 'completed', 'paused'];
const BLANK_PROJECT = { name: '', description: '', techStack: '', repoUrl: '', liveUrl: '', status: 'planned' };
const BLANK_GOAL = { title: '', type: 'career', targetDate: '', milestones: [{ title: '', done: false }] };

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : null);
const daysBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [goals, setGoals] = useState([]);
  const [skills, setSkills] = useState([]);
  const [filter, setFilter] = useState('all');
  const [projModal, setProjModal] = useState(null); // null | 'new' | project
  const [projForm, setProjForm] = useState(BLANK_PROJECT);
  const [goalModal, setGoalModal] = useState(null); // null | 'new' | goal
  const [goalForm, setGoalForm] = useState(BLANK_GOAL);

  const load = () => {
    api.get('/projects').then((r) => setProjects(r.data));
    api.get('/goals').then((r) => setGoals(r.data));
    api.get('/skills').then((r) => setSkills(r.data));
  };
  useEffect(load, []);

  /* ---- projects ---- */
  const openProjCreate = () => { setProjForm(BLANK_PROJECT); setProjModal('new'); };
  const openProjEdit = (p) => {
    setProjForm({
      name: p.name,
      description: p.description || '',
      techStack: (p.techStack || []).join(', '),
      repoUrl: p.repoUrl || '',
      liveUrl: p.liveUrl || '',
      status: p.status,
    });
    setProjModal(p);
  };
  const saveProject = async (e) => {
    e.preventDefault();
    if (!projForm.name.trim()) return;
    const payload = {
      name: projForm.name.trim(),
      description: projForm.description.trim(),
      techStack: projForm.techStack.split(',').map((t) => t.trim()).filter(Boolean),
      repoUrl: projForm.repoUrl.trim(),
      liveUrl: projForm.liveUrl.trim(),
    };
    if (projModal === 'new') {
      await api.post('/projects', { ...payload, startedAt: new Date() });
    } else {
      const status = projForm.status;
      await api.put(`/projects/${projModal.id}`, {
        ...payload,
        status,
        ...(status === 'completed' && !projModal.completedAt ? { completedAt: new Date() } : {}),
        ...(status !== 'completed' ? { completedAt: null } : {}),
      });
    }
    setProjModal(null);
    load();
  };

  const setStatus = async (p, status) => {
    await api.put(`/projects/${p.id}`, {
      status,
      ...(status === 'completed' ? { completedAt: new Date() } : { completedAt: null }),
    });
    load();
  };

  /* ---- goals ---- */
  const openGoalCreate = () => { setGoalForm(BLANK_GOAL); setGoalModal('new'); };
  const openGoalEdit = (g) => {
    setGoalForm({
      title: g.title,
      type: g.type,
      targetDate: g.targetDate ? String(g.targetDate).slice(0, 10) : '',
      milestones: g.milestones.length ? g.milestones.map((m) => ({ ...m })) : [{ title: '', done: false }],
    });
    setGoalModal(g);
  };
  const setMilestone = (i, title) =>
    setGoalForm((f) => ({ ...f, milestones: f.milestones.map((m, idx) => (idx === i ? { ...m, title } : m)) }));
  const addMilestone = () => setGoalForm((f) => ({ ...f, milestones: [...f.milestones, { title: '', done: false }] }));
  const removeMilestone = (i) =>
    setGoalForm((f) => ({ ...f, milestones: f.milestones.length > 1 ? f.milestones.filter((_, idx) => idx !== i) : f.milestones }));

  const saveGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.title.trim()) return;
    const milestones = goalForm.milestones.filter((m) => m.title.trim()).map((m) => ({ title: m.title.trim(), done: !!m.done }));
    const completed = milestones.length > 0 && milestones.every((m) => m.done);
    const payload = {
      title: goalForm.title.trim(),
      type: goalForm.type,
      targetDate: goalForm.targetDate || null,
      milestones,
      completed,
    };
    if (goalModal === 'new') await api.post('/goals', payload);
    else await api.put(`/goals/${goalModal.id}`, payload);
    setGoalModal(null);
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
      <div className="page-head">
        <div>
          <h1 className="page-title">Projects &amp; Goals</h1>
          <p className="page-sub">What you're building, and where it's taking you.</p>
        </div>
        <button className="btn-icon" onClick={openProjCreate}><IconPlus size={15} /> New project</button>
      </div>

      <div className="board">
        <div className="stat-cards">
          <StatTile feature icon={<IconFolder size={17} />} label="In flight" value={stats.ongoing} delta={`${projects.length} total projects`} />
          <StatTile icon={<IconCheck size={17} />} label="Shipped" value={stats.completed} delta="completed projects" up={stats.completed > 0} />
          <StatTile icon={<IconSpark size={17} />} label="Technologies" value={stats.tech} delta="across your stack" />
          <StatTile icon={<IconTarget size={17} />} label="Goals met" value={`${stats.goalsDone}/${goals.length || 0}`} delta="milestone-complete" up={stats.goalsDone > 0} />
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
              <span className="row-actions">
                <span className={`badge status-${p.status}`}>{p.status}</span>
                <button className="icon-act" onClick={() => openProjEdit(p)} title="Edit project"><IconEdit size={15} /></button>
                <button className="icon-act del" onClick={() => api.delete(`/projects/${p.id}`).then(load)} title="Delete project">✕</button>
              </span>
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
              <select value={p.status} onChange={(e) => setStatus(p, e.target.value)} style={{ width: 130 }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ))}
        {visible.length === 0 && <div className="widget w-12"><div className="empty">Nothing here — add a project with the button above.</div></div>}

        <div className="section-head">
          <span className="section-title">Goals <small>{goals.length} tracked</small></span>
          <button className="btn-icon small" onClick={openGoalCreate}><IconPlus size={14} /> New goal</button>
        </div>

        {goals.length === 0 && <div className="widget w-12"><div className="empty">No goals yet — set one to give your work direction.</div></div>}
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
                <span className="row-actions">
                  <span className="badge tag">{g.type}</span>
                  <button className="icon-act" onClick={() => openGoalEdit(g)} title="Edit goal"><IconEdit size={15} /></button>
                  <button className="icon-act del" onClick={() => api.delete(`/goals/${g.id}`).then(load)} title="Delete goal">✕</button>
                </span>
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
            </div>
          );
        })}
      </div>

      {/* project create/edit */}
      <Modal
        open={projModal !== null}
        onClose={() => setProjModal(null)}
        wide
        title={projModal === 'new' ? 'New project' : 'Edit project'}
        sub="Name, stack, and the links that matter — all editable later."
      >
        <form onSubmit={saveProject}>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div style={{ flex: 2 }}>
              <label>Project name</label>
              <input autoFocus placeholder="e.g. DevPulse" value={projForm.name} onChange={(e) => setProjForm({ ...projForm, name: e.target.value })} />
            </div>
            <div>
              <label>Tech stack</label>
              <input placeholder="React, Node, PostgreSQL" value={projForm.techStack} onChange={(e) => setProjForm({ ...projForm, techStack: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Description</label>
            <input placeholder="What is it, in one line?" value={projForm.description} onChange={(e) => setProjForm({ ...projForm, description: e.target.value })} />
          </div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div>
              <label>Repository URL (optional)</label>
              <input placeholder="https://github.com/…" value={projForm.repoUrl} onChange={(e) => setProjForm({ ...projForm, repoUrl: e.target.value })} />
            </div>
            <div>
              <label>Live URL (optional)</label>
              <input placeholder="https://…" value={projForm.liveUrl} onChange={(e) => setProjForm({ ...projForm, liveUrl: e.target.value })} />
            </div>
          </div>
          {projModal !== 'new' && (
            <div style={{ flex: '0 0 160px', maxWidth: 200 }}>
              <label>Status</label>
              <select value={projForm.status} onChange={(e) => setProjForm({ ...projForm, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={() => setProjModal(null)}>Cancel</button>
            <button type="submit">{projModal === 'new' ? 'Add project' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>

      {/* goal create/edit */}
      <Modal
        open={goalModal !== null}
        onClose={() => setGoalModal(null)}
        wide
        title={goalModal === 'new' ? 'New goal' : 'Edit goal'}
        sub="Break it into milestones you can check off as you go."
      >
        <form onSubmit={saveGoal}>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div style={{ flex: 2 }}>
              <label>Goal</label>
              <input autoFocus placeholder="e.g. Land a backend internship" value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} />
            </div>
            <div style={{ flex: '0 0 120px' }}>
              <label>Cadence</label>
              <select value={goalForm.type} onChange={(e) => setGoalForm({ ...goalForm, type: e.target.value })}>
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="career">career</option>
              </select>
            </div>
            <div style={{ flex: '0 0 160px' }}>
              <label>Target date (optional)</label>
              <input type="date" value={goalForm.targetDate} onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })} />
            </div>
          </div>
          <label>Milestones</label>
          {goalForm.milestones.map((m, i) => (
            <div key={i} className="form-row" style={{ marginBottom: 8, alignItems: 'center' }}>
              {goalModal !== 'new' && (
                <input
                  type="checkbox" className="checkbox" checked={!!m.done} style={{ flex: '0 0 auto' }}
                  onChange={(e) => setGoalForm((f) => ({ ...f, milestones: f.milestones.map((x, idx) => (idx === i ? { ...x, done: e.target.checked } : x)) }))}
                  title="Mark done"
                />
              )}
              <input style={{ flex: 2 }} placeholder={`Milestone ${i + 1}`} value={m.title} onChange={(e) => setMilestone(i, e.target.value)} />
              {goalForm.milestones.length > 1 && (
                <button type="button" className="icon-act del" style={{ flex: '0 0 auto' }} onClick={() => removeMilestone(i)} title="Remove">✕</button>
              )}
            </div>
          ))}
          <button type="button" className="link-add-toggle" onClick={addMilestone}>+ another milestone</button>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={() => setGoalModal(null)}>Cancel</button>
            <button type="submit">{goalModal === 'new' ? 'Add goal' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
