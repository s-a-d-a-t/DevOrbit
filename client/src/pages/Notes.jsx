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
  const skipSave = useRef(false);

  const active = notes?.find((n) => n.id === activeId);

  const load = useCallback(async (selectId) => {
    const { data } = await api.get('/notes');
    setNotes(data);
    if (data.length) {
      const pick = selectId ?? data[0].id;
      const note = data.find((n) => n.id === pick) || data[0];
      skipSave.current = true;
      setActiveId(note.id);
      setTitle(note.title);
      setContent(note.content);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setFocusMode(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // debounced autosave
  useEffect(() => {
    if (!activeId) return;
    if (skipSave.current) { skipSave.current = false; return; }
    setSaveState('typing…');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState('saving…');
      await api.put(`/notes/${activeId}`, { title, content });
      setSaveState('saved');
      setNotes((ns) => ns.map((n) => (n.id === activeId ? { ...n, title, content, updatedAt: new Date().toISOString() } : n)));
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [title, content, activeId]);

  const select = (n) => {
    clearTimeout(saveTimer.current);
    skipSave.current = true;
    setActiveId(n.id);
    setTitle(n.title);
    setContent(n.content);
    setSaveState('');
    setHistoryOpen(false);
  };

  const create = async () => {
    const { data } = await api.post('/notes', { title: 'Untitled', content: '' });
    await load(data.id);
  };

  const remove = async () => {
    if (!active) return;
    await api.delete(`/notes/${active.id}`);
    setActiveId(null);
    await load();
  };

  const togglePin = async () => {
    if (!active) return;
    await api.put(`/notes/${active.id}`, { pinned: !active.pinned });
    await load(active.id);
  };

  const restore = async (v) => {
    skipSave.current = false;
    setContent(v.content);
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
              <input className="title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" />
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
                  onChange={(e) => setContent(e.target.value)}
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
