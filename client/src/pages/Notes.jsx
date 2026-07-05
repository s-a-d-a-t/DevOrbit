import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import api from '../api';
import {
  IconNote, IconEdit, IconColumns, IconEye, IconExpand, IconHistory, IconPin, IconPlus,
} from '../components/icons';

marked.setOptions({ gfm: true, breaks: true });

const fmtTime = (d) =>
  new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function Notes() {
  const [notes, setNotes] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mode, setMode] = useState('split'); // edit | split | read
  const [focusMode, setFocusMode] = useState(false);
  const [saveState, setSaveState] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);

  const saveTimer = useRef(null);
  // Latest editor state, readable outside React's render cycle.
  const draft = useRef({ id: null, title: '', content: '', dirty: false });

  const active = notes?.find((n) => n.id === activeId);

  const persist = useCallback(async () => {
    const d = draft.current;
    if (!d.id || !d.dirty) return;
    d.dirty = false;
    clearTimeout(saveTimer.current);
    setSaveState('saving…');
    try {
      await api.put(`/notes/${d.id}`, { title: d.title || 'Untitled', content: d.content });
      setSaveState('saved');
      setNotes((ns) =>
        ns?.map((n) => (n.id === d.id ? { ...n, title: d.title || 'Untitled', content: d.content, updatedAt: new Date().toISOString() } : n))
      );
    } catch {
      d.dirty = true;
      setSaveState('offline — retrying');
      saveTimer.current = setTimeout(persist, 3000);
    }
  }, []);

  const queueSave = useCallback(() => {
    setSaveState('typing…');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 800);
  }, [persist]);

  const openNote = useCallback((note) => {
    setActiveId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setSaveState('');
    setHistoryOpen(false);
    draft.current = { id: note.id, title: note.title, content: note.content, dirty: false };
  }, []);

  const load = useCallback(async (selectId) => {
    const { data } = await api.get('/notes');
    setNotes(data);
    if (data.length) {
      const note = data.find((n) => n.id === selectId) || data[0];
      openNote(note);
    } else {
      setActiveId(null);
      draft.current = { id: null, title: '', content: '', dirty: false };
    }
  }, [openNote]);

  useEffect(() => { load(); }, [load]);

  // Flush pending edits on unmount / tab close.
  useEffect(() => {
    const flush = () => persist();
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      persist();
    };
  }, [persist]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setFocusMode(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onTitle = (v) => {
    setTitle(v);
    draft.current.title = v;
    draft.current.dirty = true;
    // reflect the rename in the sidebar immediately
    setNotes((ns) => ns?.map((n) => (n.id === draft.current.id ? { ...n, title: v || 'Untitled' } : n)));
    queueSave();
  };

  const onContent = (v) => {
    setContent(v);
    draft.current.content = v;
    draft.current.dirty = true;
    queueSave();
  };

  const select = async (n) => {
    if (n.id === activeId) return;
    await persist(); // never lose edits when switching
    const fresh = notes.find((x) => x.id === n.id) || n;
    openNote(fresh);
  };

  const create = async () => {
    await persist();
    const { data } = await api.post('/notes', { title: 'Untitled', content: '' });
    await load(data.id);
  };

  const remove = async () => {
    if (!active) return;
    draft.current.dirty = false;
    clearTimeout(saveTimer.current);
    await api.delete(`/notes/${active.id}`);
    await load();
  };

  const togglePin = async () => {
    if (!active) return;
    await persist();
    await api.put(`/notes/${active.id}`, { pinned: !active.pinned });
    await load(active.id);
  };

  const restore = (v) => {
    onContent(v.content);
    setHistoryOpen(false);
  };

  const html = useMemo(() => ({ __html: marked.parse(content || '*Nothing here yet — start writing.*') }), [content]);

  if (notes === null) {
    return (
      <>
        <h1 className="page-title">Notes</h1>
        <div className="stack">
          <div className="skeleton" style={{ height: 42 }} />
          <div className="skeleton" style={{ height: 260 }} />
        </div>
      </>
    );
  }

  return (
    <>
      {!focusMode && (
        <div className="row-between">
          <div>
            <h1 className="page-title">Notes</h1>
            <p className="page-sub">Distraction-free markdown. Everything autosaves.</p>
          </div>
          <button onClick={create}><IconPlus size={14} /> New note</button>
        </div>
      )}

      <div className={focusMode ? '' : 'notes-layout'}>
        {!focusMode && (
          <div className="card notes-list">
            <h3><IconNote size={15} /> Library</h3>
            {notes.length === 0 && <div className="empty">No notes yet.</div>}
            {notes.map((n) => (
              <div key={n.id} className={`note-item ${n.id === activeId ? 'on' : ''}`} onClick={() => select(n)}>
                <div className="t">{n.pinned && <span className="pin">◆</span>}{n.title || 'Untitled'}</div>
                <div className="d">{fmtTime(n.updatedAt)}</div>
              </div>
            ))}
          </div>
        )}

        {active ? (
          <div className={`card editor ${focusMode ? 'focus-mode' : ''}`}>
            <div className="editor-bar">
              <input
                className="title-input"
                value={title}
                onChange={(e) => onTitle(e.target.value)}
                onBlur={persist}
                onKeyDown={(e) => e.key === 'Enter' && persist()}
                placeholder="Untitled"
              />
              <span className={`save-state ${saveState === 'saved' ? 'saved' : ''}`}>{saveState}</span>
              <button className={`icon-btn ${mode === 'edit' ? 'on' : ''}`} title="Write" onClick={() => setMode('edit')}><IconEdit size={16} /></button>
              <button className={`icon-btn ${mode === 'split' ? 'on' : ''}`} title="Split view" onClick={() => setMode('split')}><IconColumns size={16} /></button>
              <button className={`icon-btn ${mode === 'read' ? 'on' : ''}`} title="Reading mode" onClick={() => setMode('read')}><IconEye size={16} /></button>
              <button className={`icon-btn ${focusMode ? 'on' : ''}`} title="Focus mode (Esc to exit)" onClick={() => setFocusMode(!focusMode)}><IconExpand size={16} /></button>
              <span className="history-pop">
                <button className={`icon-btn ${historyOpen ? 'on' : ''}`} title="Version history" onClick={() => setHistoryOpen(!historyOpen)} disabled={!active.versions?.length}>
                  <IconHistory size={16} />
                </button>
                {historyOpen && active.versions?.length > 0 && (
                  <span className="history-menu">
                    {active.versions.map((v, i) => (
                      <button key={i} onClick={() => restore(v)}>
                        {fmtTime(v.savedAt)} · {v.content.length} chars
                      </button>
                    ))}
                  </span>
                )}
              </span>
              <button className={`icon-btn ${active.pinned ? 'on' : ''}`} title="Pin" onClick={togglePin}><IconPin size={16} /></button>
              <button className="danger" title="Delete note" onClick={remove}>✕</button>
            </div>

            <div className={`editor-panes ${mode === 'split' && !focusMode ? 'split' : ''}`}>
              {mode !== 'read' && (
                <textarea
                  value={content}
                  onChange={(e) => onContent(e.target.value)}
                  onBlur={persist}
                  placeholder={'# Heading\n\nWrite markdown here…\n\n- [ ] checklists\n- **bold**, `code`\n\n```js\n// code blocks\n```'}
                  spellCheck={false}
                />
              )}
              {(mode === 'split' && !focusMode) || mode === 'read' ? (
                <div className="md-preview" dangerouslySetInnerHTML={html} />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="empty">
              Create your first note to get started.
              <div className="mt-8"><button onClick={create}>New note</button></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
