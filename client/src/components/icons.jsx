// ============================================================================
// icons.jsx  —  OUR HAND-DRAWN SVG ICON SET
// ----------------------------------------------------------------------------
// Rather than pull in a big icon library, we draw each icon inline as an SVG.
// An icon is just an <svg> with some <path>/<rect>/<circle> shapes inside it.
//
// THE KEY IDEA (read this once and every icon below makes sense):
//   `I` is a shared wrapper component that provides the identical <svg> boilerplate
//   for every icon — size, the 24×24 coordinate system (viewBox), rounded strokes,
//   etc. Each exported IconXxx just supplies the SHAPES that go inside that wrapper.
//   So we write the common setup ONCE and each icon stays a single readable line.
//
// TWO THINGS WORTH KNOWING:
//   - stroke="currentColor": the icon automatically takes the text color of
//     whatever element contains it. Change the CSS `color` and the icon recolors.
//   - Every icon accepts a `size` prop (default 18) and forwards it to `I`.
//     `(p) => <I {...p}>...` means "pass all incoming props straight through".
// ============================================================================

// The shared SVG wrapper. `children` are the shapes; `size` sets width & height.
const I = ({ children, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"        // internal coordinate grid all shapes are drawn on
    fill="none"                // outline icons, not filled
    stroke="currentColor"      // line color = surrounding text color
    strokeWidth="1.8"
    strokeLinecap="round"      // rounded line ends...
    strokeLinejoin="round"     // ...and rounded corners, for a soft look
    aria-hidden                // decorative: hide from screen readers
  >
    {children}
  </svg>
);

// --- The icons ---------------------------------------------------------------
// Each one follows the same recipe: spread props into <I>, then draw its shapes.
// The `d="..."` on a <path> is SVG's drawing language (M = move, L = line, etc.).
// You rarely read these by hand — the names tell you what each icon depicts.

export const IconGrid = (p) => (
  <I {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></I>
);
export const IconCheck = (p) => (
  <I {...p}><rect x="3" y="3" width="18" height="18" rx="4" /><path d="m8.5 12 2.5 2.5 5-5" /></I>
);
export const IconBook = (p) => (
  <I {...p}><path d="M4 19V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5" /><path d="M4 19a2.5 2.5 0 0 0 2.5 2.5H19V17" /></I>
);
export const IconSpark = (p) => (
  <I {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /><circle cx="12" cy="12" r="3.2" /></I>
);
export const IconFolder = (p) => (
  <I {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></I>
);
export const IconChart = (p) => (
  <I {...p}><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-5M12 16V8M16 16v-3" /></I>
);
export const IconUser = (p) => (
  <I {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></I>
);
export const IconFlame = (p) => (
  <I {...p}><path d="M12 3s5.5 4.5 5.5 10a5.5 5.5 0 0 1-11 0c0-2 1-4 2.5-5.5 0 2 .8 3 2 3.5C10.5 8.5 12 5.5 12 3Z" /></I>
);
export const IconClock = (p) => (
  <I {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></I>
);
export const IconLink = (p) => (
  <I {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.6l-1.2 1.2" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.6l1.2-1.2" /></I>
);
export const IconTarget = (p) => (
  <I {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></I>
);
export const IconRepeat = (p) => (
  <I {...p}><path d="M17 2.5 21 6.5l-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="M7 21.5 3 17.5l4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></I>
);
export const IconBell = (p) => (
  <I {...p}><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 19a2 2 0 0 0 4 0" /></I>
);
export const IconLogo = (p) => (
  <I {...p} size={p?.size ?? 22}><path d="M3 12h4l2.5-6 4 12L16 12h5" /></I>
);
export const IconNote = (p) => (
  <I {...p}><path d="M5 3h11l3 3v15H5Z" /><path d="M15 3v4h4" /><path d="M9 12h6M9 16h4" /></I>
);
export const IconSearch = (p) => (
  <I {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></I>
);
export const IconChevron = (p) => (
  <I {...p}><path d="m14.5 6-5 6 5 6" /></I>
);
export const IconPin = (p) => (
  <I {...p}><path d="M9 3h6l-1 7 3.5 3.5H6.5L10 10Z" /><path d="M12 13.5V21" /></I>
);
export const IconHistory = (p) => (
  <I {...p}><path d="M4 12a8 8 0 1 1 2.3 5.6" /><path d="M4 13v-4h4" /><path d="M12 8v4l3 2" /></I>
);
export const IconEye = (p) => (
  <I {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></I>
);
export const IconColumns = (p) => (
  <I {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M12 4v16" /></I>
);
export const IconEdit = (p) => (
  <I {...p}><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z" /></I>
);
export const IconExpand = (p) => (
  <I {...p}><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" /></I>
);
export const IconPlus = (p) => (
  <I {...p}><path d="M12 5v14M5 12h14" /></I>
);
export const IconImage = (p) => (
  <I {...p}><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.8" /><path d="m4 17 4.5-4.5a2 2 0 0 1 2.8 0L16 17" /><path d="m14 15 1.8-1.8a2 2 0 0 1 2.8 0L20 15" /></I>
);
export const IconSun = (p) => (
  <I {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></I>
);
export const IconMoon = (p) => (
  <I {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></I>
);
// IconGitHub is the exception: the GitHub logo is a SOLID (filled) shape, not an
// outline, so it can't use the outline-only `I` wrapper — it defines its own <svg>
// with fill="currentColor" instead of stroke.
export const IconGitHub = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 1.5A10.5 10.5 0 0 0 8.68 21.96c.53.1.72-.23.72-.5v-1.96c-2.92.63-3.54-1.24-3.54-1.24-.48-1.21-1.17-1.54-1.17-1.54-.95-.65.07-.64.07-.64 1.06.08 1.61 1.08 1.61 1.08.94 1.6 2.46 1.14 3.06.87.1-.68.37-1.14.66-1.4-2.33-.27-4.79-1.17-4.79-5.2 0-1.14.41-2.08 1.08-2.81-.1-.27-.47-1.34.1-2.79 0 0 .89-.28 2.9 1.08a10.1 10.1 0 0 1 5.29 0c2.01-1.36 2.9-1.08 2.9-1.08.57 1.45.2 2.52.1 2.79.67.73 1.08 1.67 1.08 2.81 0 4.04-2.46 4.93-4.81 5.19.38.33.72.97.72 1.96v2.9c0 .28.19.61.73.5A10.5 10.5 0 0 0 12 1.5Z" />
  </svg>
);
export const IconMail = (p) => (
  <I {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7.5 8 6 8-6" /></I>
);
export const IconArrowUpRight = (p) => (
  <I {...p}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></I>
);
export const IconStop = (p) => (
  <I {...p}><rect x="6" y="6" width="12" height="12" rx="2.5" /></I>
);
export const IconClose = (p) => (
  <I {...p}><path d="M6 6l12 12M18 6 6 18" /></I>
);
export const IconMenu = (p) => (
  <I {...p}><path d="M4 7h16M4 12h16M4 17h16" /></I>
);
