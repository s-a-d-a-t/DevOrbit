// ============================================================================
// Layout.jsx  —  THE SHARED "SHELL" AROUND EVERY LOGGED-IN PAGE
// ----------------------------------------------------------------------------
// Remember in App.jsx how the private pages were nested inside <Route element={<Layout/>}>?
// THIS is that Layout. It draws the parts of the screen that stay the same no
// matter which page you're on:
//   - the sidebar (navigation links, logo, search, user chip)
//   - a mobile top bar with a hamburger menu
//   - and a <main> area where the current page is injected via <Outlet />.
//
// So the flow is: App picks the page -> Layout draws the frame -> <Outlet /> is
// the "hole" where React Router drops the matched page (Dashboard, Tasks, ...).
// ============================================================================

import { useEffect, useState } from 'react';
// NavLink: like a normal link but knows if it points to the *current* page (so we
//   can style the active item). Outlet: the placeholder for the child page.
//   Link: a plain navigation link. useLocation: tells us the current URL.
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';   // to show the user + log out
import { useTheme } from '../context/ThemeContext';  // to toggle light/dark
// All our SVG icons live in one file and are imported by name.
import {
  IconGrid, IconCheck, IconBook, IconSpark, IconFolder, IconChart, IconUser,
  IconLogo, IconNote, IconSearch, IconChevron, IconSun, IconMoon, IconImage,
  IconMenu, IconClose,
} from './icons';

// The navigation menu described as plain data (instead of hand-writing each link).
// Structure: [ sectionTitle, [ [url, IconComponent, label], ... ] ].
// Building the menu from this array below keeps the JSX short and makes adding a
// new page a one-line change here.
const groups = [
  ['Workspace', [
    ['/', IconGrid, 'Dashboard'],
    ['/tasks', IconCheck, 'Tasks'],
    ['/notes', IconNote, 'Notes'],
    ['/learning', IconBook, 'Learning'],
    ['/skills', IconSpark, 'Skills'],
    ['/projects', IconFolder, 'Projects'],
  ]],
  ['Insights', [
    ['/analytics', IconChart, 'Analytics'],
    ['/memories', IconImage, 'Memories'],
  ]],
  ['Account', [
    ['/profile', IconUser, 'Profile'],
  ]],
];

export default function Layout() {
  const { user, logout } = useAuth();          // current user + the logout action
  const { theme, toggleTheme } = useTheme();   // current theme + toggle
  const location = useLocation();              // current URL info (used below)

  // Is the (desktop) sidebar collapsed to a thin icon rail? We remember the last
  // choice in localStorage so it survives refreshes. The lazy initializer reads
  // that saved value once on first render.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('dp_sidebar') === '1');
  // Is the mobile navigation drawer currently slid open?
  const [mobileOpen, setMobileOpen] = useState(false);
  // How many tasks are due — shown as a little red badge on the Tasks link.
  const [dueCount, setDueCount] = useState(0);

  // Persist the collapsed choice whenever it changes.
  useEffect(() => {
    localStorage.setItem('dp_sidebar', collapsed ? '1' : '0');
  }, [collapsed]);

  // On first load, fetch how many reminders/tasks are due for the badge.
  // `.catch(() => {})` swallows errors silently — a missing badge isn't worth
  // showing the user an error over.
  useEffect(() => {
    api.get('/analytics/reminders').then((r) => setDueCount(r.data.length)).catch(() => {});
  }, []);

  // close the mobile drawer whenever the route changes
  // (dependency is location.pathname, so this runs each time the URL path changes)
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // lock body scroll while the drawer is open
  // The returned function is a "cleanup" — React runs it before the next effect
  // and on unmount, guaranteeing we always restore scrolling.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Build the avatar initials from the user's name, e.g. "Sadat Amir" -> "SA".
  // split on spaces -> take each word's first letter -> keep at most 2 -> join -> uppercase.
  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app">
      {/* mobile top bar — only visible on small screens (controlled by CSS) */}
      <header className="topbar">
        <button className="hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <IconMenu size={20} />
        </button>
        <div className="logo">
          <span className="mark"><IconLogo /></span>
          <span className="word">Dev<span>Pulse</span></span>
        </div>
        <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {/* Show the icon for the theme you'd switch TO. */}
          {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
        </button>
      </header>

      {/* backdrop for the mobile drawer — the dark overlay behind the drawer.
          Clicking it closes the menu. The `show` class fades it in. */}
      <div
        className={`sidebar-scrim ${mobileOpen ? 'show' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      {/* The sidebar. Its className switches based on state:
          `collapsed` = thin desktop rail, `open` = slid-in mobile drawer.
          Template literals let us conditionally add class names. */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        <div className="top">
          <div className="logo">
            <span className="mark"><IconLogo /></span>
            <span className="word">Dev<span>Pulse</span></span>
          </div>
          <div className="top-actions">
            <button className="theme-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
              {theme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />}
            </button>
            {/* Collapse/expand the desktop sidebar. */}
            <button className="collapse-btn desktop-only" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
              <IconChevron size={16} />
            </button>
            {/* Close button, shown only inside the mobile drawer. */}
            <button className="collapse-btn mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <IconClose size={17} />
            </button>
          </div>
        </div>

        <div className="workspace" title="Workspace">
          <span className="dot" />
          <span className="txt">Personal workspace</span>
        </div>

        {/* The "Search" shortcut. It doesn't search itself — it broadcasts a global
            custom browser event 'dp:search'. Whichever page cares (the search modal)
            listens for that event and opens. This is a lightweight way for unrelated
            components to talk without wiring props between them. */}
        <button className="searchcut" onClick={() => { setMobileOpen(false); window.dispatchEvent(new CustomEvent('dp:search')); }}>
          <IconSearch size={16} />
          <span className="txt">Search</span>
          <kbd>⌘K</kbd>
        </button>

        {/* Build the nav from the `groups` data array. `.map()` turns each group and
            each item into JSX. React needs a unique `key` on list items so it can
            track them efficiently across re-renders. */}
        <nav>
          {groups.map(([title, items]) => (
            <div className="nav-group" key={title}>
              <div className="side-section">{title}</div>
              {items.map(([to, Icon, label]) => (
                // `end={to === '/'}` makes the Dashboard link "active" ONLY on the exact
                // "/" path, not on every path that starts with "/". className receives
                // { isActive } from NavLink so we can highlight the current page.
                <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')} title={label}>
                  <Icon />
                  <span className="lbl">{label}</span>
                  {/* Show the due-count badge only on the Tasks link, and only if > 0. */}
                  {to === '/tasks' && dueCount > 0 && <span className="nav-badge">{dueCount}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* The user chip at the bottom: initials avatar, name, and a power button to log out. */}
        <div className="user-chip">
          <span className="avatar">{initials}</span>
          <span className="who">
            <span className="name">{user.name}</span>
            <span className="plan-tag">member</span>
          </span>
          <button onClick={logout} title="Sign out">⏻</button>
        </div>
      </aside>

      {/* The main content area. <Outlet /> is where React Router renders whichever
          page matched the current URL. Everything above is the persistent frame. */}
      <main className="main">
        <Outlet />
      </main>

      {/* Floating action button (bottom corner) — a quick shortcut to add a task. */}
      <Link to="/tasks" className="fab" title="Add task">+</Link>
    </div>
  );
}
