import { Link } from 'react-router-dom';
import { HEAT } from '../chartTheme';
import {
  IconLogo, IconCheck, IconBook, IconSpark, IconFlame, IconClock, IconChart,
} from '../components/icons';

const FEATURES = [
  [IconCheck, 'Task management', 'Priorities, tags and statuses — from backlog to done, with smart reminders for anything slipping.'],
  [IconBook, 'Learning tracker', 'Log topics, hours and difficulty. Keep a categorized library of videos, articles, repos and courses.'],
  [IconSpark, 'Skills & projects', 'Track skill levels and progress %, link them to real projects, and watch growth over time.'],
  [IconFlame, 'Activity heatmap', 'Every task, study hour, focus session and habit feeds a GitHub-style contribution calendar.'],
  [IconClock, 'Focus & habits', 'Built-in Pomodoro timer, daily goals, habit check-ins and a generated "Today Plan".'],
  [IconChart, 'Analytics', 'Productivity score, streaks, weekly study hours and skill progression — your growth, visualized.'],
];

// A small static preview of the contribution heatmap for the hero.
function HeatmapPreview() {
  const cells = [];
  for (let i = 0; i < 7 * 26; i++) {
    const r = Math.sin(i * 12.9898) * 43758.5453;
    const t = r - Math.floor(r);
    cells.push(t < 0.3 ? 0 : t < 0.55 ? 1 : t < 0.75 ? 2 : t < 0.9 ? 3 : 4);
  }
  return (
    <div className="landing-heatmap" aria-hidden>
      <div className="heatmap-grid">
        {cells.map((lvl, i) => (
          <div key={i} className="heatmap-cell" style={{ background: HEAT[lvl] }} />
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="logo">
          <span className="mark"><IconLogo /></span>
          Dev<span>Pulse</span>
        </div>
        <nav>
          <Link to="/login" className="btn ghost-link">Sign in</Link>
          <Link to="/register" className="btn primary-link">Get started</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <span className="eyebrow">// track · learn · ship</span>
        <h1>
          Your personal<br /><span>developer OS</span>
        </h1>
        <p>
          DevPulse combines task management, learning tracking, skills and developer activity
          analytics into one system — so you can see your growth the way GitHub shows your commits.
        </p>
        <div className="landing-cta">
          <Link to="/register" className="btn primary-link big">Start tracking free</Link>
          <Link to="/login" className="btn ghost-link big">I have an account</Link>
        </div>
        <HeatmapPreview />
        <p className="landing-hint">every productive day lights up your streak</p>
      </section>

      <section className="landing-features">
        {FEATURES.map(([Icon, title, desc]) => (
          <div key={title} className="card">
            <div className="feature-icon"><Icon /></div>
            <h3>{title}</h3>
            <p>{desc}</p>
          </div>
        ))}
      </section>

      <footer className="landing-footer">
        Built for CS students and engineers who want to see real improvement over time.
        <div>
          <Link to="/register">Create your account →</Link>
        </div>
      </footer>
    </div>
  );
}
