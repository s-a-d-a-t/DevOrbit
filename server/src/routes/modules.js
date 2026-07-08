// ============================================================================
// server/src/routes/modules.js  —  ALL THE RESOURCE ENDPOINTS, WIRED UP
// ----------------------------------------------------------------------------
// This is where the crudRouter factory pays off. For each resource we call
// crudRouter(Model) to get list/create/update/delete for free, and optionally pass
// `hooks` to run extra logic after create/update.
//
// The recurring theme in these hooks is ACTIVITY LOGGING: whenever you complete a
// task, log study hours, finish a focus session, or check a habit, we call
// logActivity() to bump that day's score — which feeds the heatmap and stats.
// Everything here is mounted behind requireAuth (see index.js), so req.userId is set.
// ============================================================================

import { Router } from 'express';
import {
  Task, LearningLog, Skill, Project, Goal, Habit, Resource, FocusSession, Note, Memory,
} from '../models/index.js';
import { crudRouter } from './crudFactory.js';
import { logActivity, todayKey } from '../services/activityService.js';

const router = Router();

// --- Tasks: log activity when a task becomes (or stops being) "done". ---
router.use(
  '/tasks',
  crudRouter(Task, {
    hooks: {
      // If a task is created already marked done, count it immediately.
      afterCreate: async (doc) => {
        if (doc.status === 'done') {
          doc.completedAt = new Date();
          await doc.save();
          await logActivity(doc.UserId, { tasksCompleted: 1 });
        }
      },
      // On update, detect crossing the done boundary in either direction and adjust
      // the day's tasksCompleted count by +1 or -1 accordingly.
      afterUpdate: async (doc, prev) => {
        if (doc.status === 'done' && prev.status !== 'done') {
          doc.completedAt = new Date();
          await doc.save();
          await logActivity(doc.UserId, { tasksCompleted: 1 });
        } else if (doc.status !== 'done' && prev.status === 'done') {
          doc.completedAt = null;
          await doc.save();
          await logActivity(doc.UserId, { tasksCompleted: -1 });
        }
      },
    },
  })
);

// --- Learning: add/subtract logged hours to the activity for that session's date. ---
router.use(
  '/learning',
  crudRouter(LearningLog, {
    order: [['date', 'DESC']],
    hooks: {
      afterCreate: (doc) => logActivity(doc.UserId, { learningHours: doc.hours }, todayKey(doc.date)),
      // On edit, apply just the DELTA (new hours minus old) so totals stay correct.
      afterUpdate: (doc, prev) =>
        logActivity(doc.UserId, { learningHours: doc.hours - prev.hours }, todayKey(doc.date)),
    },
  })
);

// --- Skills: append a progress checkpoint to `history` whenever mastery changes.
// That history is what the sparkline and Analytics line chart plot. ---
router.use(
  '/skills',
  crudRouter(Skill, {
    hooks: {
      afterCreate: async (doc) => {
        doc.history = [...doc.history, { progress: doc.progress, date: new Date().toISOString() }];
        await doc.save();
      },
      afterUpdate: async (doc, prev) => {
        if (doc.progress !== prev.progress) {
          doc.history = [...doc.history, { progress: doc.progress, date: new Date().toISOString() }];
          await doc.save();
        }
      },
    },
  })
);

// --- Plain CRUD, no hooks needed (order overridden where date matters). ---
router.use('/projects', crudRouter(Project));
router.use('/goals', crudRouter(Goal));
router.use('/resources', crudRouter(Resource));
router.use('/memories', crudRouter(Memory, { order: [['date', 'DESC']] }));

// Habits get an extra toggle endpoint for daily check-ins.
// We start from the standard CRUD router, then ADD one custom route to it.
const habits = crudRouter(Habit);
// POST /habits/:id/toggle — flip today's check-in for a habit on or off.
habits.post('/:id/toggle', async (req, res, next) => {
  try {
    const habit = await Habit.findOne({ where: { id: req.params.id, UserId: req.userId } });
    if (!habit) return res.status(404).json({ message: 'Not found' });
    const day = req.body.date || todayKey(); // default to today's YYYY-MM-DD
    const checked = habit.checkins.includes(day); // is it already checked for that day?
    // Toggle: remove the day if present, otherwise add it.
    habit.checkins = checked ? habit.checkins.filter((d) => d !== day) : [...habit.checkins, day];
    await habit.save();
    await logActivity(req.userId, { habitsChecked: checked ? -1 : 1 }, day); // keep the score in sync
    res.json(habit);
  } catch (e) {
    next(e);
  }
});
router.use('/habits', habits);

// --- Notes: keep a rolling version history (powers the "restore" feature). ---
router.use(
  '/notes',
  crudRouter(Note, {
    // Pinned notes first, then most recently updated.
    order: [['pinned', 'DESC'], ['updatedAt', 'DESC']],
    hooks: {
      // snapshot the previous content on each save (cap at 10 versions)
      // We prepend the OLD content to the versions array and slice to keep only 10.
      afterUpdate: async (doc, prev) => {
        if (prev.content && prev.content !== doc.content) {
          doc.versions = [{ content: prev.content, savedAt: new Date().toISOString() }, ...(doc.versions || [])].slice(0, 10);
          await doc.save();
        }
      },
    },
  })
);

// --- Focus sessions: each logged session bumps focus count + coding minutes. ---
router.use(
  '/focus',
  crudRouter(FocusSession, {
    order: [['startedAt', 'DESC']],
    hooks: {
      afterCreate: (doc) =>
        logActivity(doc.UserId, { focusSessions: 1, codingMinutes: doc.minutes }, todayKey(doc.startedAt)),
    },
  })
);

export default router;
