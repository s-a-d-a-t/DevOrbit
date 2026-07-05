import { useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio || '',
    githubUsername: user.githubUsername || '',
    dailyGoalHours: user.dailyGoalHours ?? 2,
  });
  const [saved, setSaved] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    const { data } = await api.put('/auth/me', { ...form, dailyGoalHours: +form.dailyGoalHours });
    setUser(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <h1 className="page-title">Profile</h1>
      <p className="page-sub">Member since {new Date(user.createdAt).toLocaleDateString()}</p>

      <div className="card" style={{ maxWidth: 520 }}>
        <form onSubmit={save} className="stack" style={{ gap: 12 }}>
          <div>
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
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
