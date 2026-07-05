import { useMemo, useState } from 'react';
import api from '../api';
import { IconLink } from './icons';

const RESOURCE_TYPES = ['video', 'article', 'repo', 'course', 'book', 'other'];

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

function LinkAdder({ resource, onChange }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');

  const add = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    await api.put(`/resources/${resource.id}`, {
      links: [...(resource.links || []), { label: label.trim() || hostOf(url), url: url.trim() }],
    });
    setUrl('');
    setLabel('');
    setOpen(false);
    onChange();
  };

  if (!open) {
    return (
      <button type="button" className="link-add-toggle" onClick={() => setOpen(true)}>
        + add link
      </button>
    );
  }
  return (
    <form onSubmit={add} className="form-row mt-8">
      <input autoFocus placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 2 }} />
      <input placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
      <button className="small" style={{ flex: '0 0 auto' }}>Add</button>
      <button type="button" className="danger" style={{ flex: '0 0 auto' }} onClick={() => setOpen(false)}>✕</button>
    </form>
  );
}

// Resource library: topics grouped by category, each topic holding multiple links.
const EMPTY_LINK = { url: '', label: '' };

export default function ResourceLibrary({ resources, onChange }) {
  const [form, setForm] = useState({ title: '', type: 'article', category: '' });
  const [linkRows, setLinkRows] = useState([{ ...EMPTY_LINK }]);
  const [filter, setFilter] = useState('all');

  const setLink = (i, patch) =>
    setLinkRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addLinkRow = () => setLinkRows((rows) => [...rows, { ...EMPTY_LINK }]);
  const removeLinkRow = (i) => setLinkRows((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows));

  const categories = useMemo(
    () => [...new Set(resources.map((r) => r.category || 'General'))].sort(),
    [resources]
  );

  const grouped = useMemo(() => {
    const visible = resources.filter((r) => filter === 'all' || (r.category || 'General') === filter);
    const map = new Map();
    for (const r of visible) {
      const cat = r.category || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(r);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [resources, filter]);

  const add = async (e) => {
    e.preventDefault();
    const links = linkRows
      .filter((l) => l.url.trim())
      .map((l) => ({ label: l.label.trim() || hostOf(l.url), url: l.url.trim() }));
    if (!form.title.trim() || links.length === 0) return;
    await api.post('/resources', {
      title: form.title.trim(),
      type: form.type,
      category: form.category.trim() || 'General',
      links,
    });
    setForm({ title: '', type: 'article', category: form.category });
    setLinkRows([{ ...EMPTY_LINK }]);
    onChange();
  };

  const toggleConsumed = async (r) => {
    await api.put(`/resources/${r.id}`, { consumed: !r.consumed });
    onChange();
  };

  const removeLink = async (r, idx) => {
    await api.put(`/resources/${r.id}`, { links: r.links.filter((_, i) => i !== idx) });
    onChange();
  };

  return (
    <div className="card">
      <h3><IconLink size={15} /> Resource library</h3>

      <form onSubmit={add} className="mb-16">
        <div className="form-row" style={{ marginBottom: 10 }}>
          <input style={{ flex: 2 }} placeholder="Topic (e.g. Learn React hooks)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input
            placeholder="Category"
            list="res-categories"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <datalist id="res-categories">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ flex: '0 0 100px' }}>
            {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {linkRows.map((l, i) => (
          <div key={i} className="form-row" style={{ marginBottom: 8 }}>
            <input style={{ flex: 2 }} placeholder={`Link ${i + 1}: https://…`} value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} />
            <input placeholder="Label (optional)" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} />
            {linkRows.length > 1 && (
              <button type="button" className="danger" style={{ flex: '0 0 auto' }} onClick={() => removeLinkRow(i)}>✕</button>
            )}
          </div>
        ))}
        <div className="form-row">
          <button type="button" className="link-add-toggle" style={{ flex: '0 0 auto' }} onClick={addLinkRow}>
            + another link
          </button>
          <span style={{ flex: 1 }} />
          <button className="small" style={{ flex: '0 0 auto' }}>Save topic{linkRows.filter((l) => l.url.trim()).length > 1 ? ` · ${linkRows.filter((l) => l.url.trim()).length} links` : ''}</button>
        </div>
      </form>

      {categories.length > 1 && (
        <div className="chip-list mb-16">
          <button type="button" className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
            all · {resources.length}
          </button>
          {categories.map((c) => (
            <button key={c} type="button" className={`chip ${filter === c ? 'on' : ''}`} onClick={() => setFilter(c)}>
              {c} · {resources.filter((r) => (r.category || 'General') === c).length}
            </button>
          ))}
        </div>
      )}

      {grouped.length === 0 && <div className="empty">No resources yet — save your first topic above.</div>}

      {grouped.map(([cat, items]) => (
        <div key={cat} className="res-cat">
          <div className="res-cat-head">
            <span className="name">{cat}</span>
            <span className="count">{items.length}</span>
          </div>
          {items.map((r) => (
            <div key={r.id} className={`res-topic ${r.consumed ? 'done' : ''}`}>
              <div className="res-topic-head">
                <input type="checkbox" className="checkbox" checked={r.consumed} onChange={() => toggleConsumed(r)} title="Mark done" />
                <span className="title">{r.title}</span>
                <span className="res-type">{r.type}</span>
                <button className="danger" onClick={() => api.delete(`/resources/${r.id}`).then(onChange)}>✕</button>
              </div>
              <div className="res-links">
                {(r.links || []).map((l, i) => (
                  <span key={i} className="res-link">
                    <a href={l.url} target="_blank" rel="noreferrer" title={l.url}>{l.label || hostOf(l.url)}</a>
                    <button type="button" onClick={() => removeLink(r, i)} title="Remove link">✕</button>
                  </span>
                ))}
                <LinkAdder resource={r} onChange={onChange} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
