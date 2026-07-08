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
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import '@fontsource-variable/inter';
import '@fontsource-variable/sora';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
