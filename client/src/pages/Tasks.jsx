import { useEffect, useState } from 'react';
import api from '../api';

const STATUSES = ['pending', 'in-progress', 'done'];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ title: '', priority: 'medium', tags: '', dueDate: '' });

  const load = () => api.get('/tasks').then((r) => setTasks(r.data));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await api.post('/tasks', {
      title: form.title.trim(),
      priority: form.priority,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      dueDate: form.dueDate || undefined,
    });
    setForm({ title: '', priority: 'medium', tags: '', dueDate: '' });
    load();
  };

  const setStatus = async (task, status) => {
    await api.put(`/tasks/${task.id}`, { status });
    load();
  };
  const remove = async (task) => {
    await api.delete(`/tasks/${task.id}`);
    load();
  };

  const visible = tasks.filter((t) => filter === 'all' || t.status === filter);

  return (
    <>
      <h1 className="page-title">Tasks</h1>
      <p className="page-sub">{tasks.filter((t) => t.status !== 'done').length} open · {tasks.filter((t) => t.status === 'done').length} done</p>

      <div className="card mb-16">
        <h3>Add task</h3>
        <form onSubmit={add} className="form-row">
          <input style={{ flex: 3 }} placeholder="What needs doing?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input placeholder="tags, comma,separated" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <button style={{ flex: '0 0 auto' }}>Add</button>
        </form>
      </div>

      <div className="chip-list mb-16">
        {['all', ...STATUSES].map((s) => (
          <button key={s} className={filter === s ? 'small' : 'small ghost'} onClick={() => setFilter(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="card">
        {visible.length === 0 && <div className="empty">No tasks here.</div>}
        {visible.map((t) => (
          <div key={t.id} className={`item-row ${t.status === 'done' ? 'done' : ''}`}>
            <input
              type="checkbox"
              className="checkbox"
              checked={t.status === 'done'}
              onChange={() => setStatus(t, t.status === 'done' ? 'pending' : 'done')}
            />
            <div className="grow">
              <div className="title">{t.title}</div>
              <div className="meta">
                {t.dueDate && <>due {new Date(t.dueDate).toLocaleDateString()} · </>}
                {t.tags?.map((tag) => (
                  <span key={tag} className="badge tag" style={{ marginRight: 4 }}>{tag}</span>
                ))}
              </div>
            </div>
            <span className={`badge ${t.priority}`}>{t.priority}</span>
            <select value={t.status} onChange={(e) => setStatus(t, e.target.value)} style={{ width: 130 }}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button className="danger" onClick={() => remove(t)}>✕</button>
          </div>
        ))}
      </div>
    </>
  );
}
