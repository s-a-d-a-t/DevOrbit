import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  IconGrid, IconCheck, IconBook, IconSpark, IconFolder, IconChart, IconUser,
  IconLogo, IconNote, IconSearch, IconChevron, IconSun, IconMoon, IconImage,
} from './icons';

const links = [
  ['/', IconGrid, 'Dashboard'],
  ['/tasks', IconCheck, 'Tasks'],
  ['/notes', IconNote, 'Notes'],
  ['/learning', IconBook, 'Learning'],
  ['/skills', IconSpark, 'Skills'],
  ['/projects', IconFolder, 'Projects'],
  ['/analytics', IconChart, 'Analytics'],
  ['/memories', IconImage, 'Memories'],
  ['/profile', IconUser, 'Profile'],
];

const mobileLinks = links.filter(([to]) => ['/', '/tasks', '/notes', '/analytics', '/profile'].includes(to));

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('dp_sidebar') === '1');
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    localStorage.setItem('dp_sidebar', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    api.get('/analytics/reminders').then((r) => setDueCount(r.data.length)).catch(() => {});
  }, []);

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="top">
          <div className="logo">
            <span className="mark"><IconLogo /></span>
            <span className="word">Dev<span>Pulse</span></span>
          </div>
          <div className="top-actions">
            <button className="theme-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
              {theme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />}
            </button>
            <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
              <IconChevron size={16} />
            </button>
          </div>
        </div>

        <div className="workspace" title="Workspace">
          <span className="dot" />
          <span className="txt">Personal workspace</span>
        </div>

        <button className="searchcut" onClick={() => window.dispatchEvent(new CustomEvent('dp:search'))}>
          <IconSearch size={16} />
          <span className="txt">Search</span>
          <kbd>⌘K</kbd>
        </button>

        <div className="side-section">Workspace</div>
        <nav>
          {links.map(([to, Icon, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')} title={label}>
              <Icon />
              <span className="lbl">{label}</span>
              {to === '/tasks' && dueCount > 0 && <span className="nav-badge">{dueCount}</span>}
            </NavLink>
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

      <nav className="bottom-nav">
        {mobileLinks.map(([to, Icon, label]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>
      <Link to="/tasks" className="fab" title="Add task">+</Link>
    </div>
  );
}
