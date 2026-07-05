import { Activity } from '../models/index.js';

export const todayKey = (d = new Date()) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
};

// Weighted score: caps keep one metric from dominating the heatmap.
function computeScore(a) {
  const tasks = Math.min(a.tasksCompleted, 8) * 10;
  const learning = Math.min(a.learningHours, 6) * 15;
  const coding = Math.min(a.codingMinutes / 30, 10) * 8;
  const focus = Math.min(a.focusSessions, 8) * 5;
  const habits = Math.min(a.habitsChecked, 6) * 5;
  return Math.round(tasks + learning + coding + focus + habits);
}

/**
 * Increment today's activity counters for a user.
 * fields: { tasksCompleted?, learningHours?, codingMinutes?, focusSessions?, habitsChecked? }
 */
export async function logActivity(userId, fields, date = todayKey()) {
  const [activity] = await Activity.findOrCreate({ where: { UserId: userId, date } });
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'number' && v !== 0) {
      activity[k] = Math.max(0, Math.round((activity[k] + v) * 100) / 100);
    }
  }
  activity.score = computeScore(activity);
  await activity.save();
  return activity;
}
