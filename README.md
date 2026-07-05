# DevPulse ⚡

A developer productivity + growth tracker — your personal "developer OS". Track tasks, learning, skills, projects, habits and focus sessions, and watch your progress light up a GitHub-style contribution heatmap.

**Author:** [Sadat Amir](https://github.com/s-a-d-a-t) · sdrkk66@gmail.com

**Stack:** React (Vite) · Node.js + Express · PostgreSQL (Sequelize) · JWT auth · Recharts

## Quick start (no PostgreSQL install needed)

```bash
npm install
npm run dev:memory
```

This runs the API against an **embedded PostgreSQL** (auto-downloaded on first run, port 55432) seeded with a demo account:

> **demo@devpulse.dev / demo1234**

Open http://localhost:5173. Data is wiped on server restart in this mode.

## Running with a real PostgreSQL

1. Start PostgreSQL locally or grab a free hosted instance (Neon, Supabase, Railway…), and create a `devpulse` database.
2. Configure the server:
   ```bash
   cp server/.env.example server/.env
   # edit DATABASE_URL and set a strong JWT_SECRET
   ```
3. Run both apps:
   ```bash
   npm run dev
   ```
4. Optional: seed the demo account into your database with `npm run seed`.

Tables are created automatically on first start (`sequelize.sync()`).

The client dev server (Vite, port 5173) proxies `/api` to the Express server (port 5000).

## Features

- **Auth** — JWT register/login, profile with daily learning goal
- **Dashboard** — daily overview, generated "Today Plan", habit check-ins, Pomodoro focus timer, smart reminders, 6-month heatmap
- **Tasks** — priorities, tags, statuses (pending / in-progress / done), due dates
- **Learning** — study session log (topic, hours, difficulty, notes) + resource library (videos, articles, repos, courses)
- **Skills** — level, progress %, linked projects, progress history
- **Projects & Goals** — project tracker with tech stack; goals with milestones
- **Analytics** — productivity score, weekly study-hours chart, tasks breakdown, skill progress over time, 12-month activity heatmap, streaks
- **Activity system** — every completed task, learning hour, focus session and habit check-in feeds a daily activity score that drives the heatmap and streaks

## API overview

All module routes require `Authorization: Bearer <token>`.

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET/PUT /api/auth/me` |
| CRUD | `/api/tasks`, `/api/learning`, `/api/skills`, `/api/projects`, `/api/goals`, `/api/habits` (+ `POST /:id/toggle`), `/api/resources`, `/api/focus` |
| Activity | `GET /api/activities/heatmap?days=365`, `GET /api/activities/streak` |
| Analytics | `GET /api/analytics/summary?range=week\|month`, `/study-hours`, `/tasks-breakdown`, `/skill-progress`, `/today-plan`, `/reminders` |

## Project structure

```
server/src
  models/      Sequelize models: User, Task, LearningLog, Skill, Project, Activity, Goal, Habit, Resource, FocusSession
  routes/      auth, modules (CRUD + activity hooks), analytics
  services/    activityService (daily score + heatmap source)
client/src
  pages/       Dashboard, Tasks, Learning, Skills, Projects, Analytics, Profile, Login, Register
  components/  Layout, Heatmap, StatTile
```
