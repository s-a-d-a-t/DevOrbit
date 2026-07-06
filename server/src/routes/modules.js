import { Router } from 'express';
import {
  Task, LearningLog, Skill, Project, Goal, Habit, Resource, FocusSession, Note, Memory,
} from '../models/index.js';
import { crudRouter } from './crudFactory.js';
import { logActivity, todayKey } from '../services/activityService.js';

const router = Router();

router.use(
  '/tasks',
  crudRouter(Task, {
    hooks: {
      afterCreate: async (doc) => {
        if (doc.status === 'done') {
          doc.completedAt = new Date();
          await doc.save();
          await logActivity(doc.UserId, { tasksCompleted: 1 });
        }
      },
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

router.use(
  '/learning',
  crudRouter(LearningLog, {
    order: [['date', 'DESC']],
    hooks: {
      afterCreate: (doc) => logActivity(doc.UserId, { learningHours: doc.hours }, todayKey(doc.date)),
      afterUpdate: (doc, prev) =>
        logActivity(doc.UserId, { learningHours: doc.hours - prev.hours }, todayKey(doc.date)),
    },
  })
);

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

router.use('/projects', crudRouter(Project));
router.use('/goals', crudRouter(Goal));
router.use('/resources', crudRouter(Resource));
router.use('/memories', crudRouter(Memory, { order: [['date', 'DESC']] }));

// Habits get an extra toggle endpoint for daily check-ins.
const habits = crudRouter(Habit);
habits.post('/:id/toggle', async (req, res, next) => {
  try {
    const habit = await Habit.findOne({ where: { id: req.params.id, UserId: req.userId } });
    if (!habit) return res.status(404).json({ message: 'Not found' });
    const day = req.body.date || todayKey();
    const checked = habit.checkins.includes(day);
    habit.checkins = checked ? habit.checkins.filter((d) => d !== day) : [...habit.checkins, day];
    await habit.save();
    await logActivity(req.userId, { habitsChecked: checked ? -1 : 1 }, day);
    res.json(habit);
  } catch (e) {
    next(e);
  }
});
router.use('/habits', habits);

router.use(
  '/notes',
  crudRouter(Note, {
    order: [['pinned', 'DESC'], ['updatedAt', 'DESC']],
    hooks: {
      // snapshot the previous content on each save (cap at 10 versions)
      afterUpdate: async (doc, prev) => {
        if (prev.content && prev.content !== doc.content) {
          doc.versions = [{ content: prev.content, savedAt: new Date().toISOString() }, ...(doc.versions || [])].slice(0, 10);
          await doc.save();
        }
      },
    },
  })
);

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
