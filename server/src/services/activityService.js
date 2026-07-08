// ============================================================================
// server/src/services/activityService.js  —  THE DAILY SCORE / STREAK ENGINE
// ----------------------------------------------------------------------------
// This is the "brain" behind the contribution heatmap. Whenever you do something
// meaningful (complete a task, log study hours, finish a focus session, check a
// habit) a route hook calls logActivity(), which bumps that day's counters and
// recomputes a single daily "score". The frontend Heatmap shades each day by that score.
//
// Putting this shared logic in a "service" (instead of inside each route) keeps it
// in one place and reusable — a common way to organize backend business logic.
// ============================================================================

import { Activity } from '../models/index.js';

// Convert a Date into a local "YYYY-MM-DD" key. The timezone offset is subtracted
// first so the date stays correct for the user's local day (toISOString is UTC).
export const todayKey = (d = new Date()) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
};

// Weighted score: caps keep one metric from dominating the heatmap.
// Each activity type contributes points, but Math.min() caps its contribution so
// (say) logging 20 tasks in a day can't drown out everything else. Tune the weights
// (×10, ×15, ...) to change how much each activity "counts".
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
  // findOrCreate: get the existing Activity row for this user+day, or make a fresh
  // one. (The unique index on UserId+date guarantees only one row per day.)
  const [activity] = await Activity.findOrCreate({ where: { UserId: userId, date } });
  // Apply each delta. We add (v can be negative, e.g. un-completing a task), clamp
  // at 0 so counters never go negative, and round to avoid floating-point drift.
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'number' && v !== 0) {
      activity[k] = Math.max(0, Math.round((activity[k] + v) * 100) / 100);
    }
  }
  activity.score = computeScore(activity); // recompute the day's score after the change
  await activity.save();
  return activity;
}
