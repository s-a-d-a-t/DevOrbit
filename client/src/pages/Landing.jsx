import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HEAT } from '../chartTheme';
import { useTheme } from '../context/ThemeContext';
import { IconLogo, IconGitHub, IconMail, IconSun, IconMoon } from '../components/icons';
import Grainient from '../components/Grainient';

/* reveal-on-scroll */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function MockHeatmap({ cols = 22, size = 9 }) {
  const cells = [];
  for (let i = 0; i < 7 * cols; i++) {
    const r = Math.sin(i * 12.9898) * 43758.5453;
    const t = r - Math.floor(r);
    cells.push(t < 0.28 ? 0 : t < 0.52 ? 1 : t < 0.74 ? 2 : t < 0.9 ? 3 : 4);
  }
  return (
    <div className="heatmap-grid" style={{ gridTemplateRows: `repeat(7, ${size}px)` }}>
      {cells.map((lvl, i) => (
        <div key={i} className="heatmap-cell" style={{ background: HEAT[lvl], width: size, height: size, animationDelay: `${(i % 40) * 14}ms` }} />
      ))}
    </div>
  );
}

const TIMELINE = [
  ['08:40', 'Plan', 'Open the dashboard. Today\'s plan is already assembled from overdue work, priorities and habits.'],
  ['09:00', 'Deep work', 'Start a 90-minute focus session. It logs itself when the timer ends.'],
  ['14:30', 'Learn', 'Log two hours of system design. The library keeps every source one keystroke away.'],
  ['18:00', 'Reflect', 'A note, a habit check, and the day lights up another cell on the calendar.'],
];

