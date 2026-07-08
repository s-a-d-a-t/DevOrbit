// ============================================================================
// ResourceLibrary.jsx  —  A "SAVED STUDY MATERIALS" WIDGET (used on the Learning page)
// ----------------------------------------------------------------------------
// This is the most feature-rich component so far, so it's a great one to study.
// It shows learning resources grouped by category. Each "topic" (e.g. "Learn
// React hooks") can hold several links, be marked done, edited, or deleted.
//
// It demonstrates lots of core React ideas together:
//   - a small helper component (LinkAdder) nested beside the main one,
//   - useState for form state, useMemo for derived/computed lists,
//   - talking to the backend with api.post / api.put / api.delete (full CRUD),
//   - the "lift state up" pattern: this component doesn't own the data; the parent
//     passes `resources` in and an `onChange` callback to re-fetch after a change.
// ============================================================================

import { useMemo, useState } from 'react';
import api from '../api';
import Modal from './Modal';
import { IconLink, IconPlus, IconEdit } from './icons';

// The fixed set of resource types the user can choose from a dropdown.
const RESOURCE_TYPES = ['video', 'article', 'repo', 'course', 'book', 'other'];
// A blank link row, reused whenever we need a fresh empty input pair.
const EMPTY_LINK = { url: '', label: '' };

// Turn a full URL into a clean hostname, e.g. "https://www.youtube.com/watch?x"
// -> "youtube.com". Used as a fallback label when the user doesn't type one.
// Wrapped in try/catch because `new URL()` throws on malformed input — in that
// case we just show whatever they typed.
const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

// --- Small nested helper component ------------------------------------------
// Inline "add link later" on an existing topic — the quick path.
// Shows a "+ add link" button that expands into a mini form. It's its own
// component so each topic row can have independent open/typed state.
function LinkAdder({ resource, onChange }) {
  const [open, setOpen] = useState(false); // is the mini form expanded?
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');

  // Append a new link to this resource, then reset and tell the parent to refresh.
  const add = async (e) => {
    e.preventDefault();          // stop the browser's default full-page form submit
    if (!url.trim()) return;     // ignore empty submissions
    // PUT updates the existing resource. We send the FULL new links array:
    // the old links (spread with ...) plus the new one appended.
    await api.put(`/resources/${resource.id}`, {
      links: [...(resource.links || []), { label: label.trim() || hostOf(url), url: url.trim() }],
    });
    setUrl('');
    setLabel('');
    setOpen(false);
    onChange();                  // ask the parent to re-fetch so the UI updates
  };

  // Collapsed state: just the toggle button.
  if (!open) {
    return (
      <button type="button" className="link-add-toggle" onClick={() => setOpen(true)}>
        + add link
      </button>
    );
  }
  // Expanded state: the mini add-a-link form.
  return (
    <form onSubmit={add} className="form-row mt-8">
      <input autoFocus placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 2 }} />
      <input placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
      <button className="small" style={{ flex: '0 0 auto' }}>Add</button>
      <button type="button" className="icon-act del" style={{ flex: '0 0 auto' }} onClick={() => setOpen(false)}>✕</button>
    </form>
  );
}

