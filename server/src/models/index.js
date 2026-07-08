// ============================================================================
// server/src/models/index.js  —  THE DATABASE SCHEMA (all tables)
// ----------------------------------------------------------------------------
// This defines every table in the database as a Sequelize "model". A model is a
// JS description of a table: its columns, their types, defaults, and validations.
// Once defined, we get free methods like Model.create(), Model.findAll(), etc.
//
// Key concepts you'll see repeatedly:
//   - DataTypes.STRING / TEXT / INTEGER / FLOAT / BOOLEAN / DATE / ENUM: column types.
//   - DataTypes.JSONB: a column that stores arbitrary JSON (arrays/objects) — handy
//     for things like tags or a list of links without a separate table.
//   - allowNull:false = required; defaultValue = used when none is provided.
//   - At the very bottom, RELATIONSHIPS: every record belongs to a User.
// ============================================================================

import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs'; // for securely hashing passwords

// Populated by initModels() after the DB connection is established.
// ES-module live bindings let route files import these before init runs.
// (They start undefined; initModels assigns them once the connection exists.)
export let User, Task, LearningLog, Skill, Project, Activity, Goal, Habit, Resource, FocusSession, Note, Memory;

// Define every model on the given connection. Called once at startup.
export function initModels(sequelize) {
  // --- User: the account. Note the security details on password/email. ---
  User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    // `set(v)` is a custom setter: always store the email lowercased + trimmed so
    // logins are case-insensitive. `unique` forbids duplicate emails.
    email: { type: DataTypes.STRING, allowNull: false, unique: true, set(v) { this.setDataValue('email', String(v).toLowerCase().trim()); } },
    password: { type: DataTypes.STRING, allowNull: false, validate: { len: [6, 100] } },
    bio: { type: DataTypes.TEXT, defaultValue: '' },
    githubUsername: { type: DataTypes.STRING, defaultValue: '' },
    dailyGoalHours: { type: DataTypes.FLOAT, defaultValue: 2 },
  }, {
    // defaultScope: by default, NEVER return the password field in queries — so we
    // don't accidentally leak the hash to the client. Use the 'withPassword' scope
    // explicitly (during login) when we genuinely need it to compare.
    defaultScope: { attributes: { exclude: ['password'] } },
    scopes: { withPassword: {} },
  });

  // Hook: before any save, if the password changed, replace it with a bcrypt HASH.
  // We never store raw passwords — bcrypt is a one-way hash, so even we can't read them.
  User.beforeSave(async (user) => {
    if (user.changed('password')) user.password = await bcrypt.hash(user.password, 10);
  });
  // Instance helper used at login: compare a typed password against the stored hash.
  User.prototype.comparePassword = function (plain) {
    return bcrypt.compare(plain, this.password);
  };

  // --- Task: a to-do item (drives the kanban board on the Tasks page). ---
  // ENUM restricts a column to a fixed set of allowed values.
  Task = sequelize.define('Task', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    priority: { type: DataTypes.ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
    status: { type: DataTypes.ENUM('pending', 'in-progress', 'done'), defaultValue: 'pending' },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    dueDate: { type: DataTypes.DATE },
    completedAt: { type: DataTypes.DATE },
  });

  // --- LearningLog: one study session (Learning page). ---
  LearningLog = sequelize.define('LearningLog', {
    topic: { type: DataTypes.STRING, allowNull: false },
    hours: { type: DataTypes.FLOAT, allowNull: false, validate: { min: 0 } },
    notes: { type: DataTypes.TEXT, defaultValue: '' },
    difficulty: { type: DataTypes.INTEGER, defaultValue: 3, validate: { min: 1, max: 5 } },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    links: { type: DataTypes.JSONB, defaultValue: [] }, // resources used: [{ label, url }]
  });

  // --- Skill: a tracked skill with a mastery % and a history of checkpoints. ---
  Skill = sequelize.define('Skill', {
    name: { type: DataTypes.STRING, allowNull: false },
    level: { type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'), defaultValue: 'beginner' },
    progress: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0, max: 100 } },
    category: { type: DataTypes.STRING, defaultValue: 'general' },
    projects: { type: DataTypes.JSONB, defaultValue: [] }, // linked Project ids
    history: { type: DataTypes.JSONB, defaultValue: [] },  // [{ progress, date }]
  });

  // --- Project: something you're building (Projects page). ---
  Project = sequelize.define('Project', {
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    status: { type: DataTypes.ENUM('planned', 'ongoing', 'completed', 'paused'), defaultValue: 'ongoing' },
    techStack: { type: DataTypes.JSONB, defaultValue: [] },
    repoUrl: { type: DataTypes.STRING, defaultValue: '' },
    liveUrl: { type: DataTypes.STRING, defaultValue: '' },
    startedAt: { type: DataTypes.DATE },
    completedAt: { type: DataTypes.DATE },
  });

  // One row per user per day — the source for the heatmap and score system.
  Activity = sequelize.define('Activity', {
    date: { type: DataTypes.STRING(10), allowNull: false }, // YYYY-MM-DD
    tasksCompleted: { type: DataTypes.INTEGER, defaultValue: 0 },
    learningHours: { type: DataTypes.FLOAT, defaultValue: 0 },
    codingMinutes: { type: DataTypes.INTEGER, defaultValue: 0 },
    focusSessions: { type: DataTypes.INTEGER, defaultValue: 0 },
    habitsChecked: { type: DataTypes.INTEGER, defaultValue: 0 },
    score: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    // A unique index on (UserId, date) enforces at most one Activity row per user
    // per day, so we can safely "upsert" the day's totals.
    indexes: [{ unique: true, fields: ['UserId', 'date'] }],
  });

  // --- Goal: an outcome with a checklist of milestones (Projects page). ---
  Goal = sequelize.define('Goal', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    type: { type: DataTypes.ENUM('daily', 'weekly', 'career'), defaultValue: 'career' },
    targetDate: { type: DataTypes.DATE },
    completed: { type: DataTypes.BOOLEAN, defaultValue: false },
    milestones: { type: DataTypes.JSONB, defaultValue: [] }, // [{ title, done }]
  });

  // --- Habit: a daily habit; `checkins` records which days it was done. ---
  Habit = sequelize.define('Habit', {
    name: { type: DataTypes.STRING, allowNull: false },
    icon: { type: DataTypes.STRING, defaultValue: '✅' },
    checkins: { type: DataTypes.JSONB, defaultValue: [] }, // YYYY-MM-DD keys
  });

  // --- Resource: a study topic holding several links (the Resource library). ---
  Resource = sequelize.define('Resource', {
    title: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('video', 'article', 'repo', 'course', 'book', 'other'), defaultValue: 'other' },
    category: { type: DataTypes.STRING, defaultValue: 'General' },
    links: { type: DataTypes.JSONB, defaultValue: [] }, // [{ label, url }] — several links per topic
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    notes: { type: DataTypes.TEXT, defaultValue: '' },
    consumed: { type: DataTypes.BOOLEAN, defaultValue: false },
  });

  // --- FocusSession: a logged focus/deep-work block (from the dashboard timer). ---
  FocusSession = sequelize.define('FocusSession', {
    label: { type: DataTypes.STRING, defaultValue: 'Focus' },
    minutes: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    taskId: { type: DataTypes.INTEGER },
  });

  // --- Note: a markdown note; keeps recent versions for the history feature. ---
  Note = sequelize.define('Note', {
    title: { type: DataTypes.STRING, defaultValue: 'Untitled' },
    content: { type: DataTypes.TEXT, defaultValue: '' },
    pinned: { type: DataTypes.BOOLEAN, defaultValue: false },
    // last 10 saved versions for history/restore: [{ content, savedAt }]
    versions: { type: DataTypes.JSONB, defaultValue: [] },
  });

  // A moment on the developer's journey — powers the 3D dome gallery.
  Memory = sequelize.define('Memory', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    imageUrl: { type: DataTypes.TEXT, defaultValue: '' },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  });

  // --- RELATIONSHIPS ---
  // Every one of these models belongs to a User (a one-to-many relationship: one
  // user has many tasks/notes/etc). Sequelize adds a `UserId` foreign-key column to
  // each and gives us association helpers. `onDelete: 'CASCADE'` means deleting a
  // user automatically deletes all their related rows — no orphaned data left behind.
  for (const Model of [Task, LearningLog, Skill, Project, Activity, Goal, Habit, Resource, FocusSession, Note, Memory]) {
    User.hasMany(Model, { onDelete: 'CASCADE' });
    Model.belongsTo(User);
  }

  return sequelize;
}