export default function Landing() {
  useReveal();
  const { theme, toggleTheme } = useTheme();
  // brand-matched gradient (design system tricolor: gold → ember → sage),
  // tuned per theme so the backdrop stays warm in light and deep in dark
  const grain = theme === 'dark'
    ? { color1: '#D77B50', color2: '#C9922E', color3: '#3A4A34' }
    : { color1: '#CE6C47', color2: '#B4792B', color3: '#5F7D57' };
  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden>
        <Grainient
          color1={grain.color1}
          color2={grain.color2}
          color3={grain.color3}
          timeSpeed={0.18}
          warpStrength={1.0}
          warpAmplitude={60.0}
          blendSoftness={0.12}
          grainAmount={0.06}
          contrast={1.35}
          saturation={1.25}
          zoom={0.9}
        />
      </div>

      <div className="landing-inner">
        <header className="landing-nav">
          <div className="logo">
            <span className="mark"><IconLogo /></span>
            Dev<span>Pulse</span>
          </div>
          <nav>
            <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
              {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
            </button>
            <Link to="/login" className="btn ghost-link">Sign in</Link>
            <Link to="/register" className="btn">Get started</Link>
          </nav>
        </header>

        <section className="hero">
          <div>
            <span className="eyebrow">A workspace for developers who ship</span>
            <h1>
              Discipline,<br />
              <span className="gold">measured</span> <span className="thin">daily.</span>
            </h1>
            <p>
              DevPulse is a personal developer OS — tasks, learning, skills, notes and focus
              sessions feeding one contribution calendar. Built like the tools you already
              respect: quiet, precise, permanent.
            </p>
            <div className="hero-cta">
              <Link to="/register" className="btn big">Start tracking free</Link>
              <Link to="/login" className="btn ghost-link big">I have an account</Link>
            </div>
          </div>

          <div className="hero-mock reveal in" aria-hidden>
            <div className="bar"><i /><i /><i /></div>
            <div className="mock-stats">
              <div className="mock-stat"><div className="k">Streak</div><div className="v gold">21d</div></div>
              <div className="mock-stat"><div className="k">Study · 7d</div><div className="v">12.5h</div></div>
              <div className="mock-stat"><div className="k">Score</div><div className="v">449</div></div>
            </div>
            <MockHeatmap />
          </div>
        </section>
      </div>

      <div className="landing-inner">
        <section className="feature-rows">
          <div className="feature-row reveal">
            <div className="fr-text">
              <span className="idx">01 — ACTIVITY</span>
              <h2>Your effort, rendered.</h2>
              <p>
                Every completed task, study hour, focus session and habit check-in scores the day
                and lights the calendar. Streaks aren't gamification here — they're a record.
              </p>
            </div>
            <div className="fr-visual"><MockHeatmap cols={30} size={10} /></div>
          </div>

          <div className="feature-row flip reveal">
            <div className="fr-visual">
              <div className="item-row"><span className="checkbox" style={{ border: '1.5px solid var(--metal)', borderRadius: 4 }} /> <div className="grow"><div className="title">Finish analytics endpoints</div><div className="meta">due today</div></div><span className="badge high">high</span></div>
              <div className="item-row"><span className="checkbox" style={{ border: '1.5px solid var(--metal)', borderRadius: 4 }} /> <div className="grow"><div className="title">Solve 3 LeetCode mediums</div><div className="meta">dsa</div></div><span className="badge medium">medium</span></div>
              <div className="item-row done"><span className="checkbox" style={{ background: 'var(--forest)', borderRadius: 4 }} /> <div className="grow"><div className="title">Review PR feedback</div></div><span className="badge status-done">done</span></div>
            </div>
            <div className="fr-text">
              <span className="idx">02 — EXECUTION</span>
              <h2>Plan once. The day assembles itself.</h2>
              <p>
                Overdue work, high priorities, unfinished habits and your study goal are compiled
                into a Today Plan every morning. Open the app, see the next right thing.
              </p>
            </div>
          </div>

          <div className="feature-row reveal">
            <div className="fr-text">
              <span className="idx">03 — KNOWLEDGE</span>
              <h2>Notes that respect your attention.</h2>
              <p>
                A full markdown editor with split preview, checklists, code blocks, version
                history and a focus mode that removes everything but the words.
              </p>
            </div>
            <div className="fr-visual">
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.8, color: 'var(--silver)' }}>
                <div style={{ color: 'var(--gold)' }}># Week 27 review</div>
                <div>- [x] Shipped analytics endpoints</div>
                <div>- [ ] Mock interview Thursday</div>
                <div style={{ color: 'var(--dim)' }}>```sql</div>
                <div>SELECT date, score FROM activity;</div>
                <div style={{ color: 'var(--dim)' }}>```</div>
              </div>
            </div>
          </div>
        </section>

        <section className="timeline-sec reveal">
          <span className="eyebrow">A day with DevPulse</span>
          <h2>The productive day, end to end.</h2>
          <div className="timeline">
            {TIMELINE.map(([time, title, desc]) => (
              <div key={time} className="tl-step">
                <div className="time">{time}</div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

      </div>

      <footer className="landing-footer">
        <div className="landing-inner">
          <div className="footer-brand">
            <div className="logo" style={{ fontSize: 15 }}>
              <span className="mark" style={{ width: 28, height: 28 }}><IconLogo size={17} /></span>
              Dev<span>Pulse</span>
            </div>
            <p>Built for developers who appreciate their own time.</p>
          </div>
          <div className="footer-credit">
            <span className="crafted">Crafted by <strong>Sadat Amir</strong></span>
            <div className="footer-links">
              <a href="https://github.com/s-a-d-a-t" target="_blank" rel="noreferrer" title="GitHub — s-a-d-a-t">
                <IconGitHub size={17} /> github.com/s-a-d-a-t
              </a>
              <a href="mailto:sdrkk66@gmail.com" title="Email Sadat">
                <IconMail size={17} /> sdrkk66@gmail.com
              </a>
            </div>
          </div>
          <Link to="/register" className="btn ghost-link">Create account →</Link>
        </div>
      </footer>
    </div>
  );
}
