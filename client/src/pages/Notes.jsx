// ============================================================================
// Notes.jsx  —  A MARKDOWN NOTE EDITOR WITH AUTOSAVE, PREVIEW & VERSION HISTORY
// ----------------------------------------------------------------------------
// The most involved "editor" page. Key ideas to learn here:
//   - DEBOUNCED AUTOSAVE with retry: typing schedules a save 800ms later; failures
//     retry. This avoids saving on every keystroke while never losing work.
//   - A `draft` useRef holding the LATEST text OUTSIDE React state, so the save
//     function can read current values without being re-created on every render.
//   - Markdown -> HTML rendering with the `marked` library and dangerouslySetInnerHTML.
//   - View modes (edit / split / read) and a distraction-free focus mode.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked'; // converts markdown text into HTML
import api from '../api';
import {
  IconNote, IconEdit, IconColumns, IconEye, IconExpand, IconHistory, IconPin, IconPlus,
} from '../components/icons';

// Configure the markdown parser: gfm = GitHub-flavored markdown, breaks = treat
// single newlines as line breaks. Set once at module load.
marked.setOptions({ gfm: true, breaks: true });

// Format a timestamp compactly, e.g. "Jul 8, 02:30 PM".
const fmtTime = (d) =>
  new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function Notes() {
  const [notes, setNotes] = useState(null);      // all notes (null = still loading)
  const [activeId, setActiveId] = useState(null);// which note is open
  const [title, setTitle] = useState('');        // the open note's title (editable)
  const [content, setContent] = useState('');    // the open note's body (editable)
  const [mode, setMode] = useState('split'); // edit | split | read
  const [focusMode, setFocusMode] = useState(false); // hide everything but the editor
  const [saveState, setSaveState] = useState('');    // status text: 'typing…' / 'saving…' / 'saved'
  const [historyOpen, setHistoryOpen] = useState(false);

  const saveTimer = useRef(null); // holds the debounce/retry timeout id
  // Latest editor state, readable outside React's render cycle.
  // WHY a ref and not state: the async `persist` needs the newest title/content at
  // the moment it runs. State would be stale inside a debounced callback; a ref is
  // always current. `dirty` tracks whether there are unsaved changes.
  const draft = useRef({ id: null, title: '', content: '', dirty: false });

  // The currently open note object (found from the list by id).
  const active = notes?.find((n) => n.id === activeId);

  // Actually save the current draft to the server. Guards: skip if nothing is open
  // or nothing changed. On success it also updates the in-memory list so the sidebar
  // timestamp refreshes; on failure it marks dirty again and retries in 3s.
  // useCallback with [] means this function keeps a stable identity across renders.
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
      d.dirty = true;                         // keep the change pending
      setSaveState('offline — retrying');
      saveTimer.current = setTimeout(persist, 3000); // retry later
    }
  }, []);

  // Debounce: called on every keystroke. It resets the timer so the actual save
  // (persist) only fires 800ms after you STOP typing.
  const queueSave = useCallback(() => {
    setSaveState('typing…');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 800);
  }, [persist]);

  // Load a note into the editor: sync both the React state (for rendering) and the
  // draft ref (for saving).
  const openNote = useCallback((note) => {
    setActiveId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setSaveState('');
    setHistoryOpen(false);
    draft.current = { id: note.id, title: note.title, content: note.content, dirty: false };
  }, []);

  // Fetch all notes. Optionally select a specific one (e.g. a just-created note),
  // otherwise open the first. If there are none, clear the editor.
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

  useEffect(() => { load(); }, [load]); // initial fetch

  // Flush pending edits on unmount / tab close.
  // 'beforeunload' fires when the tab is closing; the cleanup's persist() covers
  // navigating away within the app. Together they prevent losing an in-flight edit.
  useEffect(() => {
    const flush = () => persist();
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      persist();
    };
  }, [persist]);

  // Let the Escape key exit focus mode.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setFocusMode(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Title change handler: update state + draft, mirror the rename in the sidebar
  // instantly, and queue a debounced save.
  const onTitle = (v) => {
    setTitle(v);
    draft.current.title = v;
    draft.current.dirty = true;
    // reflect the rename in the sidebar immediately
    setNotes((ns) => ns?.map((n) => (n.id === draft.current.id ? { ...n, title: v || 'Untitled' } : n)));
    queueSave();
  };

  // Body change handler: same idea, without the sidebar update.
  const onContent = (v) => {
    setContent(v);
    draft.current.content = v;
    draft.current.dirty = true;
    queueSave();
  };

  // Switch to another note — but save the current one first so no edits are lost.
  const select = async (n) => {
    if (n.id === activeId) return;
    await persist(); // never lose edits when switching
    const fresh = notes.find((x) => x.id === n.id) || n;
    openNote(fresh);
  };

  // Create a new blank note and open it.
  const create = async () => {
    await persist();
    const { data } = await api.post('/notes', { title: 'Untitled', content: '' });
    await load(data.id);
  };

  // Delete the open note. We clear the dirty flag + timer first so no stray save
  // fires for the now-deleted note.
  const remove = async () => {
    if (!active) return;
    draft.current.dirty = false;
    clearTimeout(saveTimer.current);
    await api.delete(`/notes/${active.id}`);
    await load();
  };

  // Toggle the "pinned" flag on the open note.
  const togglePin = async () => {
    if (!active) return;
    await persist();
    await api.put(`/notes/${active.id}`, { pinned: !active.pinned });
    await load(active.id);
  };

  // Restore an older version's content back into the editor.
  const restore = (v) => {
    onContent(v.content);
    setHistoryOpen(false);
  };

  // Render the markdown to HTML for the preview pane. Memoized so we only re-parse
  // when the content changes. The `{ __html }` shape is what dangerouslySetInnerHTML
  // expects (see the preview div below).
  const html = useMemo(() => ({ __html: marked.parse(content || '*Nothing here yet — start writing.*') }), [content]);

  // Loading state: notes hasn't arrived yet -> show skeleton placeholders.
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
              {/* The rendered markdown preview. dangerouslySetInnerHTML injects raw
                  HTML — named "dangerous" because unsanitized HTML can be an XSS risk.
                  It's acceptable here since the content is the user's own notes. */}
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
