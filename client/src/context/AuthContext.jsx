// ============================================================================
// AuthContext.jsx  —  APP-WIDE "WHO IS LOGGED IN?" STATE
// ----------------------------------------------------------------------------
// PROBLEM this solves: lots of components need to know the current user (the top
// bar shows your name, App.jsx decides which routes to show, Profile edits you,
// etc.). Passing that data down through every component ("prop drilling") is
// painful. React's Context API lets us store it in ONE place and let any
// component read it directly.
//
// This file provides:
//   - AuthProvider: a component that holds the auth state and the login/logout
//     functions, and makes them available to everything wrapped inside it.
//   - useAuth(): a tiny custom hook so components can read that state with one line.
// ============================================================================

import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api'; // our pre-configured HTTP client

// Create the context object. Think of it as an empty "channel" that a Provider
// fills with a value and consumers read from. `null` is the default used only if
// a component reads it without any Provider above it.
const AuthContext = createContext(null);

// A convenience hook. Instead of writing `useContext(AuthContext)` everywhere,
// components just call `useAuth()`. This also gives us one place to add checks later.
export const useAuth = () => useContext(AuthContext);

// The Provider component. `children` is a special prop: it's whatever JSX you put
// *between* <AuthProvider> ... </AuthProvider> (in main.jsx that's the whole App).
export function AuthProvider({ children }) {
  // `user` holds the logged-in user object (or null if nobody is logged in).
  // useState returns [currentValue, functionToUpdateIt]. Calling setUser re-renders.
  const [user, setUser] = useState(null);
  // `loading` is true until we've checked whether a saved token is still valid.
  // App.jsx waits on this so it doesn't flash the wrong page on first load.
  const [loading, setLoading] = useState(true);

  // useEffect runs code AFTER the component renders. The empty dependency array
  // `[]` means "run this exactly once, when the app first mounts". We use it to
  // restore the session: if a token is saved from a previous visit, ask the
  // server who it belongs to.
  useEffect(() => {
    const token = localStorage.getItem('devpulse_token');
    // No token saved -> definitely logged out. Stop loading and bail early.
    if (!token) return setLoading(false);
    // We DO have a token — verify it by calling /auth/me. The request interceptor
    // in api.js attaches the token automatically.
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))                 // valid token -> we know the user
      .catch(() => localStorage.removeItem('devpulse_token')) // bad/expired -> discard it
      .finally(() => setLoading(false));                // either way, we're done checking
  }, []);

  // --- Actions exposed to the rest of the app ------------------------------

  // Log in: send credentials, save the returned token, store the user in state.
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('devpulse_token', data.token); // persist across refreshes
    setUser(data.user);                                 // update UI immediately
  };

  // Register a new account: same shape as login (the server logs you in on signup).
  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('devpulse_token', data.token);
    setUser(data.user);
  };

  // Log out: forget the token and clear the user. No server call needed because
  // the token is stateless (JWT) — dropping it on the client is enough.
  const logout = () => {
    localStorage.removeItem('devpulse_token');
    setUser(null);
  };

  // Whatever we put in `value` becomes readable by any component via useAuth().
  // We share the user, a setter (so pages like Profile can update it), the three
  // actions, and the loading flag.
  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
