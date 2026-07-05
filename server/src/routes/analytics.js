import { Router } from 'express';
import { Op } from 'sequelize';
import { User, Activity, Task, LearningLog, Skill, Habit, Goal } from '../models/index.js';
import { todayKey } from '../services/activityService.js';

const router = Router();

const daysAgoKey = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return todayKey(d);
};

const round1 = (n) => Math.round(n * 10) / 10;

// ISO week key like 2026-W27, matching the previous Mongo %G-W%V format.
const isoWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

// GET /api/activities/heatmap?days=365 — cells for the contribution calendar
router.get('/activities/heatmap', async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 365, 730);
    const since = daysAgoKey(days);
    const rows = await Activity.findAll({
      where: { UserId: req.userId, date: { [Op.gte]: since } },
      attributes: ['date', 'score', 'tasksCompleted', 'learningHours', 'codingMinutes', 'focusSessions'],
      order: [['date', 'ASC']],
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// GET /api/activities/streak — current and longest streak of days with score > 0
router.get('/activities/streak', async (req, res, next) => {
  try {
    const rows = await Activity.findAll({
      where: { UserId: req.userId, score: { [Op.gt]: 0 } },
      attributes: ['date'],
      order: [['date', 'ASC']],
    });
    const active = new Set(rows.map((r) => r.date));

    let current = 0;
    for (let i = 0; ; i++) {
      const key = daysAgoKey(i);
      if (active.has(key)) current++;
      else if (i === 0) continue; // today can still be pending
      else break;
    }

    let longest = 0;
    let run = 0;
    let prev = null;
    for (const r of rows) {
      const d = new Date(r.date);
      run = prev && d - prev === 86400000 ? run + 1 : 1;
      longest = Math.max(longest, run);
      prev = d;
    }
    res.json({ current, longest, activeDays: rows.length });
  } catch (e) {
    next(e);
  }
});

// GET /api/analytics/summary?range=week|month — aggregate stats for the range
router.get('/analytics/summary', async (req, res, next) => {
  try {
    const days = req.query.range === 'month' ? 30 : 7;
    const since = daysAgoKey(days - 1);
    const rows = await Activity.findAll({ where: { UserId: req.userId, date: { [Op.gte]: since } } });
    const sum = (key) => rows.reduce((acc, r) => acc + r[key], 0);
    const pendingTasks = await Task.count({ where: { UserId: req.userId, status: { [Op.ne]: 'done' } } });
    res.json({
      range: days,
      tasksCompleted: sum('tasksCompleted'),
      learningHours: round1(sum('learningHours')),
      codingMinutes: sum('codingMinutes'),
      focusSessions: sum('focusSessions'),
      score: sum('score'),
      activeDays: rows.filter((r) => r.score > 0).length,
      pendingTasks,
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/analytics/study-hours?weeks=8 — learning hours bucketed per ISO week
router.get('/analytics/study-hours', async (req, res, next) => {
  try {
    const weeks = Math.min(parseInt(req.query.weeks) || 8, 26);
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    const logs = await LearningLog.findAll({
      where: { UserId: req.userId, date: { [Op.gte]: since } },
      attributes: ['date', 'hours'],
    });
    const buckets = new Map();
    for (const log of logs) {
      const key = isoWeek(new Date(log.date));
      buckets.set(key, (buckets.get(key) || 0) + log.hours);
    }
    const out = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, hours]) => ({ week, hours: round1(hours) }));
    res.json(out);
  } catch (e) {
    next(e);
  }
});

// GET /api/analytics/tasks-breakdown — counts by status and by priority
router.get('/analytics/tasks-breakdown', async (req, res, next) => {
  try {
    const tasks = await Task.findAll({ where: { UserId: req.userId }, attributes: ['status', 'priority'] });
    const count = (key) =>
      tasks.reduce((acc, t) => ((acc[t[key]] = (acc[t[key]] || 0) + 1), acc), {});
    res.json({ byStatus: count('status'), byPriority: count('priority') });
  } catch (e) {
    next(e);
  }
});

// GET /api/analytics/skill-progress — each skill's history for the progress-over-time chart
router.get('/analytics/skill-progress', async (req, res, next) => {
  try {
    const skills = await Skill.findAll({
      where: { UserId: req.userId },
      attributes: ['id', 'name', 'progress', 'history'],
    });
    res.json(skills);
  } catch (e) {
    next(e);
  }
});

// GET /api/analytics/today-plan — generated focus list for today
router.get('/analytics/today-plan', async (req, res, next) => {
  try {
    const today = todayKey();
    const plan = [];

    const overdue = await Task.findAll({
      where: { UserId: req.userId, status: { [Op.ne]: 'done' }, dueDate: { [Op.lt]: new Date() } },
      limit: 3,
    });
    overdue.forEach((t) => plan.push({ kind: 'task', label: `Overdue: ${t.title}`, priority: 'high', ref: t.id }));

    const highPriority = await Task.findAll({
      where: {
        UserId: req.userId,
        status: { [Op.ne]: 'done' },
        priority: 'high',
        id: { [Op.notIn]: overdue.map((t) => t.id) },
      },
      limit: 3,
    });
    highPriority.forEach((t) => plan.push({ kind: 'task', label: t.title, priority: 'high', ref: t.id }));

    const inProgress = await Task.findAll({ where: { UserId: req.userId, status: 'in-progress' }, limit: 3 });
    inProgress.forEach((t) => {
      if (!plan.some((p) => p.ref === t.id))
        plan.push({ kind: 'task', label: `Continue: ${t.title}`, priority: t.priority, ref: t.id });
    });

    const habits = await Habit.findAll({ where: { UserId: req.userId } });
    habits
      .filter((h) => !h.checkins.includes(today))
      .slice(0, 4)
      .forEach((h) => plan.push({ kind: 'habit', label: `${h.icon} ${h.name}`, priority: 'medium', ref: h.id }));

    const activity = await Activity.findOne({ where: { UserId: req.userId, date: today } });
    const user = await User.findByPk(req.userId);
    const remaining = Math.max(0, (user?.dailyGoalHours ?? 2) - (activity?.learningHours || 0));
    if (remaining > 0) {
      plan.push({ kind: 'learning', label: `Study ${round1(remaining)}h to hit your daily goal`, priority: 'medium' });
    }

    const dailyGoals = await Goal.findAll({
      where: { UserId: req.userId, type: 'daily', completed: false },
      limit: 3,
    });
    dailyGoals.forEach((g) => plan.push({ kind: 'goal', label: g.title, priority: 'medium', ref: g.id }));

    res.json(plan.slice(0, 10));
  } catch (e) {
    next(e);
  }
});

// Reminders: unfinished tasks due today or overdue
router.get('/analytics/reminders', async (req, res, next) => {
  try {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const tasks = await Task.findAll({
      where: { UserId: req.userId, status: { [Op.ne]: 'done' }, dueDate: { [Op.lte]: endOfDay } },
      order: [['dueDate', 'ASC']],
    });
    res.json(tasks);
  } catch (e) {
    next(e);
  }
});

export default router;
