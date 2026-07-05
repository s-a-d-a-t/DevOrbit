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
export default function ResourceLibrary({ resources, onChange }) {
  const [form, setForm] = useState({ title: '', url: '', label: '', type: 'article', category: '' });
  const [filter, setFilter] = useState('all');

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
    if (!form.title.trim() || !form.url.trim()) return;
    await api.post('/resources', {
      title: form.title.trim(),
      type: form.type,
      category: form.category.trim() || 'General',
      links: [{ label: form.label.trim() || hostOf(form.url), url: form.url.trim() }],
    });
    setForm({ title: '', url: '', label: '', type: 'article', category: form.category });
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

      <form onSubmit={add} className="form-row mb-16">
        <input style={{ flex: '1 1 100%' }} placeholder="Topic (e.g. Learn React hooks)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input style={{ flex: 2 }} placeholder="First link: https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        <input placeholder="Link label (optional)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
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
        <button className="small" style={{ flex: '0 0 auto' }}>Save</button>
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
