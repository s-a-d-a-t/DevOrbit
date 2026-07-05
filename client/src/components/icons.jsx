// Minimal 18px stroke icon set — inherits currentColor.
const I = ({ children, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {children}
  </svg>
);

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
