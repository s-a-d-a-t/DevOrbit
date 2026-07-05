import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  ['/', '📊', 'Dashboard'],
  ['/tasks', '✅', 'Tasks'],
  ['/learning', '📖', 'Learning'],
  ['/skills', '🧠', 'Skills'],
  ['/projects', '📁', 'Projects'],
  ['/analytics', '📈', 'Analytics'],
  ['/profile', '👤', 'Profile'],
];

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          Dev<span>Pulse</span>
        </div>
        <nav>
          {links.map(([to, icon, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span aria-hidden>{icon}</span> {label}
            </NavLink>
          ))}
        </nav>
        <div className="user-chip">
          <div>{user.name}</div>
          <button onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
