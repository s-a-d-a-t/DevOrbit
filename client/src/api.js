// ============================================================================
// api.js  —  THE SINGLE, PRE-CONFIGURED HTTP CLIENT FOR TALKING TO THE BACKEND
// ----------------------------------------------------------------------------
// Every time the frontend needs data from the server (log in, fetch tasks, save
// a note...) it makes an HTTP request. Instead of configuring each request by
// hand, we build ONE reusable client here and import it everywhere.
//
// Two big things this file sets up automatically for every request/response:
//   1. Attach the login token to outgoing requests (so the server knows who
//      you are).
//   2. Detect an expired/invalid session on incoming responses (401) and kick
//      the user back to the login page.
// ============================================================================

// axios is a popular library for making HTTP requests. It's friendlier than the
// browser's built-in fetch(): automatic JSON parsing, interceptors, base URLs.
import axios from 'axios';

// Create a customized axios instance. `baseURL: '/api'` means every request path
// we write later (like '/auth/login') is automatically prefixed to '/api/auth/login'.
// The leading '/api' is a relative URL, so it hits the same host the app is served
// from — Vite's dev server proxies '/api' to the backend (see vite.config.js).
const api = axios.create({ baseURL: '/api' });

// --- REQUEST INTERCEPTOR ----------------------------------------------------
// An interceptor is a function that runs on EVERY request BEFORE it's sent.
// Here we grab the auth token we saved at login time and, if it exists, attach
// it as a standard "Bearer" Authorization header. This is how the server
// identifies the logged-in user on protected endpoints.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('devpulse_token'); // stored in the browser
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config; // you MUST return config so the request can proceed
});

// --- RESPONSE INTERCEPTOR ---------------------------------------------------
// Runs on EVERY response. It takes two functions:
//   - the first handles successful responses (2xx): we just pass them through.
//   - the second handles errors (non-2xx): here we watch for 401 Unauthorized.
api.interceptors.response.use(
  (res) => res, // success: return the response unchanged
  (err) => {
    // 401 means "you're not authenticated" (token missing/expired/invalid).
    // BUT we skip this auto-logout for the /auth/ endpoints themselves — a wrong
    // password on the login page also returns 401, and we don't want that to
    // trigger a redirect loop; the login form should show the error instead.
    if (err.response?.status === 401 && !err.config.url.includes('/auth/')) {
      localStorage.removeItem('devpulse_token'); // throw away the dead token
      window.location.href = '/login';           // hard-redirect to the login page
    }
    // Re-throw the error so the code that made the call can still react to it
    // (e.g. show a message). Returning a rejected promise keeps the error flowing.
    return Promise.reject(err);
  }
);

// Export the configured client so other files do `import api from './api'`.
export default api;
