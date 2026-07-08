// ============================================================================
// server/src/routes/auth.js  —  AUTH ENDPOINTS (register / login / me)
// ----------------------------------------------------------------------------
// These are the PUBLIC-facing account routes (mounted at /api/auth in index.js).
// register + login are open; /me routes use requireAuth so only a logged-in user
// can read/update their own profile.
//
// An Express "router" groups related routes. Each handler receives (req, res, next):
//   req = the incoming request (body, params, headers), res = the response we send,
//   next = pass control on (used here to forward errors to the central handler).
// ============================================================================

import { Router } from 'express';
import { User } from '../models/index.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

// Whitelist the user fields that are safe to send to the client. This guarantees we
// never leak the password hash, even though the default scope already excludes it.
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  bio: u.bio,
  githubUsername: u.githubUsername,
  dailyGoalHours: u.dailyGoalHours,
  createdAt: u.createdAt,
});

// POST /register — create a new account and return a token so they're logged in.
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body; // fields sent from the Register form
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    // 409 Conflict if the email is already taken.
    if (await User.findOne({ where: { email: String(email).toLowerCase().trim() } })) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    // create() triggers the beforeSave hook that hashes the password.
    const user = await User.create({ name, email, password });
    // 201 Created + a fresh token + the safe user object.
    res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
  } catch (e) {
    next(e); // forward any error to the central error handler in index.js
  }
});

// POST /login — verify credentials and return a token.
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // We NEED the password hash here to compare, so use the 'withPassword' scope
    // (the default scope hides it).
    const user = await User.scope('withPassword').findOne({
      where: { email: String(email || '').toLowerCase().trim() },
    });
    // Same generic 401 whether the email is unknown OR the password is wrong — this
    // avoids leaking which emails are registered.
    if (!user || !(await user.comparePassword(password || ''))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({ token: signToken(user.id), user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

// GET /me — return the logged-in user's profile. requireAuth set req.userId.
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId); // findByPk = find by primary key (id)
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(publicUser(user));
  } catch (e) {
    next(e);
  }
});

// PUT /me — update the logged-in user's editable profile fields (from Profile page).
router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Only copy the allowed fields — never let the client change id/email/password here.
    const { name, bio, githubUsername, dailyGoalHours } = req.body;
    Object.assign(user, { name, bio, githubUsername, dailyGoalHours });
    await user.save();
    res.json(publicUser(user));
  } catch (e) {
    next(e);
  }
});

export default router;
