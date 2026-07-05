import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';

// Populated by initModels() after the DB connection is established.
// ES-module live bindings let route files import these before init runs.
export let User, Task, LearningLog, Skill, Project, Activity, Goal, Habit, Resource, FocusSession;

export function initModels(sequelize) {
  User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, set(v) { this.setDataValue('email', String(v).toLowerCase().trim()); } },
    password: { type: DataTypes.STRING, allowNull: false, validate: { len: [6, 100] } },
    bio: { type: DataTypes.TEXT, defaultValue: '' },
    githubUsername: { type: DataTypes.STRING, defaultValue: '' },
    dailyGoalHours: { type: DataTypes.FLOAT, defaultValue: 2 },
  }, {
    defaultScope: { attributes: { exclude: ['password'] } },
    scopes: { withPassword: {} },
  });

  User.beforeSave(async (user) => {
    if (user.changed('password')) user.password = await bcrypt.hash(user.password, 10);
  });
  User.prototype.comparePassword = function (plain) {
    return bcrypt.compare(plain, this.password);
  };

  Task = sequelize.define('Task', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    priority: { type: DataTypes.ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
    status: { type: DataTypes.ENUM('pending', 'in-progress', 'done'), defaultValue: 'pending' },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    dueDate: { type: DataTypes.DATE },
    completedAt: { type: DataTypes.DATE },
  });

  LearningLog = sequelize.define('LearningLog', {
    topic: { type: DataTypes.STRING, allowNull: false },
    hours: { type: DataTypes.FLOAT, allowNull: false, validate: { min: 0 } },
    notes: { type: DataTypes.TEXT, defaultValue: '' },
    difficulty: { type: DataTypes.INTEGER, defaultValue: 3, validate: { min: 1, max: 5 } },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
  });

  Skill = sequelize.define('Skill', {
    name: { type: DataTypes.STRING, allowNull: false },
    level: { type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'), defaultValue: 'beginner' },
    progress: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0, max: 100 } },
    category: { type: DataTypes.STRING, defaultValue: 'general' },
    projects: { type: DataTypes.JSONB, defaultValue: [] }, // linked Project ids
    history: { type: DataTypes.JSONB, defaultValue: [] },  // [{ progress, date }]
  });

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
    indexes: [{ unique: true, fields: ['UserId', 'date'] }],
  });

  Goal = sequelize.define('Goal', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    type: { type: DataTypes.ENUM('daily', 'weekly', 'career'), defaultValue: 'career' },
    targetDate: { type: DataTypes.DATE },
    completed: { type: DataTypes.BOOLEAN, defaultValue: false },
    milestones: { type: DataTypes.JSONB, defaultValue: [] }, // [{ title, done }]
  });

  Habit = sequelize.define('Habit', {
    name: { type: DataTypes.STRING, allowNull: false },
    icon: { type: DataTypes.STRING, defaultValue: '✅' },
    checkins: { type: DataTypes.JSONB, defaultValue: [] }, // YYYY-MM-DD keys
  });

  Resource = sequelize.define('Resource', {
    title: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('video', 'article', 'repo', 'course', 'book', 'other'), defaultValue: 'other' },
    category: { type: DataTypes.STRING, defaultValue: 'General' },
    links: { type: DataTypes.JSONB, defaultValue: [] }, // [{ label, url }] — several links per topic
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    notes: { type: DataTypes.TEXT, defaultValue: '' },
    consumed: { type: DataTypes.BOOLEAN, defaultValue: false },
  });

  FocusSession = sequelize.define('FocusSession', {
    label: { type: DataTypes.STRING, defaultValue: 'Focus' },
    minutes: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    taskId: { type: DataTypes.INTEGER },
  });

  for (const Model of [Task, LearningLog, Skill, Project, Activity, Goal, Habit, Resource, FocusSession]) {
    User.hasMany(Model, { onDelete: 'CASCADE' });
    Model.belongsTo(User);
  }

  return sequelize;
}
