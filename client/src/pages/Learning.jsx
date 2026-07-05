import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import api from '../api';
import ResourceLibrary from '../components/ResourceLibrary';
import StatTile from '../components/StatTile';
import { IconBook, IconChart, IconSpark } from '../components/icons';
import { SERIES, INK, GRID, AXIS, tooltipStyle } from '../chartTheme';

const todayISO = () => new Date().toLocaleDateString('en-CA');
const round1 = (n) => Math.round(n * 10) / 10;
const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export default function Learning() {
  const [logs, setLogs] = useState([]);
  const [resources, setResources] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [form, setForm] = useState({ topic: '', hours: 1, difficulty: 3, notes: '', tags: '', date: todayISO() });
  const [linkRows, setLinkRows] = useState([{ url: '', label: '' }]);

  const setLink = (i, patch) => setLinkRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addLinkRow = () => setLinkRows((rows) => [...rows, { url: '', label: '' }]);
  const removeLinkRow = (i) => setLinkRows((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows));

  const load = () => {
    api.get('/learning').then((r) => setLogs(r.data));
    api.get('/resources').then((r) => setResources(r.data));
    api.get('/analytics/study-hours?weeks=10').then((r) => setWeekly(r.data));
  };
  useEffect(load, []);

  const addLog = async (e) => {
    e.preventDefault();
    if (!form.topic.trim()) return;
    await api.post('/learning', {
      topic: form.topic.trim(),
      hours: form.hours,
      difficulty: form.difficulty,
      notes: form.notes,
      date: form.date,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      links: linkRows
        .filter((l) => l.url.trim())
        .map((l) => ({ label: l.label.trim() || hostOf(l.url), url: l.url.trim() })),
    });
    setForm({ topic: '', hours: 1, difficulty: 3, notes: '', tags: '', date: todayISO() });
    setLinkRows([{ url: '', label: '' }]);
    load();
  };

  /* ---- derived stats ---- */
  const stats = useMemo(() => {
    const total = logs.reduce((a, l) => a + l.hours, 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = logs.filter((l) => new Date(l.date) >= weekAgo).reduce((a, l) => a + l.hours, 0);
    const avgDiff = logs.length ? logs.reduce((a, l) => a + l.difficulty, 0) / logs.length : 0;
    const days = new Set(logs.map((l) => String(l.date).slice(0, 10))).size;
    return { total: round1(total), thisWeek: round1(thisWeek), sessions: logs.length, avgDiff: round1(avgDiff), days };
  }, [logs]);

  const topTopics = useMemo(() => {
    const map = new Map();
    for (const l of logs) map.set(l.topic, (map.get(l.topic) || 0) + l.hours);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [logs]);
  const maxTopic = topTopics[0]?.[1] || 1;

  return (
    <>
      <h1 className="page-title">Learning</h1>
      <p className="page-sub">Every hour logged is an hour you can see compound.</p>

      <div className="board">
        <div className="stat-strip">
          <StatTile label="Total logged" value={<>{stats.total}<em>h</em></>} delta={`across ${stats.days} days`} />
          <StatTile label="This week" value={<>{stats.thisWeek}<em>h</em></>} delta={stats.thisWeek > 0 ? 'keep the rhythm' : 'no sessions yet'} up={stats.thisWeek > 0} />
          <StatTile label="Sessions" value={stats.sessions} delta={`avg ${stats.sessions ? round1(stats.total / stats.sessions) : 0}h each`} />
          <StatTile label="Avg difficulty" value={<>{stats.avgDiff}<em>/5</em></>} delta={stats.avgDiff >= 3.5 ? 'pushing hard' : 'comfortable zone'} />
        </div>

        <div className="widget w-7">
          <h3><IconBook size={15} /> Log a session</h3>
          <form onSubmit={addLog}>
            <div className="form-row" style={{ marginBottom: 10 }}>
              <div style={{ flex: 2 }}>
                <label>Topic</label>
                <input placeholder="What did you study? (e.g. B-tree indexes)" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
              </div>
              <div>
                <label>Session date</label>
                <input type="date" value={form.date} max={todayISO()} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: 10 }}>
              <div>
                <label>Hours</label>
                <input type="number" step="0.5" min="0.5" max="16" value={form.hours} onChange={(e) => setForm({ ...form, hours: +e.target.value })} />
              </div>
              <div>
                <label>Difficulty</label>
                <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: +e.target.value })}>
                  <option value={1}>1 — trivial</option>
                  <option value={2}>2 — easy</option>
                  <option value={3}>3 — solid effort</option>
                  <option value={4}>4 — hard</option>
                  <option value={5}>5 — brain-melting</option>
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <label>Tags</label>
                <input placeholder="react, dsa, sql…" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: 10 }}>
              <textarea rows={2} placeholder="Notes — what clicked, what didn't, what to revisit…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ flex: '1 1 100%' }} />
            </div>
            <label>Resources used (optional)</label>
            {linkRows.map((l, i) => (
              <div key={i} className="form-row" style={{ marginBottom: 8 }}>
                <input style={{ flex: 2 }} placeholder={`Resource ${i + 1}: https://…`} value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} />
                <input placeholder="Label (optional)" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} />
                {linkRows.length > 1 && (
                  <button type="button" className="danger" style={{ flex: '0 0 auto' }} onClick={() => removeLinkRow(i)}>✕</button>
                )}
              </div>
            ))}
            <div className="form-row">
              <button type="button" className="link-add-toggle" style={{ flex: '0 0 auto' }} onClick={addLinkRow}>
                + another resource
              </button>
              <span style={{ flex: 1 }} />
              <button style={{ flex: '0 0 auto' }}>Log session</button>
            </div>
          </form>
        </div>

        <div className="widget w-5">
          <h3><IconChart size={15} /> Hours per week</h3>
          {weekly.length === 0 ? (
            <div className="empty">Your weekly chart appears after the first session.</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={weekly} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="week" stroke={AXIS} tick={{ fill: INK.muted, fontSize: 10.5, fontFamily: 'JetBrains Mono' }} tickLine={false} tickFormatter={(w) => w.split('-')[1]} />
                <YAxis stroke={AXIS} tick={{ fill: INK.muted, fontSize: 10.5, fontFamily: 'JetBrains Mono' }} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="hours" name="Hours" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="widget w-7">
          <h3><IconBook size={15} /> Session journal</h3>
          {logs.length === 0 && <div className="empty">No sessions yet — log your first one above.</div>}
          {logs.slice(0, 12).map((l) => (
            <div key={l.id} className="item-row" style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <div className="title">{l.topic}</div>
                <div className="meta">
                  {new Date(l.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' · '}
                  <span style={{ color: 'var(--gold)' }}>{'★'.repeat(l.difficulty)}</span>
                  <span style={{ opacity: 0.35 }}>{'★'.repeat(5 - l.difficulty)}</span>
                  {l.tags?.length > 0 && <> · {l.tags.map((t) => <span key={t} className="badge tag" style={{ marginRight: 4 }}>{t}</span>)}</>}
                </div>
                {l.notes && <div className="meta" style={{ marginTop: 4, color: 'var(--silver)' }}>{l.notes}</div>}
                {l.links?.length > 0 && (
                  <div className="res-links" style={{ paddingLeft: 0, marginTop: 8 }}>
                    {l.links.map((lnk, i) => (
                      <span key={i} className="res-link">
                        <a href={lnk.url} target="_blank" rel="noreferrer" title={lnk.url}>{lnk.label || hostOf(lnk.url)}</a>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="badge medium">{l.hours}h</span>
              <button className="danger" onClick={() => api.delete(`/learning/${l.id}`).then(load)}>✕</button>
            </div>
          ))}
        </div>

        <div className="widget w-5">
          <h3><IconSpark size={15} /> Where your hours go</h3>
          {topTopics.length === 0 && <div className="empty">Topics rank here as you log sessions.</div>}
          {topTopics.map(([topic, hours]) => (
            <div key={topic} style={{ marginBottom: 12 }}>
              <div className="row-between" style={{ marginBottom: 5 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{topic}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--slate)' }}>{round1(hours)}h</span>
              </div>
              <div className="progress"><div style={{ width: `${(hours / maxTopic) * 100}%` }} /></div>
            </div>
          ))}
        </div>

        <div className="w-12">
          <ResourceLibrary resources={resources} onChange={load} />
        </div>
      </div>
    </>
  );
}
