import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import StatTile from '../components/StatTile';
import Modal from '../components/Modal';
import { IconCheck, IconClock, IconTarget, IconPlus, IconEdit } from '../components/icons';

const COLUMNS = [
  ['pending', 'Backlog'],
  ['in-progress', 'In progress'],
  ['done', 'Done'],
];
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const BLANK = { title: '', description: '', priority: 'medium', tags: '', dueDate: '' };

const dueInfo = (t) => {
  if (!t.dueDate || t.status === 'done') return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(t.dueDate); due.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { cls: 'overdue', label: `${-days}d overdue` };
  if (days === 0) return { cls: 'today', label: 'due today' };
  if (days <= 3) return { cls: 'soon', label: `in ${days}d` };
  return { cls: '', label: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [query, setQuery] = useState('');
  const [prio, setPrio] = useState('all');
  const [editing, setEditing] = useState(null); // null = closed, 'new' = create, else task
  const [form, setForm] = useState(BLANK);

  const load = () => api.get('/tasks').then((r) => setTasks(r.data));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(BLANK); setEditing('new'); };
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

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      dueDate: form.dueDate || null,
    };
    if (editing === 'new') await api.post('/tasks', payload);
    else await api.put(`/tasks/${editing.id}`, payload);
    close();
    load();
  };

  const setStatus = async (task, status) => { await api.put(`/tasks/${task.id}`, { status }); load(); };
  const remove = async (task) => { await api.delete(`/tasks/${task.id}`); load(); };

  const stats = useMemo(() => {
    const open = tasks.filter((t) => t.status !== 'done').length;
    const doing = tasks.filter((t) => t.status === 'in-progress').length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const overdue = tasks.filter((t) => dueInfo(t)?.cls === 'overdue').length;
    const rate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    return { open, doing, done, overdue, rate };
  }, [tasks]);

  const visible = useMemo(() => {
    const q = query.toLowerCase();
    return tasks
      .filter((t) => prio === 'all' || t.priority === prio)
      .filter((t) => !q || t.title.toLowerCase().includes(q) || t.tags?.some((tag) => tag.toLowerCase().includes(q)))
      .sort((a, b) => {
        const da = dueInfo(a)?.cls === 'overdue' ? -1 : 0;
        const db = dueInfo(b)?.cls === 'overdue' ? -1 : 0;
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
        <div className="stat-strip">
          <StatTile label="Open" value={stats.open} delta={`${stats.doing} in motion`} />
          <StatTile label="Overdue" value={stats.overdue} delta={stats.overdue ? 'clear these first' : 'all clear'} up={stats.overdue === 0} />
          <StatTile label="Completed" value={stats.done} delta="all time" />
          <StatTile label="Completion" value={<>{stats.rate}<em>%</em></>} delta={`${tasks.length} total tasks`} up={stats.rate >= 50} />
        </div>

        <div className="w-12 row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <input placeholder="Search title or tag…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 280 }} />
          <div className="chip-list">
            {['all', 'high', 'medium', 'low'].map((p) => (
              <button key={p} type="button" className={`chip ${prio === p ? 'on' : ''}`} onClick={() => setPrio(p)}>{p}</button>
            ))}
          </div>
        </div>

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
