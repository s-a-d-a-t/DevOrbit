import { Router } from 'express';
import { User } from '../models/index.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  bio: u.bio,
  githubUsername: u.githubUsername,
  dailyGoalHours: u.dailyGoalHours,
  createdAt: u.createdAt,
});

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    if (await User.findOne({ where: { email: String(email).toLowerCase().trim() } })) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const user = await User.create({ name, email, password });
    res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.scope('withPassword').findOne({
      where: { email: String(email || '').toLowerCase().trim() },
    });
    if (!user || !(await user.comparePassword(password || ''))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({ token: signToken(user.id), user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(publicUser(user));
  } catch (e) {
    next(e);
  }
});

router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { name, bio, githubUsername, dailyGoalHours } = req.body;
    Object.assign(user, { name, bio, githubUsername, dailyGoalHours });
    await user.save();
    res.json(publicUser(user));
  } catch (e) {
    next(e);
  }
});

export default router;
