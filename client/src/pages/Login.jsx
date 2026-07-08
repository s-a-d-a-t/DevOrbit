// ============================================================================
// Login.jsx  —  THE SIGN-IN PAGE
// ----------------------------------------------------------------------------
// A textbook "controlled form": each input's value lives in React state, and
// typing updates that state. On submit we call the shared login() from AuthContext,
// which does the network request and stores the user. This page is a great, small
// example of the pattern that every form in the app follows.
// ============================================================================

import { useState } from 'react';
// Link makes a client-side link (no page reload). useNavigate lets us redirect
// programmatically after a successful login.
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();       // the login action defined in AuthContext
  const navigate = useNavigate();    // call navigate('/path') to change routes in code
  // One state variable per field ("controlled inputs"). React is the source of truth.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // message shown if login fails

  // Runs when the form is submitted.
  const submit = async (e) => {
    e.preventDefault();  // stop the browser from doing a full-page form POST
    setError('');        // clear any previous error
    try {
      await login(email, password); // network call; throws if credentials are wrong
      navigate('/');                // success -> go to the dashboard
    } catch (err) {
      // Show the server's error message if it sent one, else a generic fallback.
      // (`?.` is optional chaining: safely reads nested fields that might be missing.)
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="card">
          <h1>
            Dev<span>Pulse</span>
          </h1>
          <p className="sub">Your personal developer OS. Sign in to continue.</p>
          {/* onSubmit fires on button click OR pressing Enter in a field. */}
          <form onSubmit={submit}>
            <div>
              <label>Email</label>
              {/* Controlled input: `value` comes from state, `onChange` writes back to it.
                  type="email" + required give us free browser validation; autoFocus
                  puts the cursor here on load. */}
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {/* Render the error box only when there is an error to show. */}
            {error && <div className="auth-error">{error}</div>}
            <button type="submit">Sign in</button>
          </form>
          <p className="sub" style={{ marginTop: 16, marginBottom: 0 }}>
            No account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
