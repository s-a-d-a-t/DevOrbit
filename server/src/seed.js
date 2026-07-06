import 'dotenv/config';
import {
  User, Task, LearningLog, Skill, Project, Habit, Goal, Resource, Note, Memory,
} from './models/index.js';
import { logActivity, todayKey } from './services/activityService.js';

const dayKey = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return todayKey(d);
};

export async function seedDemoData() {
  if (await User.findOne({ where: { email: 'demo@devpulse.dev' } })) return;
  console.log('[seed] creating demo account: demo@devpulse.dev / demo1234');

  const user = await User.create({
    name: 'Demo Dev',
    email: 'demo@devpulse.dev',
    password: 'demo1234',
    bio: 'CS student grinding toward full-stack mastery.',
    githubUsername: 'demodev',
    dailyGoalHours: 3,
  });
  const uid = user.id;

  await Task.bulkCreate([
    { UserId: uid, title: 'Finish DevPulse analytics page', priority: 'high', status: 'in-progress', tags: ['devpulse', 'react'], dueDate: new Date() },
    { UserId: uid, title: 'Solve 3 LeetCode mediums', priority: 'medium', status: 'pending', tags: ['dsa'] },
    { UserId: uid, title: 'Review PR feedback', priority: 'high', status: 'pending', tags: ['work'], dueDate: new Date(Date.now() - 86400000) },
    { UserId: uid, title: 'Set up DB indexes', priority: 'low', status: 'done', tags: ['devpulse', 'db'], completedAt: new Date() },
    { UserId: uid, title: 'Read Express error-handling docs', priority: 'low', status: 'done', tags: ['learning'], completedAt: new Date() },
  ]);

  const topics = ['React hooks', 'SQL joins & indexes', 'System design', 'TypeScript generics', 'Graph algorithms', 'Docker basics', 'JWT auth', 'CSS grid'];
  for (let i = 0; i < 45; i++) {
    if (Math.random() < 0.3) continue; // rest days keep the heatmap realistic
    const hours = Math.round((0.5 + Math.random() * 3.5) * 2) / 2;
    const d = new Date();
    d.setDate(d.getDate() - i);
    await LearningLog.create({
      UserId: uid,
      topic: topics[i % topics.length],
      hours,
      difficulty: 1 + Math.floor(Math.random() * 5),
      notes: i % 5 === 0 ? 'Went deep, took notes in Obsidian.' : '',
      date: d,
    });
    await logActivity(uid, {
      learningHours: hours,
      tasksCompleted: Math.random() < 0.5 ? 1 + Math.floor(Math.random() * 3) : 0,
      codingMinutes: Math.floor(Math.random() * 180),
      focusSessions: Math.floor(Math.random() * 4),
    }, dayKey(i));
  }

  const project = await Project.create({
    UserId: uid,
    name: 'DevPulse',
    description: 'Personal developer OS — productivity + growth tracking.',
    status: 'ongoing',
    techStack: ['React', 'Node.js', 'Express', 'PostgreSQL'],
    repoUrl: 'https://github.com/demodev/devpulse',
    startedAt: new Date(Date.now() - 30 * 86400000),
  });
  await Project.create({
    UserId: uid,
    name: 'Algo Visualizer',
    description: 'Sorting and pathfinding visualizer.',
    status: 'completed',
    techStack: ['React', 'D3'],
    completedAt: new Date(Date.now() - 60 * 86400000),
  });

  const mkHistory = (target) =>
    [90, 60, 30, 0].map((off, i) => ({
      progress: Math.max(5, Math.round(target * (0.4 + i * 0.2))),
      date: new Date(Date.now() - off * 86400000).toISOString(),
    }));
  await Skill.bulkCreate([
    { UserId: uid, name: 'React', level: 'intermediate', progress: 65, category: 'frontend', projects: [project.id], history: mkHistory(65) },
    { UserId: uid, name: 'Node.js', level: 'intermediate', progress: 55, category: 'backend', projects: [project.id], history: mkHistory(55) },
    { UserId: uid, name: 'PostgreSQL', level: 'beginner', progress: 40, category: 'database', history: mkHistory(40) },
    { UserId: uid, name: 'Data Structures', level: 'intermediate', progress: 70, category: 'cs-fundamentals', history: mkHistory(70) },
  ]);

  await Habit.bulkCreate([
    { UserId: uid, name: 'Code daily', icon: '💻', checkins: [dayKey(1), dayKey(2), dayKey(3), dayKey(5)] },
    { UserId: uid, name: 'Gym', icon: '🏋️', checkins: [dayKey(1), dayKey(3)] },
    { UserId: uid, name: 'Read 20 min', icon: '📚', checkins: [dayKey(2)] },
  ]);

  await Goal.bulkCreate([
    {
      UserId: uid,
      title: 'Land a backend internship',
      type: 'career',
      targetDate: new Date(Date.now() + 120 * 86400000),
      milestones: [
        { title: 'Finish DevPulse portfolio project', done: false },
        { title: 'Solve 150 LeetCode problems', done: false },
        { title: 'Polish resume + GitHub profile', done: true },
      ],
    },
    { UserId: uid, title: 'Ship analytics dashboard', type: 'daily', milestones: [] },
  ]);

  await Resource.bulkCreate([
    {
      UserId: uid, title: 'PostgreSQL performance', type: 'article', category: 'Databases', tags: ['postgres'],
      links: [
        { label: 'Official indexing docs', url: 'https://www.postgresql.org/docs/current/indexes.html' },
        { label: 'Use The Index, Luke', url: 'https://use-the-index-luke.com' },
        { label: 'EXPLAIN visualizer', url: 'https://explain.dalibo.com' },
      ],
    },
    {
      UserId: uid, title: 'React hooks & effects', type: 'article', category: 'Frontend', tags: ['react'], consumed: true,
      links: [
        { label: 'useEffect guide', url: 'https://react.dev/learn/synchronizing-with-effects' },
        { label: 'You Might Not Need an Effect', url: 'https://react.dev/learn/you-might-not-need-an-effect' },
      ],
    },
    {
      UserId: uid, title: 'System design prep', type: 'repo', category: 'System Design', tags: ['interviews'],
      links: [
        { label: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer' },
        { label: 'ByteByteGo channel', url: 'https://youtube.com/@ByteByteGo' },
      ],
    },
    {
      UserId: uid, title: 'Quick dev videos', type: 'video', category: 'Frontend', tags: ['misc'],
      links: [{ label: 'Fireship', url: 'https://youtube.com/@fireship' }],
    },
  ]);

  await Note.create({
    UserId: uid,
    title: 'Weekly review',
    pinned: true,
    content: `# Week 27 review

## What moved
- Shipped the **analytics** endpoints
- 12.5h of study — mostly SQL and system design

## Next
- [ ] Finish DevPulse dashboard polish
- [ ] Mock interview on Thursday

\`\`\`sql
-- snippet worth keeping
SELECT date, score FROM "Activities" ORDER BY date DESC LIMIT 7;
\`\`\`
`,
  });

  const memImg = (id, w = 600) =>
    `https://images.unsplash.com/photo-${id}?q=80&w=${w}&auto=format&fit=crop`;
  await Memory.bulkCreate([
    {
      UserId: uid, title: 'First commit to DevPulse',
      description: 'The empty repo that started it all — one README and a lot of ambition.',
      imageUrl: memImg('1517180102446-f3ece451e9d8'), date: new Date(Date.now() - 30 * 86400000),
    },
    {
      UserId: uid, title: 'Passed the system design mock',
      description: 'Whiteboarded a URL shortener end to end. First time it actually clicked.',
      imageUrl: memImg('1461749280684-dccba630e2f6'), date: new Date(Date.now() - 21 * 86400000),
    },
    {
      UserId: uid, title: 'Shipped the analytics dashboard',
      description: 'Charts, heatmap, the whole thing live. Watched the first real data roll in.',
      imageUrl: memImg('1551288049-bebda4e38f71'), date: new Date(Date.now() - 12 * 86400000),
    },
    {
      UserId: uid, title: 'Hit a 30-day study streak',
      description: 'A full month of showing up. The calendar finally looks the way I wanted.',
      imageUrl: memImg('1506905925346-21bda4d32df4'), date: new Date(Date.now() - 5 * 86400000),
    },
    {
      UserId: uid, title: 'Late-night deploy that worked',
      description: 'Green checks at 1am. Rare and beautiful.',
      imageUrl: memImg('1498050108023-c5249f4df085'), date: new Date(Date.now() - 2 * 86400000),
    },
  ]);

  console.log('[seed] done');
}

// Run directly (`npm run seed`): seeds the configured PostgreSQL database.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const { connectDB } = await import('./db.js');
  const { initModels } = await import('./models/index.js');
  const sequelize = await connectDB();
  initModels(sequelize);
  await sequelize.sync();
  await seedDemoData();
  await sequelize.close();
}
