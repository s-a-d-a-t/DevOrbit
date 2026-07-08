// ============================================================================
// App.jsx  —  THE ROUTER / "TRAFFIC CONTROLLER" OF THE APP
// ----------------------------------------------------------------------------
// After main.jsx mounts us, THIS component decides *which page* the user sees.
// It answers two questions on every render:
//   1. Is the app still checking whether someone is logged in?  -> show "Loading"
//   2. Is a user logged in or not?  -> show either the public pages
//      (landing/login/register) or the private, logged-in app (dashboard, etc.)
//
// This is a very common pattern called "protected routes": guests can only reach
// a few pages, and everything else is locked behind authentication.
// ============================================================================

// Routing primitives from react-router-dom:
//  - Routes: a container that picks ONE matching <Route> to render.
//  - Route:  maps a URL path to a component (its `element`).
//  - Navigate: renders nothing visible; it redirects to another URL.
import { Routes, Route, Navigate } from 'react-router-dom';
// Custom hook that reads the auth state (user + loading) from AuthContext.
import { useAuth } from './context/AuthContext';
// Layout is the shared "shell" (sidebar + top bar) wrapped around logged-in pages.
import Layout from './components/Layout';

// --- Page components --------------------------------------------------------
// Each of these is a full screen. Public pages first, then the private app pages.
import Landing from './pages/Landing';     // public marketing/home page
import Login from './pages/Login';         // public sign-in form
import Register from './pages/Register';   // public sign-up form
import Dashboard from './pages/Dashboard'; // private: overview after login
import Tasks from './pages/Tasks';         // private: to-do / task tracking
import Notes from './pages/Notes';         // private: notes
import Learning from './pages/Learning';   // private: learning log
import Skills from './pages/Skills';       // private: skills tracker
import Projects from './pages/Projects';   // private: projects
import Analytics from './pages/Analytics'; // private: charts & stats
import Memories from './pages/Memories';   // private: memories/gallery
import Profile from './pages/Profile';     // private: account settings

// `export default` means this is the main thing App.jsx provides. main.jsx
// imported it as `App`. It's a function component: a function that returns JSX
// (HTML-like markup) describing what to show.
export default function App() {
  // Pull the current user and a `loading` flag out of our auth context.
  // While `loading` is true, we don't yet know if someone is logged in, so we
  // must NOT decide which routes to show — otherwise a logged-in user might
  // briefly get bounced to the landing page on every refresh.
  const { user, loading } = useAuth();

  // Guard clause: show a simple placeholder until auth has been resolved.
  if (loading) return <div className="auth-wrap">Loading…</div>;

  // --- NOT logged in: only the public routes exist -------------------------
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* path="*" is the catch-all: any unknown URL for a guest is redirected
            back to the landing page. `replace` swaps the history entry instead of
            adding one, so the browser Back button doesn't get stuck bouncing. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // --- Logged in: the real application -------------------------------------
  return (
    <Routes>
      {/* This parent <Route> has NO `path` but DOES have an `element` of <Layout />.
          That makes it a "layout route": Layout renders the shared sidebar/top bar
          once, and the matched child page is slotted into Layout's <Outlet />.
          So every page below shares the same frame without repeating it. */}
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/memories" element={<Memories />} />
        <Route path="/profile" element={<Profile />} />
        {/* Unknown URL while logged in -> send them to the dashboard. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
