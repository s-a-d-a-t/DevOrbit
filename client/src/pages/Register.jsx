import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form.name, form.email, form.password);
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
