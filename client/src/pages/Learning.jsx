import { useEffect, useState } from 'react';
import api from '../api';
import ResourceLibrary from '../components/ResourceLibrary';
import { IconBook } from '../components/icons';

export default function Learning() {
  const [logs, setLogs] = useState([]);
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState({ topic: '', hours: 1, difficulty: 3, notes: '' });

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
          <h3><IconBook size={15} /> Recent sessions</h3>
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

        <ResourceLibrary resources={resources} onChange={load} />
      </div>
    </>
  );
}
