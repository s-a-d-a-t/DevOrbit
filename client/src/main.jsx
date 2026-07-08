// ============================================================================
// main.jsx  —  THE ENTRY POINT OF THE ENTIRE FRONTEND
// ----------------------------------------------------------------------------
// This is the very first JavaScript file that runs in the browser. When the
// bundler (Vite) builds the app, `index.html` loads this file, and everything
// you see on screen ultimately starts here.
//
// Its ONE job: take our top-level <App /> component and "mount" it into the
// empty <div id="root"></div> that lives inside index.html. From that moment
// React takes over that div and renders the whole UI into it.
// ============================================================================

// React itself — needed for JSX and features like <React.StrictMode>.
import React from 'react';
// ReactDOM is the "bridge" between React and the real browser DOM. The
// `/client` entry gives us `createRoot`, the modern way to start a React app.
import ReactDOM from 'react-dom/client';
// BrowserRouter enables client-side routing (changing the URL without a full
// page reload). It uses the browser's History API under the hood.
import { BrowserRouter } from 'react-router-dom';
// Our root component — it decides which page to show based on the URL + login.
import App from './App';
// These two "Providers" wrap the app so that any component inside them can read
// shared state (the logged-in user, and the light/dark theme) without having to
// pass that data down manually through every level. This is the React Context
// pattern — think of it as app-wide global state that components can subscribe to.
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Font imports. `@fontsource-*` packages let us bundle fonts with the app
// instead of loading them from an external CDN. Importing the CSS here makes the
// font files available everywhere via normal `font-family` rules in our CSS.
import '@fontsource-variable/inter';      // Inter  — the main UI/body font
import '@fontsource-variable/sora';       // Sora   — headings / display font
import '@fontsource/jetbrains-mono/400.css'; // JetBrains Mono, weight 400 (code)
import '@fontsource/jetbrains-mono/600.css'; // ...weight 600 (semi-bold)
import '@fontsource/jetbrains-mono/700.css'; // ...weight 700 (bold)

// Our global stylesheet. Importing CSS into a JS file is a bundler feature —
// Vite sees this and injects the styles into the page for us.
import './styles.css';

// --- Bootstrapping the app --------------------------------------------------
// 1. Find the <div id="root"> element in index.html.
// 2. Create a React "root" attached to it.
// 3. Render our component tree into that root.
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode is a development-only helper. It doesn't render anything visible;
  // instead it activates extra checks and warnings (e.g. it double-invokes some
  // functions on purpose) to help you catch bugs early. It has no effect in a
  // production build.
  <React.StrictMode>
    {/* Order matters here: outer providers are available to everything inside.
        Router is outermost so routing works everywhere; Theme and Auth wrap the
        App so every page can read the theme and the current user. */}
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
