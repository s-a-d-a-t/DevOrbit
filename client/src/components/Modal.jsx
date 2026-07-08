// ============================================================================
// Modal.jsx  —  A REUSABLE POPUP DIALOG
// ----------------------------------------------------------------------------
// A "modal" is the centered popup box that dims the page behind it and demands
// attention — every create/edit form in this app opens inside one of these.
// Writing it ONCE here means all our dialogs look and behave the same.
//
// It's a "controlled" component: the PARENT decides whether it's open (via the
// `open` prop) and what happens on close (via the `onClose` prop). This modal
// just renders the box and reports "the user wants to close".
// ============================================================================

import { useEffect } from 'react';

// Props explained:
//   open     - boolean: should the modal be visible right now?
//   onClose  - function to call when the user dismisses it (ESC / backdrop / X).
//   title    - heading text at the top.
//   sub      - optional smaller subtitle under the title.
//   children - the actual form/content placed between <Modal>...</Modal>.
//   wide     - optional flag to render a wider variant (defaults to false).
export default function Modal({ open, onClose, title, sub, children, wide = false }) {
  // Side effects tied to being open: an ESC-key listener and locking page scroll.
  useEffect(() => {
    if (!open) return; // do nothing while closed
    const onKey = (e) => e.key === 'Escape' && onClose(); // ESC closes the modal
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden'; // prevent the page behind from scrolling
    // Cleanup: remove the listener and restore scrolling when it closes/unmounts.
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // If it's not open, render nothing at all. Returning null is React's way of
  // saying "put nothing here".
  if (!open) return null;

  return (
    // The dark full-screen backdrop. Clicking it closes the modal.
    // NOTE: we use onMouseDown (not onClick). If a user starts selecting text
    // INSIDE the card and releases the mouse outside it, onClick would fire and
    // wrongly close it. Reacting to mouse-DOWN on the backdrop avoids that.
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"          // accessibility: tells screen readers this is a dialog
        aria-modal="true"      // ...and that the rest of the page is inert
        aria-label={title}
        // Stop the mouse-down from bubbling up to the backdrop, so clicks INSIDE
        // the card don't trigger the backdrop's close handler.
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h3 className="modal-title">{title}</h3>
            {/* Only render the subtitle if one was provided. */}
            {sub && <p className="modal-sub">{sub}</p>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {/* `children` is the content the parent nested inside this modal. */}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
