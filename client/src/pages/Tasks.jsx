// ============================================================================
// Tasks.jsx  —  A KANBAN-STYLE TASK BOARD (Backlog / In progress / Done)
// ----------------------------------------------------------------------------
// A full CRUD page (Create, Read, Update, Delete) with three columns, search,
// priority filtering, and due-date urgency. It reuses the same building blocks
// you've already seen: StatTile for the top cards, Modal for the add/edit form,
// useMemo for derived lists. Once you understand this file, most app pages will
// feel familiar — they all follow this shape.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import StatTile from '../components/StatTile';
import Modal from '../components/Modal';
import { IconCheck, IconClock, IconTarget, IconPlus, IconEdit, IconFlame, IconChart } from '../components/icons';

// The three board columns: [status value stored in the DB, human label].
const COLUMNS = [
  ['pending', 'Backlog'],
  ['in-progress', 'In progress'],
  ['done', 'Done'],
];
// Numeric ranks so we can sort high→medium→low easily.
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
// A blank form, reused whenever we open the "new task" modal.
const BLANK = { title: '', description: '', priority: 'medium', tags: '', dueDate: '' };

// Given a task, work out its due-date urgency. Returns null if there's no due date
// or it's already done, otherwise a { cls, label } used to color + label the chip.
// 86400000 is the number of milliseconds in a day, so (due - today)/that = whole days.
const dueInfo = (t) => {
  if (!t.dueDate || t.status === 'done') return null;
  const today = new Date(); today.setHours(0, 0, 0, 0); // zero the time so we compare whole days
  const due = new Date(t.dueDate); due.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { cls: 'overdue', label: `${-days}d overdue` };
  if (days === 0) return { cls: 'today', label: 'due today' };
  if (days <= 3) return { cls: 'soon', label: `in ${days}d` };
  return { cls: '', label: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);            // all tasks from the server
  const [query, setQuery] = useState('');            // search box text
  const [prio, setPrio] = useState('all');           // active priority filter chip
  const [editing, setEditing] = useState(null); // null = closed, 'new' = create, else task
  const [form, setForm] = useState(BLANK);           // the modal's form fields

  // Fetch all tasks into state. Re-called after every create/update/delete.
  const load = () => api.get('/tasks').then((r) => setTasks(r.data));
  useEffect(() => { load(); }, []); // load once on mount

  // Open the modal blank (create) ...
  const openCreate = () => { setForm(BLANK); setEditing('new'); };
  // ... or pre-filled from an existing task (edit). Note tags is an array in the DB
  // but a comma string in the form, and the date is trimmed to YYYY-MM-DD for the input.
  const openEdit = (t) => {
    setForm({
      title: t.title,
      description: t.description || '',
      priority: t.priority,
      tags: (t.tags || []).join(', '),
      dueDate: t.dueDate ? String(t.dueDate).slice(0, 10) : '',
    });
    setEditing(t);
  };
  const close = () => setEditing(null);

  // Save handler — same function for create and edit (POST vs PUT decided by `editing`).
  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return; // title is required
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      // Convert the comma-separated tags string back into a clean array.
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      dueDate: form.dueDate || null,
    };
    if (editing === 'new') await api.post('/tasks', payload);
    else await api.put(`/tasks/${editing.id}`, payload);
    close();
    load();
  };

  // Move a task between columns (change its status), then refresh.
  const setStatus = async (task, status) => { await api.put(`/tasks/${task.id}`, { status }); load(); };
  // Delete a task, then refresh.
  const remove = async (task) => { await api.delete(`/tasks/${task.id}`); load(); };

  // Derived: the numbers shown in the top StatTiles. useMemo recomputes only when
  // `tasks` changes, not on every keystroke in the search box.
  const stats = useMemo(() => {
    const open = tasks.filter((t) => t.status !== 'done').length;
    const doing = tasks.filter((t) => t.status === 'in-progress').length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const overdue = tasks.filter((t) => dueInfo(t)?.cls === 'overdue').length;
    const rate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    return { open, doing, done, overdue, rate };
  }, [tasks]);

  // Derived: the filtered + sorted list actually shown. Three steps, chained:
  //   1. filter by the active priority chip,
  //   2. filter by the search query (matches title OR any tag),
  //   3. sort overdue tasks first, then by priority.
  const visible = useMemo(() => {
    const q = query.toLowerCase();
    return tasks
      .filter((t) => prio === 'all' || t.priority === prio)
      .filter((t) => !q || t.title.toLowerCase().includes(q) || t.tags?.some((tag) => tag.toLowerCase().includes(q)))
      .sort((a, b) => {
        const da = dueInfo(a)?.cls === 'overdue' ? -1 : 0;
        const db = dueInfo(b)?.cls === 'overdue' ? -1 : 0;
        // `da - db` sorts overdue first; if tied, fall back to priority rank.
        return da - db || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      });
  }, [tasks, query, prio]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-sub">Backlog to done, nothing slips.</p>
        </div>
        <button className="btn-icon" onClick={openCreate}><IconPlus size={15} /> New task</button>
      </div>

      <div className="board">
        <div className="stat-cards">
          <StatTile feature icon={<IconCheck size={17} />} label="Open" value={stats.open} delta={`${stats.doing} in motion`} />
          <StatTile icon={<IconFlame size={17} />} label="Overdue" value={stats.overdue} delta={stats.overdue ? 'clear these first' : 'all clear'} up={stats.overdue === 0} />
          <StatTile icon={<IconTarget size={17} />} label="Completed" value={stats.done} delta="all time" />
          <StatTile icon={<IconChart size={17} />} label="Completion" value={<>{stats.rate}<em>%</em></>} delta={`${tasks.length} total tasks`} up={stats.rate >= 50} />
        </div>

        <div className="w-12 row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <input placeholder="Search title or tag…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 280 }} />
          <div className="chip-list">
            {['all', 'high', 'medium', 'low'].map((p) => (
              <button key={p} type="button" className={`chip ${prio === p ? 'on' : ''}`} onClick={() => setPrio(p)}>{p}</button>
            ))}
          </div>
        </div>

        {/* Render the three columns. For each, pick the visible tasks whose status
            matches, then render a card per task. This is the kanban board itself. */}
        {COLUMNS.map(([status, label]) => {
          const col = visible.filter((t) => t.status === status);
          return (
            <div key={status} className="widget w-4 task-col">
              <div className="row-between" style={{ marginBottom: 14 }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {status === 'done' ? <IconCheck size={15} /> : status === 'in-progress' ? <IconClock size={15} /> : <IconTarget size={15} />}
                  {label}
                </h3>
                <span className="col-count">{col.length}</span>
              </div>
              {col.length === 0 && <div className="empty">Empty.</div>}
              {col.map((t) => {
                const due = dueInfo(t);
                return (
                  <div key={t.id} className={`task-card ${due?.cls || ''} ${t.status === 'done' ? 'is-done' : ''}`}>
                    <div className="task-top">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={t.status === 'done'}
                        onChange={() => setStatus(t, t.status === 'done' ? 'pending' : 'done')}
                        title={t.status === 'done' ? 'Reopen' : 'Mark done'}
                      />
                      <span className="title">{t.title}</span>
                      <span className="row-actions">
                        <button className="icon-act" onClick={() => openEdit(t)} title="Edit task"><IconEdit size={15} /></button>
                        <button className="icon-act del" onClick={() => remove(t)} title="Delete task">✕</button>
                      </span>
                    </div>
                    {t.description && <div className="task-desc">{t.description}</div>}
                    <div className="task-meta">
                      <span className={`badge ${t.priority}`}>{t.priority}</span>
                      {due && <span className={`due-chip ${due.cls}`}>{due.label}</span>}
                      {t.tags?.map((tag) => <span key={tag} className="badge tag">{tag}</span>)}
                    </div>
                    {/* Quick "move between columns" buttons, shown only if not done.
                        These give a click-to-advance alternative to drag-and-drop. */}
                    {t.status !== 'done' && (
                      <div className="task-actions">
                        {t.status === 'pending' && <button type="button" className="ghost small" onClick={() => setStatus(t, 'in-progress')}>Start →</button>}
                        {t.status === 'in-progress' && (
                          <>
                            <button type="button" className="ghost small" onClick={() => setStatus(t, 'pending')}>← Backlog</button>
                            <button type="button" className="small" onClick={() => setStatus(t, 'done')}>Complete</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <Modal
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'New task' : 'Edit task'}
        sub={editing === 'new' ? 'Capture it now, sort it later.' : 'Update the details below.'}
      >
        <form onSubmit={save}>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div style={{ flex: '1 1 100%' }}>
              <label>Task</label>
              <input autoFocus placeholder="What needs doing?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div style={{ flex: '0 0 150px' }}>
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>
            <div style={{ flex: '0 0 170px' }}>
              <label>Due date (optional)</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div>
              <label>Tags</label>
              <input placeholder="dsa, work, devpulse" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
          </div>
          <div>
            <label>Details (optional)</label>
            <textarea rows={3} placeholder="Context, links, acceptance criteria…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={close}>Cancel</button>
            <button type="submit">{editing === 'new' ? 'Add task' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
