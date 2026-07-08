import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  IconGrid, IconCheck, IconBook, IconSpark, IconFolder, IconChart, IconUser,
  IconLogo, IconNote, IconSearch, IconChevron, IconSun, IconMoon, IconImage,
  IconMenu, IconClose,
} from './icons';

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
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('dp_sidebar') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    localStorage.setItem('dp_sidebar', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    api.get('/analytics/reminders').then((r) => setDueCount(r.data.length)).catch(() => {});
  }, []);

  // close the mobile drawer whenever the route changes
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app">
      {/* mobile top bar */}
      <header className="topbar">
        <button className="hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <IconMenu size={20} />
        </button>
        <div className="logo">
          <span className="mark"><IconLogo /></span>
          <span className="word">Dev<span>Pulse</span></span>
        </div>
        <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
        </button>
      </header>

      {/* backdrop for the mobile drawer */}
      <div
        className={`sidebar-scrim ${mobileOpen ? 'show' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

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
            <button className="collapse-btn desktop-only" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
              <IconChevron size={16} />
            </button>
            <button className="collapse-btn mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <IconClose size={17} />
            </button>
          </div>
        </div>

        <div className="workspace" title="Workspace">
          <span className="dot" />
          <span className="txt">Personal workspace</span>
        </div>

        <button className="searchcut" onClick={() => { setMobileOpen(false); window.dispatchEvent(new CustomEvent('dp:search')); }}>
          <IconSearch size={16} />
          <span className="txt">Search</span>
          <kbd>⌘K</kbd>
        </button>

        <nav>
          {groups.map(([title, items]) => (
            <div className="nav-group" key={title}>
              <div className="side-section">{title}</div>
              {items.map(([to, Icon, label]) => (
                <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')} title={label}>
                  <Icon />
                  <span className="lbl">{label}</span>
                  {to === '/tasks' && dueCount > 0 && <span className="nav-badge">{dueCount}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="user-chip">
          <span className="avatar">{initials}</span>
          <span className="who">
            <span className="name">{user.name}</span>
            <span className="plan-tag">member</span>
          </span>
          <button onClick={logout} title="Sign out">⏻</button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      <Link to="/tasks" className="fab" title="Add task">+</Link>
    </div>
  );
}
