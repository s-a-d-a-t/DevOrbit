// ============================================================================
// Register.jsx  —  THE SIGN-UP PAGE
// ----------------------------------------------------------------------------
// Almost identical to Login.jsx, but with three fields. Notice a slightly more
// scalable form pattern here: instead of one useState per field, we keep ONE
// object in state and use a `set(key)` helper to update any field. Handy once a
// form has several inputs.
// ============================================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  // All fields in one object.
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  // A "curried" helper: set('email') returns an onChange handler for the email field.
  // It copies the current form (...form) and overwrites just the one key. `[k]` is a
  // computed property name — it uses the value of `k` as the key.
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form.name, form.email, form.password); // create account + auto-login
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="card">
          <h1>
            Join Dev<span>Pulse</span>
          </h1>
          <p className="sub">Track tasks, learning, skills and streaks in one place.</p>
          <form onSubmit={submit}>
            {/* Each input reads from form.<field> and writes back via set('<field>'). */}
            <div>
              <label>Name</label>
              <input value={form.name} onChange={set('name')} required autoFocus />
            </div>
            <div>
              <label>Email</label>
              <input type="email" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label>Password (min 6 chars)</label>
              {/* minLength gives client-side validation; the server checks again too. */}
              <input type="password" value={form.password} onChange={set('password')} minLength={6} required />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit">Create account</button>
          </form>
          <p className="sub" style={{ marginTop: 16, marginBottom: 0 }}>
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
