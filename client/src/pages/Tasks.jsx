import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import StatTile from '../components/StatTile';
import { IconCheck, IconClock, IconTarget } from '../components/icons';

const COLUMNS = [
  ['pending', 'Backlog'],
  ['in-progress', 'In progress'],
  ['done', 'Done'],
];
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

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
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', tags: '', dueDate: '' });

  const load = () => api.get('/tasks').then((r) => setTasks(r.data));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await api.post('/tasks', {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      dueDate: form.dueDate || undefined,
    });
    setForm({ title: '', description: '', priority: 'medium', tags: '', dueDate: '' });
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
      <h1 className="page-title">Tasks</h1>
      <p className="page-sub">Backlog to done, nothing slips.</p>

      <div className="board">
        <div className="stat-strip">
          <StatTile label="Open" value={stats.open} delta={`${stats.doing} in motion`} />
          <StatTile label="Overdue" value={stats.overdue} delta={stats.overdue ? 'clear these first' : 'all clear'} up={stats.overdue === 0} />
          <StatTile label="Completed" value={stats.done} delta="all time" />
          <StatTile label="Completion" value={<>{stats.rate}<em>%</em></>} delta={`${tasks.length} total tasks`} up={stats.rate >= 50} />
        </div>

        <div className="widget w-12">
          <h3><IconTarget size={15} /> New task</h3>
          <form onSubmit={add}>
            <div className="form-row" style={{ marginBottom: 10 }}>
              <div style={{ flex: 2 }}>
                <label>Task</label>
                <input placeholder="What needs doing?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div style={{ flex: '0 0 150px' }}>
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </div>
              <div style={{ flex: '0 0 160px' }}>
                <label>Due date (optional)</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="form-row" style={{ alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <label>Details (optional)</label>
                <input placeholder="Context, links, acceptance criteria…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label>Tags</label>
                <input placeholder="dsa, work, devpulse" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </div>
              <button style={{ flex: '0 0 auto' }}>Add task</button>
            </div>
          </form>
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
                      <button className="danger" onClick={() => remove(t)}>✕</button>
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
    </>
  );
}
