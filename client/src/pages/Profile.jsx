// ============================================================================
// Profile.jsx  —  EDIT YOUR ACCOUNT DETAILS
// ============================================================================
// A simple settings form. Notice it reads `user` from AuthContext AND uses
// `setUser` from the same context to update the global user after saving — so the
// new name/avatar appears everywhere (like the sidebar) immediately, without a reload.

import { useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, setUser } = useAuth();
  // Seed the form from the current user. `??` supplies a default (2) only when the
  // value is null/undefined, while `||` here handles empty strings.
  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio || '',
    githubUsername: user.githubUsername || '',
    dailyGoalHours: user.dailyGoalHours ?? 2,
  });
  const [saved, setSaved] = useState(false); // controls the transient "Saved ✓" label

  const save = async (e) => {
    e.preventDefault();
    // +form.dailyGoalHours converts the text input to a number before sending.
    const { data } = await api.put('/auth/me', { ...form, dailyGoalHours: +form.dailyGoalHours });
    setUser(data);              // update the app-wide user so the UI reflects changes instantly
    setSaved(true);
    setTimeout(() => setSaved(false), 2000); // revert the button label after 2s
  };

  // Build the initials for the avatar (same trick as the sidebar).
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <h1 className="page-title">Profile</h1>
      <p className="page-sub">Member since {new Date(user.createdAt).toLocaleDateString()}</p>

      <div className="profile-hero">
        <span className="profile-avatar">{initials}</span>
        <div>
          <div className="profile-name">{user.name}</div>
          <div className="profile-mail">{user.email}</div>
        </div>
        {form.githubUsername && (
          <a className="profile-gh" href={`https://github.com/${form.githubUsername}`} target="_blank" rel="noreferrer">
            @{form.githubUsername}
          </a>
        )}
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <form onSubmit={save} className="stack" style={{ gap: 12 }}>
          <div>
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            {/* Email is shown but `disabled` — it can't be edited here. */}
            <label>Email</label>
            <input value={user.email} disabled style={{ opacity: 0.6 }} />
          </div>
          <div>
            <label>Bio</label>
            <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div className="form-row">
            <div>
              <label>GitHub username</label>
              <input value={form.githubUsername} onChange={(e) => setForm({ ...form, githubUsername: e.target.value })} />
            </div>
            <div>
              <label>Daily learning goal (hours)</label>
              <input type="number" min="0.5" max="16" step="0.5" value={form.dailyGoalHours} onChange={(e) => setForm({ ...form, dailyGoalHours: e.target.value })} />
            </div>
          </div>
          <div className="row-between">
            <button type="submit">{saved ? 'Saved ✓' : 'Save changes'}</button>
            {form.githubUsername && (
              <a href={`https://github.com/${form.githubUsername}`} target="_blank" rel="noreferrer">
                github.com/{form.githubUsername} ↗
              </a>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
