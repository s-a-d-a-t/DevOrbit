import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import DomeGallery from '../components/DomeGallery';
import Modal from '../components/Modal';
import { useTheme } from '../context/ThemeContext';
import { IconImage, IconPlus, IconEdit } from '../components/icons';

const todayISO = () => new Date().toLocaleDateString('en-CA');
const BLANK = { title: '', description: '', imageUrl: '', date: todayISO() };

export default function Memories() {
  const { theme } = useTheme();
  const [memories, setMemories] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | memory
  const [form, setForm] = useState(BLANK);

  const load = () => api.get('/memories').then((r) => setMemories(r.data));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(BLANK); setEditing('new'); };
  const openEdit = (m) => {
    setForm({
      title: m.title,
      description: m.description || '',
      imageUrl: m.imageUrl || '',
      date: m.date ? String(m.date).slice(0, 10) : todayISO(),
    });
    setEditing(m);
  };
  const close = () => setEditing(null);

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.imageUrl.trim()) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      date: form.date || null,
    };
    if (editing === 'new') await api.post('/memories', payload);
    else await api.put(`/memories/${editing.id}`, payload);
    close();
    load();
  };

  // Tiles for the dome — only memories that carry an image.
  const images = useMemo(
    () =>
      memories
        .filter((m) => m.imageUrl)
        .map((m) => ({ src: m.imageUrl, alt: m.title, title: m.title, description: m.description })),
    [memories]
  );

  const span = useMemo(() => {
    const dated = memories.filter((m) => m.date).map((m) => new Date(m.date));
    if (dated.length < 1) return '–';
    const oldest = new Date(Math.min(...dated));
    return oldest.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }, [memories]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Memories</h1>
          <p className="page-sub">Milestones and moments from your journey — drag to spin the dome, tap a moment to relive it.</p>
        </div>
        <button className="btn-icon" onClick={openCreate}><IconPlus size={15} /> Add memory</button>
      </div>

      {images.length === 0 ? (
        <div className="card">
          <div className="empty" style={{ padding: '48px 0' }}>
            No memories yet — capture your first milestone with an image, a title and a few words.
          </div>
        </div>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat-mini"><span className="v">{memories.length}</span><span className="l">captured</span></div>
            <div className="stat-mini"><span className="v">{images.length}</span><span className="l">on the dome</span></div>
            <div className="stat-mini"><span className="v">{span}</span><span className="l">since</span></div>
          </div>

          <div className="dome-wrap">
            <DomeGallery
              images={images}
              grayscale={false}
              fit={0.45}
              minRadius={200}
              overlayBlurColor={theme === 'dark' ? '#111315' : '#F4F6F9'}
              openedImageWidth="360px"
              openedImageHeight="360px"
              imageBorderRadius="18px"
              openedImageBorderRadius="20px"
            />
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <h3><IconImage size={15} /> All memories</h3>
            {memories.map((m) => (
              <div key={m.id} className="item-row" style={{ alignItems: 'center' }}>
                {m.imageUrl && (
                  <img
                    src={m.imageUrl}
                    alt=""
                    style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                  />
                )}
                <div className="grow">
                  <div className="title">{m.title}</div>
                  <div className="meta">
                    {m.date && new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    {m.description && ` · ${m.description}`}
                  </div>
                </div>
                <span className="row-actions">
                  <button className="icon-act" onClick={() => openEdit(m)} title="Edit memory"><IconEdit size={15} /></button>
                  <button className="icon-act del" onClick={() => api.delete(`/memories/${m.id}`).then(load)} title="Delete memory">✕</button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'Add a memory' : 'Edit memory'}
        sub="A moment worth keeping — an image, a title, and the story behind it."
      >
        <form onSubmit={save}>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div style={{ flex: 2 }}>
              <label>Title</label>
              <input autoFocus placeholder="e.g. Shipped DevPulse v1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Image URL</label>
            <input placeholder="https://… (paste a link to a photo)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            {form.imageUrl.trim() && (
              <img
                src={form.imageUrl}
                alt="preview"
                style={{ marginTop: 10, width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--hairline)' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
              />
            )}
          </div>
          <div>
            <label>Description</label>
            <textarea rows={3} placeholder="What happened, why it mattered…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={close}>Cancel</button>
            <button type="submit">{editing === 'new' ? 'Add memory' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