// --- The main component ------------------------------------------------------
// Resource library: topics grouped by category, each topic holding multiple links.
// Props: `resources` (the data to show) and `onChange` (call after any edit to
// tell the parent page to re-fetch). This is a "controlled by parent" design.
export default function ResourceLibrary({ resources, onChange }) {
  const [filter, setFilter] = useState('all');                 // which category chip is selected
  const [editing, setEditing] = useState(null);                // null=closed | 'new'=creating | a resource=editing it
  const [form, setForm] = useState({ title: '', type: 'article', category: '' }); // the create/edit modal fields
  const [linkRows, setLinkRows] = useState([{ ...EMPTY_LINK }]);// the dynamic list of link inputs in the modal

  // --- Helpers to manage the array of link input rows in the modal ---
  // These all use the "updater function" form of setState: setLinkRows(prev => ...).
  // That's the safe way to update state that's derived from the previous state.

  // Patch one row (by index) with new values, leaving the others unchanged.
  const setLink = (i, patch) =>
    setLinkRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  // Append a fresh empty row.
  const addLinkRow = () => setLinkRows((rows) => [...rows, { ...EMPTY_LINK }]);
  // Remove a row by index — but never let the list drop below one row.
  const removeLinkRow = (i) => setLinkRows((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows));

  // Derived data: the unique, sorted list of categories present in the resources.
  // `new Set([...])` removes duplicates; useMemo avoids recomputing every render.
  const categories = useMemo(
    () => [...new Set(resources.map((r) => r.category || 'General'))].sort(),
    [resources]
  );

  // Derived data: resources filtered by the active chip, then bucketed by category
  // into [categoryName, items[]] pairs, sorted alphabetically. This is exactly the
  // shape the render loop below wants.
  const grouped = useMemo(() => {
    const visible = resources.filter((r) => filter === 'all' || (r.category || 'General') === filter);
    const map = new Map(); // Map preserves insertion + lets us group by key easily
    for (const r of visible) {
      const cat = r.category || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(r);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [resources, filter]);

  // Open the modal in "create" mode: reset the form to blanks.
  const openCreate = () => {
    setForm({ title: '', type: 'article', category: '' });
    setLinkRows([{ ...EMPTY_LINK }]);
    setEditing('new');
  };
  // Open the modal in "edit" mode: pre-fill the form from the resource `r`.
  const openEdit = (r) => {
    setForm({ title: r.title, type: r.type, category: r.category || 'General' });
    // If the resource has links, load them into rows; otherwise start with one blank row.
    setLinkRows(r.links?.length ? r.links.map((l) => ({ url: l.url, label: l.label || '' })) : [{ ...EMPTY_LINK }]);
    setEditing(r);
  };
  const close = () => setEditing(null); // closing = clearing the "editing" target

  // Save handler for the modal — handles BOTH create and edit.
  const save = async (e) => {
    e.preventDefault();
    // Keep only rows that actually have a URL, and normalize each into {label, url}.
    const links = linkRows
      .filter((l) => l.url.trim())
      .map((l) => ({ label: l.label.trim() || hostOf(l.url), url: l.url.trim() }));
    // Basic validation: require a title and at least one link.
    if (!form.title.trim() || links.length === 0) return;
    const payload = {
      title: form.title.trim(),
      type: form.type,
      category: form.category.trim() || 'General',
      links,
    };
    // POST creates a new record; PUT updates the existing one. This is the core
    // difference between "new" and "edit" — same form, different HTTP verb + URL.
    if (editing === 'new') await api.post('/resources', payload);
    else await api.put(`/resources/${editing.id}`, payload);
    close();
    onChange();
  };

  // Flip a resource's "done/consumed" checkbox. We send only the changed field.
  const toggleConsumed = async (r) => {
    await api.put(`/resources/${r.id}`, { consumed: !r.consumed });
    onChange();
  };

  // Remove a single link from a resource by rebuilding its links array without that index.
  const removeLink = async (r, idx) => {
    await api.put(`/resources/${r.id}`, { links: r.links.filter((_, i) => i !== idx) });
    onChange();
  };

  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}><IconLink size={15} /> Resource library</h3>
        <button className="btn-icon small" onClick={openCreate}><IconPlus size={14} /> Add resource</button>
      </div>

      {/* Category filter chips — only shown if there's more than one category to filter by. */}
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

      {/* Empty state — friendly message when there's nothing to show. */}
      {grouped.length === 0 && <div className="empty">No resources yet — add your first topic.</div>}

      {/* Render each category and its topics. Outer map = categories, inner map = topics. */}
      {grouped.map(([cat, items]) => (
        <div key={cat} className="res-cat">
          <div className="res-cat-head">
            <span className="name">{cat}</span>
            <span className="count">{items.length}</span>
          </div>
          {items.map((r) => (
            // One topic row. The `done` class strikes it through when consumed.
            <div key={r.id} className={`res-topic ${r.consumed ? 'done' : ''}`}>
              <div className="res-topic-head">
                {/* Controlled checkbox: `checked` reflects state, onChange updates the server. */}
                <input type="checkbox" className="checkbox" checked={r.consumed} onChange={() => toggleConsumed(r)} title="Mark done" />
                <span className="title">{r.title}</span>
                <span className="res-type">{r.type}</span>
                <span className="row-actions">
                  <button className="icon-act" onClick={() => openEdit(r)} title="Edit topic"><IconEdit size={15} /></button>
                  <button className="icon-act del" onClick={() => api.delete(`/resources/${r.id}`).then(onChange)} title="Delete topic">✕</button>
                </span>
              </div>
              {/* The topic's links, each opening in a new tab. `rel="noreferrer"` is a
                  security/privacy best practice for target="_blank" links. The trailing
                  LinkAdder is the inline "+ add link" helper defined at the top of this file. */}
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

      {/* The create/edit modal. It's "open" whenever `editing` isn't null, and its
          title/button text switch based on whether we're creating or editing. */}
      <Modal
        open={editing !== null}
        onClose={close}
        wide
        title={editing === 'new' ? 'Add resource' : 'Edit resource'}
        sub="Group study materials by topic — add as many links as you need."
      >
        <form onSubmit={save}>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div style={{ flex: 2 }}>
              <label>Topic</label>
              <input autoFocus placeholder="e.g. Learn React hooks" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label>Category — groups the library</label>
              {/* `list` + <datalist> gives this text input an autocomplete dropdown of
                  existing categories, while still allowing a brand-new one to be typed. */}
              <input placeholder="Frontend, Databases…" list="res-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <datalist id="res-categories">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div style={{ flex: '0 0 110px' }}>
              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {/* Dynamic list of link inputs. The user can add/remove rows freely. */}
          <label>Links — add every material for this topic</label>
          {linkRows.map((l, i) => (
            <div key={i} className="form-row" style={{ marginBottom: 8 }}>
              <input style={{ flex: 2 }} placeholder={`Link ${i + 1}: https://…`} value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} />
              <input placeholder="Label (optional)" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} />
              {linkRows.length > 1 && (
                <button type="button" className="icon-act del" style={{ flex: '0 0 auto' }} onClick={() => removeLinkRow(i)} title="Remove">✕</button>
              )}
            </div>
          ))}
          <button type="button" className="link-add-toggle" onClick={addLinkRow}>+ another link</button>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={close}>Cancel</button>
            <button type="submit">{editing === 'new' ? 'Save topic' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
