import { useEffect, useState } from 'react';
import api from '../api';

const RESOURCE_TYPES = ['video', 'article', 'repo', 'course', 'book', 'other'];

export default function Learning() {
  const [logs, setLogs] = useState([]);
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState({ topic: '', hours: 1, difficulty: 3, notes: '' });
  const [resForm, setResForm] = useState({ title: '', url: '', type: 'article' });

  const load = () => {
    api.get('/learning').then((r) => setLogs(r.data));
    api.get('/resources').then((r) => setResources(r.data));
  };
  useEffect(load, []);

  const addLog = async (e) => {
    e.preventDefault();
    if (!form.topic.trim()) return;
    await api.post('/learning', form);
    setForm({ topic: '', hours: 1, difficulty: 3, notes: '' });
    load();
  };

  const addResource = async (e) => {
    e.preventDefault();
    if (!resForm.title.trim() || !resForm.url.trim()) return;
    await api.post('/resources', resForm);
    setResForm({ title: '', url: '', type: 'article' });
    load();
  };

  const toggleConsumed = async (r) => {
    await api.put(`/resources/${r.id}`, { consumed: !r.consumed });
    load();
  };

  return (
    <>
      <h1 className="page-title">Learning</h1>
      <p className="page-sub">Log study sessions and keep your resource library.</p>

      <div className="card mb-16">
        <h3>Log a session</h3>
        <form onSubmit={addLog} className="form-row">
          <input style={{ flex: 2 }} placeholder="Topic (e.g. React hooks)" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          <input type="number" step="0.5" min="0.5" max="16" value={form.hours} onChange={(e) => setForm({ ...form, hours: +e.target.value })} title="Hours" />
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: +e.target.value })}>
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>difficulty {d}</option>
            ))}
          </select>
          <input style={{ flex: 2 }} placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button style={{ flex: '0 0 auto' }}>Log</button>
        </form>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>📖 Recent sessions</h3>
          {logs.length === 0 && <div className="empty">No sessions yet — log your first one above.</div>}
          {logs.slice(0, 15).map((l) => (
            <div key={l.id} className="item-row">
              <div className="grow">
                <div className="title">{l.topic}</div>
                <div className="meta">
                  {new Date(l.date).toLocaleDateString()} · {'★'.repeat(l.difficulty)}{'☆'.repeat(5 - l.difficulty)}
                  {l.notes && <> · {l.notes}</>}
                </div>
              </div>
              <span className="badge tag">{l.hours}h</span>
              <button className="danger" onClick={() => api.delete(`/learning/${l.id}`).then(load)}>✕</button>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>🔗 Resource library</h3>
          <form onSubmit={addResource} className="form-row mb-16">
            <input placeholder="Title" value={resForm.title} onChange={(e) => setResForm({ ...resForm, title: e.target.value })} />
            <input placeholder="https://…" value={resForm.url} onChange={(e) => setResForm({ ...resForm, url: e.target.value })} />
            <select value={resForm.type} onChange={(e) => setResForm({ ...resForm, type: e.target.value })}>
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button className="small" style={{ flex: '0 0 auto' }}>Save</button>
          </form>
          {resources.map((r) => (
            <div key={r.id} className={`item-row ${r.consumed ? 'done' : ''}`}>
              <input type="checkbox" className="checkbox" checked={r.consumed} onChange={() => toggleConsumed(r)} title="Mark consumed" />
              <div className="grow">
                <div className="title">
                  <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
                </div>
                <div className="meta">{r.type}</div>
              </div>
              <button className="danger" onClick={() => api.delete(`/resources/${r.id}`).then(load)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
