import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  IconGrid, IconCheck, IconBook, IconSpark, IconFolder, IconChart, IconUser, IconLogo,
} from './icons';

const links = [
  ['/', IconGrid, 'Dashboard'],
  ['/tasks', IconCheck, 'Tasks'],
  ['/learning', IconBook, 'Learning'],
  ['/skills', IconSpark, 'Skills'],
  ['/projects', IconFolder, 'Projects'],
  ['/analytics', IconChart, 'Analytics'],
  ['/profile', IconUser, 'Profile'],
];

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="mark"><IconLogo /></span>
          Dev<span>Pulse</span>
        </div>
        <div className="section">Workspace</div>
        <nav>
          {links.map(([to, Icon, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="user-chip">
          <span className="name">{user.name}</span>
          <button onClick={logout}>exit</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
