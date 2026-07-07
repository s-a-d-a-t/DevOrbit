# DevPulse ⚡

> A developer productivity + growth tracker — your personal **"developer OS."**
> Track tasks, learning, skills, projects, habits, focus sessions and milestones, and watch every effort light up a GitHub-style contribution heatmap that feeds a daily productivity score and streaks.

**Author:** [Sadat Amir](https://github.com/s-a-d-a-t) · sdrkk66@gmail.com
**Stack:** React 18 (Vite) · Node.js + Express · PostgreSQL (Sequelize ORM) · JWT auth · Recharts

This document is a full tour of the project — how it is structured, how a request flows end to end, every backend model and endpoint, and every frontend page, component, chart and animation. It is written so you can **read it, understand the whole system, and present it** with confidence.

---

## Table of contents

- [1. What DevPulse is](#1-what-devpulse-is)
- [2. Tech stack](#2-tech-stack)
- [3. Quick start](#3-quick-start)
- [4. How it all fits together (the flow)](#4-how-it-all-fits-together-the-flow)
- [5. Backend](#5-backend)
  - [5.1 Directory layout](#51-directory-layout)
  - [5.2 Server bootstrap](#52-server-bootstrap)
  - [5.3 Data model](#53-data-model)
  - [5.4 The CRUD factory + activity hooks](#54-the-crud-factory--activity-hooks)
  - [5.5 The activity & scoring engine](#55-the-activity--scoring-engine)
  - [5.6 Auth & security](#56-auth--security)
  - [5.7 Analytics endpoints](#57-analytics-endpoints)
  - [5.8 Full API reference](#58-full-api-reference)
  - [5.9 Database modes](#59-database-modes)
- [6. Frontend](#6-frontend)
  - [6.1 Directory layout](#61-directory-layout)
  - [6.2 Routing & auth gating](#62-routing--auth-gating)
  - [6.3 API client & token handling](#63-api-client--token-handling)
  - [6.4 Global state (contexts)](#64-global-state-contexts)
  - [6.5 Pages](#65-pages)
  - [6.6 Reusable components](#66-reusable-components)
  - [6.7 Charts & data visualization](#67-charts--data-visualization)
- [7. Design system](#7-design-system)
- [8. Animations & interactions](#8-animations--interactions)
- [9. Environment variables](#9-environment-variables)
- [10. Scripts reference](#10-scripts-reference)
- [11. Notes & limitations](#11-notes--limitations)

---

## 1. What DevPulse is

DevPulse is a single-user-per-account web app that unifies the things a developer wants to stay on top of:

| Domain | What you track |
|---|---|
| **Tasks** | Priorities, tags, statuses, due dates (a light kanban) |
| **Learning** | Study sessions (topic, hours, difficulty, notes) + a resource library |
| **Skills** | Level, mastery %, linked projects, and a **history** of every checkpoint |
| **Projects & Goals** | Projects with tech stacks; goals broken into milestones |
| **Habits** | Daily check-ins with a streak-friendly calendar |
| **Focus** | Pomodoro-style focus sessions logged to your day |
| **Notes** | A markdown editor with live preview and version history |
| **Memories** | Milestone moments shown in a draggable 3D photo dome |

The connective tissue is the **activity system**: every completed task, study hour, focus session and habit check-in is rolled into one `Activity` row per day, scored, and rendered as a **contribution heatmap**, **streaks**, and **analytics**.

---

## 2. Tech stack

**Backend**
- **Node.js + Express** (ES modules) — REST API under `/api`
- **PostgreSQL** via **Sequelize** ORM (models, associations, JSONB columns)
- **JWT** (`jsonwebtoken`) auth + **bcryptjs** password hashing
- **embedded-postgres** — a throwaway in-process Postgres for zero-setup dev

**Frontend**
- **React 18** + **Vite 6**
- **react-router-dom 7** — client routing
- **axios** — API client with token interceptors
- **Recharts** — bar / line / radial charts
- **@use-gesture/react** — drag physics for the 3D Memories dome
- **marked** — markdown → HTML for Notes
- **@fontsource** — self-hosted variable fonts (Sora, Inter, JetBrains Mono)

**Tooling**
- npm **workspaces** (`server` + `client`) with **concurrently** to run both

---

## 3. Quick start

### Option A — zero setup (embedded PostgreSQL)

```bash
npm install
npm run dev:memory
```

This boots the API against an **embedded PostgreSQL** (auto-downloaded on first run, port `55432`, data wiped every restart) and seeds a demo account:

> **demo@devpulse.dev / demo1234**

Open **http://localhost:5173** and sign in.

### Option B — real PostgreSQL

1. Create a `devpulse` database (local Postgres, or a hosted one — Neon / Supabase / Railway).
2. Configure the server:
   ```bash
   cp server/.env.example server/.env
   # edit DATABASE_URL and set a strong JWT_SECRET
   ```
3. Run both apps:
   ```bash
   npm run dev
   ```
4. Optional — seed the demo data into your database:
   ```bash
   npm run seed
   ```

Tables are created/updated automatically on start via `sequelize.sync({ alter: true })`. The Vite dev server (`5173`) proxies `/api` to Express (`5000`).

---

## 4. How it all fits together (the flow)

### Request lifecycle

```
Browser (React SPA, :5173)
   │  axios  →  baseURL "/api"  (+ Authorization: Bearer <JWT> from localStorage)
   ▼
Vite dev proxy  /api  ──►  Express (:5000)
   │
   ├─ /api/health                    → public health check
   ├─ /api/auth/*                    → register / login / me   (issues + verifies JWT)
   └─ /api/*  ──► requireAuth ──►     modules (CRUD) + analytics
                    │  verifies JWT, sets req.userId
                    ▼
              Sequelize models  ──►  PostgreSQL
                    │
                    └─ write hooks (afterCreate / afterUpdate)
                          └─► activityService.logActivity()  → updates today's Activity + score
```

### The three core flows to understand

**1. Auth flow**
`Register`/`Login` → server hashes/verifies with bcrypt, returns a **JWT** + public user → the client stores the token in `localStorage` (`devpulse_token`) → every request attaches it as a `Bearer` header → `requireAuth` middleware verifies it and sets `req.userId`, which scopes **every** query to that user.

**2. Activity/score flow (the heart of the app)**
Domain writes don't just save data — their route **hooks** call `logActivity(userId, { … })`, which finds-or-creates the user's `Activity` row for that day, increments counters (tasks, learning hours, coding minutes, focus sessions, habit check-ins), recomputes a **weighted daily score**, and saves. The heatmap, streaks and analytics all read from these `Activity` rows.

**3. Theme flow**
`index.html` stamps `data-theme` on `<html>` **before React renders** (no flash). `ThemeContext` toggles it, persists to `localStorage` (`dp_theme`), and calls `applyChartTheme()` so Recharts palettes swap in sync. Every color is a CSS variable, so the whole UI re-skins instantly.

---

## 5. Backend

### 5.1 Directory layout

```
server/src
├── index.js                  App bootstrap: DB → models → sync → routes → listen
├── db.js                     connectDB(): embedded (dev) or DATABASE_URL (prod)
├── seed.js                   Demo account + realistic sample data
├── middleware/
│   └── auth.js               requireAuth (verify JWT) + signToken
├── models/
│   └── index.js              All 12 Sequelize models + associations
├── routes/
│   ├── auth.js               register / login / me
│   ├── crudFactory.js        crudRouter(Model, { order, hooks }) — generic CRUD
│   ├── modules.js            Wires every domain model to a CRUD router + hooks
│   └── analytics.js          Heatmap, streak, summary, breakdowns, today-plan…
└── services/
    └── activityService.js    logActivity() + computeScore() + todayKey()
```

### 5.2 Server bootstrap

`index.js` runs in a deliberate order because routes import live model bindings:

1. `connectDB()` — connect to Postgres (embedded or real).
2. `initModels(sequelize)` — define models & associations.
3. `sequelize.sync({ alter: true })` — reconcile tables to the models (no manual migrations).
4. **Dynamically import** routes *after* models exist.
5. Mount middleware: `cors()`, `express.json()`.
6. Mount routes: `/api/health` (public), `/api/auth` (public), then `/api` behind `requireAuth` for `modules` + `analytics`.
7. A final error handler maps Sequelize validation/unique errors → `400`, everything else → `500`.
8. In `MEMORY_DB` mode, seed the demo account.

### 5.3 Data model

Every model **belongs to `User`** with `onDelete: CASCADE`, and every query is scoped by `UserId`. JSONB columns are used for flexible, array-like data.

| Model | Key fields | Notes |
|---|---|---|
| **User** | `name`, `email` (unique, lowercased), `password` (hashed), `bio`, `githubUsername`, `dailyGoalHours` | `password` excluded by default scope; `withPassword` scope for login; bcrypt hash in `beforeSave`; `comparePassword()` instance method |
| **Task** | `title`, `description`, `priority` (low/med/high), `status` (pending/in-progress/done), `tags[]`, `dueDate`, `completedAt` | Completing a task logs activity |
| **LearningLog** | `topic`, `hours`, `difficulty` (1–5), `notes`, `date`, `tags[]`, `links[]` | Hours feed the daily score & study-hours chart |
| **Skill** | `name`, `level` (beginner→expert), `progress` (0–100), `category`, `projects[]` (linked ids), `history[]` (`{progress,date}`) | Each progress change appends a history checkpoint |
| **Project** | `name`, `description`, `status` (planned/ongoing/completed/paused), `techStack[]`, `repoUrl`, `liveUrl`, `startedAt`, `completedAt` | |
| **Activity** | `date` (YYYY-MM-DD), `tasksCompleted`, `learningHours`, `codingMinutes`, `focusSessions`, `habitsChecked`, `score` | **One row per user per day** (unique `UserId+date`). The source of truth for heatmap/streaks/analytics |
| **Goal** | `title`, `description`, `type` (daily/weekly/career), `targetDate`, `completed`, `milestones[]` (`{title,done}`) | Daily goals surface in the Today Plan |
| **Habit** | `name`, `icon`, `checkins[]` (YYYY-MM-DD keys) | Toggle endpoint for daily check-ins |
| **Resource** | `title`, `type` (video/article/repo/course/book/other), `category`, `links[]` (`{label,url}`), `tags[]`, `notes`, `consumed` | A topic can hold several links |
| **FocusSession** | `label`, `minutes`, `startedAt`, `taskId` | Logs focus sessions + coding minutes |
| **Note** | `title`, `content`, `pinned`, `versions[]` (`{content,savedAt}`, last 10) | Markdown; auto-snapshots previous content on edit |
| **Memory** | `title`, `description`, `imageUrl`, `date` | Powers the 3D dome gallery |

### 5.4 The CRUD factory + activity hooks

Rather than repeat CRUD for a dozen models, `crudFactory.js` exports **`crudRouter(Model, { order, hooks })`** — a generic, user-scoped router providing:

- `GET /` — list all rows for `req.userId`
- `POST /` — create (auto-attaches `UserId`) → optional `afterCreate(doc, req)`
- `PUT /:id` — update (strips `id`/`UserId`) → optional `afterUpdate(doc, prev, req)`
- `DELETE /:id` — delete by id (scoped to user)

`modules.js` wires each model to it and attaches **hooks** for the side effects that make DevPulse feel alive:

- **Tasks** — moving a task **into** `done` sets `completedAt` and logs `tasksCompleted: +1`; moving **out** of done reverses it (`-1`).
- **Learning** — logs the `hours` delta so edits stay consistent.
- **Skills** — appends `{progress, date}` to `history` whenever progress changes.
- **Habits** — a bonus `POST /habits/:id/toggle` flips today's check-in and logs `habitsChecked: ±1`.
- **Notes** — snapshots the previous content into `versions` (capped at 10) on each save.
- **Focus** — creating a session logs `focusSessions: +1` and `codingMinutes += minutes`.

### 5.5 The activity & scoring engine

`services/activityService.js` is the single place daily progress is tallied.

`logActivity(userId, fields, date = today)` find-or-creates the day's `Activity` row, adds each field (clamped at ≥ 0), then recomputes the **weighted, capped** score so no single metric dominates the heatmap:

```js
score =  min(tasksCompleted, 8) * 10     // tasks   (max 80)
      +  min(learningHours,  6) * 15     // study   (max 90)
      +  min(codingMinutes/30,10) * 8    // focus min (max 80)
      +  min(focusSessions,  8) * 5      // sessions (max 40)
      +  min(habitsChecked,  6) * 5      // habits  (max 30)
```

`todayKey()` normalizes dates to a local `YYYY-MM-DD` string so day boundaries match the user's timezone.

### 5.6 Auth & security

- **Passwords** are hashed with bcrypt in a `beforeSave` hook; the default model scope **excludes** `password` from every read.
- **Login** uses the explicit `withPassword` scope + `comparePassword()`.
- **`signToken(userId)`** issues a JWT (`7d` default). **`requireAuth`** reads the `Bearer` token, verifies it, and sets `req.userId`.
- Every domain/analytics query filters by `req.userId`, so users can only ever touch their own data.
- Responses return a **`publicUser`** projection (never the hash).

### 5.7 Analytics endpoints

`routes/analytics.js` turns raw `Activity`/domain rows into dashboard-ready data:

| Endpoint | Returns |
|---|---|
| `GET /activities/heatmap?days=365` | Daily cells (`date`, `score`, counts) for the contribution calendar (max 730 days) |
| `GET /activities/streak` | `current` & `longest` streak of scored days + total `activeDays` |
| `GET /analytics/summary?range=week\|month` | Totals across the range (tasks, hours, focus, score, active days, pending tasks) |
| `GET /analytics/study-hours?weeks=8` | Learning hours bucketed per **ISO week** |
| `GET /analytics/tasks-breakdown` | Task counts `byStatus` and `byPriority` |
| `GET /analytics/skill-progress` | Each skill's `history` for the progress-over-time chart |
| `GET /analytics/today-plan` | A generated focus list: overdue → high-priority → in-progress → unchecked habits → remaining study goal → daily goals (capped at 10) |
| `GET /analytics/reminders` | Unfinished tasks due today or overdue |

### 5.8 Full API reference

All routes except `health` and `auth/*` require `Authorization: Bearer <token>`.

```
Public
  GET    /api/health
  POST   /api/auth/register            { name, email, password }
  POST   /api/auth/login               { email, password }         → { token, user }
  GET    /api/auth/me
  PUT    /api/auth/me                  { name, bio, githubUsername, dailyGoalHours }

CRUD (list / create / update / delete)   — GET|POST /  ·  PUT|DELETE /:id
  /api/tasks      /api/learning   /api/skills     /api/projects
  /api/goals      /api/resources  /api/habits     /api/focus       /api/notes    /api/memories
  POST   /api/habits/:id/toggle        { date? }   → flip today's check-in

Activity & analytics
  GET    /api/activities/heatmap?days=365
  GET    /api/activities/streak
  GET    /api/analytics/summary?range=week|month
  GET    /api/analytics/study-hours?weeks=8
  GET    /api/analytics/tasks-breakdown
  GET    /api/analytics/skill-progress
  GET    /api/analytics/today-plan
  GET    /api/analytics/reminders
```

### 5.9 Database modes

`db.js` chooses the database from the environment:

- **`MEMORY_DB=1`** — spins up an **embedded PostgreSQL** in a temp dir on port `55432`, non-persistent (fresh every run), and the server seeds the demo account. Great for demos and first-run.
- **Otherwise** — connects to `DATABASE_URL` (defaults to `postgres://postgres:postgres@127.0.0.1:5432/devpulse`).

Schema is kept in sync with `sequelize.sync({ alter: true })` — there are no manual migration files.

---

## 6. Frontend

### 6.1 Directory layout

```
client/src
├── main.jsx                 Entry: font imports + providers (Theme → Auth) + Router
├── App.jsx                  Routes + auth gating
├── api.js                   axios instance + token/401 interceptors
├── styles.css               The entire design system (tokens + every component style)
├── chartTheme.js            Theme-aware Recharts palettes + applyChartTheme()
├── context/
│   ├── AuthContext.jsx      user, loading, login/register/logout
│   └── ThemeContext.jsx     light/dark toggle, persisted, syncs chart theme
├── pages/
│   ├── Landing.jsx  Login.jsx  Register.jsx           (public)
│   ├── Dashboard.jsx  Tasks.jsx  Notes.jsx  Learning.jsx
│   ├── Skills.jsx  Projects.jsx  Analytics.jsx  Memories.jsx  Profile.jsx
└── components/
    ├── Layout.jsx           Sidebar + mobile nav + <Outlet/>
    ├── Modal.jsx            Shared dialog for all create/edit forms
    ├── Heatmap.jsx          GitHub-style contribution calendar
    ├── StatTile.jsx         Hero KPI card (icon + value + ↗)
    ├── DomeGallery.jsx/.css 3D draggable photo dome (Memories)
    ├── ResourceLibrary.jsx  Grouped resource list (Learning)
    └── icons.jsx            Inline SVG stroke icon set
```

### 6.2 Routing & auth gating

`App.jsx` reads `{ user, loading }` from `AuthContext`:

- While `loading` → a minimal loading screen.
- **No user** → only public routes render: `Landing` (`/`), `Login`, `Register` (anything else redirects to `/`).
- **Authenticated** → everything renders inside `Layout` (which provides the sidebar + `<Outlet/>`): Dashboard, Tasks, Notes, Learning, Skills, Projects, Analytics, Memories, Profile. Unknown paths redirect home.

### 6.3 API client & token handling

`api.js` is an axios instance (`baseURL: "/api"`) with two interceptors:

- **Request** — attaches `Authorization: Bearer <devpulse_token>` from `localStorage`.
- **Response** — on a `401` from a non-auth route, clears the token and redirects to `/login` (session expiry handled globally).

### 6.4 Global state (contexts)

- **AuthContext** — holds `user` + `loading`; on mount, if a token exists it calls `/auth/me` to restore the session. Exposes `login`, `register`, `logout` (each manages the token).
- **ThemeContext** — initializes from the `data-theme` already on `<html>`; `toggleTheme()` flips it, persists `dp_theme`, and calls `applyChartTheme()` so charts recolor with the UI.

### 6.5 Pages

| Page | What it does | Highlights |
|---|---|---|
| **Landing** | Marketing / entry page for signed-out users | Reveal-on-scroll sections, **count-up** stat counters, an animated mock dashboard with a self-drawing heatmap, theme toggle |
| **Login / Register** | Auth cards | Inline validation errors; branded "DevPulse" wordmark |
| **Dashboard** | The daily cockpit | Hero **stat cards**, 6-month heatmap, **focus timer** that becomes a dark "Time Tracker" card while running, generated **Today's plan**, autosaving **quick note**, **habit** check-ins, **weekly rhythm** bar chart (peak day highlighted), a **radial task-progress gauge**, skill progression, goal progress, reminders, resource library, recent-activity feed |
| **Tasks** | Task board | Columns Backlog / In progress / Done, stat cards, priority + tag + due-date, modal create/edit |
| **Notes** | Markdown workspace | **Edit / split / read** modes + **focus mode**, live `marked` preview, **version history** (restore last 10), pin, keyboard shortcuts |
| **Learning** | Study log + resources | Stat cards, session log, embedded **ResourceLibrary** |
| **Skills** | Mastery tracker (redesigned) | **Circular progress rings**, a beginner→expert **level ladder**, category **filter chips** + a "mastery by category" bar overview, **sparkline** trend, linked-project chips, inline mastery slider that saves a checkpoint |
| **Projects** | Project + goal tracker | Stat cards, tech stacks, repo/live links, goals with milestone checklists |
| **Analytics** | Deep charts | Stat cards, 12-month heatmap, study-hours chart, tasks breakdown, **skill progress over time**, week/month range toggle |
| **Memories** | Milestone gallery | 3D **DomeGallery** you can drag to spin, compact stat chips, and an editable list |
| **Profile** | Account settings | Identity hero (avatar + name), editable bio / GitHub / daily goal |

### 6.6 Reusable components

- **Layout** — the floating, **collapsible** sidebar: filled logo mark, light/dark toggle, collapse toggle, a "workspace" pill, a **⌘K search** affordance (dispatches a `dp:search` event as a command-palette hook point), **grouped navigation** (Workspace / Insights / Account) with an animated active indicator and a due-tasks badge on Tasks, and a user chip with sign-out. On mobile it swaps to a bottom nav bar + a floating "+" action button. Renders the page via `<Outlet/>`.
- **Modal** — the shared dialog behind every create/edit form. Closes on **Esc** or backdrop click, **locks body scroll**, and uses `onMouseDown` on the backdrop so a drag that ends outside doesn't dismiss it.
- **Heatmap** — a GitHub-style contribution calendar: columns are weeks (Sun–Sat rows), colored by a 5-step level derived from the range's max score, with month labels, hover tooltips, and a legend. Colors come from the theme's `HEAT` ramp.
- **StatTile** — the hero KPI card: an icon chip, a corner **↗** arrow (rotates on hover), a big value, and a delta line. A `feature` variant fills the card with the terracotta accent.
- **DomeGallery** — a 3D dome of images you can drag to rotate (physics via `@use-gesture/react`); each tile carries a title/description and shows a caption overlay when opened. (Tiles overlap in 3D, so automated clicks need `dispatchEvent('click')`.)
- **ResourceLibrary** — groups saved resources by category with their multiple links.
- **icons.jsx** — a consistent set of inline, `currentColor` SVG stroke icons (grid, check, book, spark, folder, chart, flame, clock, target, arrows, etc.).

### 6.7 Charts & data visualization

**Recharts** powers the dynamic charts, always themed through `chartTheme.js`:

- **Bar** — weekly rhythm (Dashboard, peak day highlighted via `Cell`), study hours (Analytics).
- **Line** — skill progress over time (Analytics).
- **RadialBar** — the task-progress gauge (Dashboard).
- **Custom SVG** — the contribution **Heatmap**, the Skills **rings** and **sparklines**, and the Landing hero mock — all hand-built SVG for full control.

`chartTheme.js` exports live-binding palettes (`SERIES`, `HEAT`, `GRID`, `AXIS`, `tooltipStyle`, …) and `applyChartTheme(mode)` swaps them; components pick up new values on their next render.

---

## 7. Design system

DevPulse ships a **dual-theme, token-driven** design system. Every color, radius and shadow is a CSS variable defined on `:root` (light) and `:root[data-theme='dark']` in `styles.css`, so re-theming is instant and consistent.

**Aesthetic — warm minimal, monochrome + one pop**
- **Light (default):** warm stone & cream surfaces, warm near-black ink.
- **Dark:** warm charcoal / espresso surfaces, warm off-white ink.
- **The one accent:** a single **terracotta / clay** pop used sparingly for primary actions, active nav, and key numbers — everything else stays neutral. Semantic colors (sage success, honey attention, oxblood danger) are muted and used only where meaning requires.
- Rounded geometry (radii 18 / 12 / 9px) and soft, warm shadows for a calm, approachable feel.

**Typography**
- **Sora** (variable) — geometric display / headings
- **Inter** (variable) — humanist body text
- **JetBrains Mono** — numbers, labels, code, and the signature uppercase "eyebrow" micro-labels

**Theming mechanics**
- `index.html` sets `data-theme` from `localStorage` **before render** → no flash of the wrong theme.
- `ThemeContext` toggles the attribute, persists `dp_theme`, and re-syncs chart colors.
- Chart palettes live in `chartTheme.js` and are swapped in lockstep.

---

## 8. Animations & interactions

Motion is used to make the app feel responsive without being noisy. All keyframes live in `styles.css` (plus the dome's gesture physics in JS).

**CSS keyframe animations**

| Animation | Where | Effect |
|---|---|---|
| `pagein` | `.main` on every route | Subtle fade + upward slide as pages mount |
| `rise` | `.board > *` (dashboard/board grids) | Cards **stagger in** via `nth-child` animation delays |
| `indicator` | active sidebar link | The accent bar scales in vertically |
| `overlayin` / `modalin` | Modal | Backdrop fades; dialog fades + slides + scales in |
| `pop` | dropdowns / menus | Quick fade + scale for popovers |
| `shimmer` | `.skeleton` | Loading placeholders shimmer |
| `cellin` | Landing hero mock | Heatmap cells **draw themselves** in, one by one |

**JS / scroll-driven interactions**

- **Reveal-on-scroll** (Landing) — an `IntersectionObserver` adds `.in` to `.reveal` elements as they enter the viewport, triggering an opacity + translate transition.
- **Count-up counters** (Landing) — numbers animate from 0 with a `requestAnimationFrame` ease-out-cubic when scrolled into view.
- **3D dome** (Memories) — drag inertia and rotation via `@use-gesture/react`.

**Transitions & micro-interactions**

- Progress **rings** and **bars** animate their `stroke-dashoffset` / `width`.
- **Stat cards** lift on hover (with the ↗ arrow nudging); **nav links** slide slightly; **skill cards** raise.
- The **focus timer** transforms into a dark "Time Tracker" card while a session runs.
- Theme changes transition smoothly because all colors are variables.

---

## 9. Environment variables

Server (`server/.env`, see `server/.env.example`):

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | API port | `5000` |
| `DATABASE_URL` | Postgres connection string | `postgres://postgres:postgres@127.0.0.1:5432/devpulse` |
| `JWT_SECRET` | Token signing secret (**set a strong one in prod**) | insecure dev fallback |
| `JWT_EXPIRES` | Token lifetime | `7d` |
| `MEMORY_DB` | `1` = embedded throwaway Postgres (auto-seeds demo) | `0` |

---

## 10. Scripts reference

**Root** (npm workspaces)

| Script | Does |
|---|---|
| `npm run dev` | Runs server + client together against your configured Postgres |
| `npm run dev:memory` | Runs both against embedded Postgres + demo seed (zero setup) |
| `npm run seed` | Seeds the demo account into your configured database |

**Server** (`-w server`): `dev` (watch), `dev:memory`, `start`, `seed`
**Client** (`-w client`): `dev` (Vite), `build`, `preview`

---

## 11. Notes & limitations

- **Single-tenant per account** — all data is user-scoped; there is no sharing/teams.
- **`sequelize.sync({ alter: true })`** manages schema (no migration history) — convenient for a portfolio project, but for production you'd move to real migrations.
- The sidebar **⌘K search** dispatches a `dp:search` event as a **hook point** for a command palette; the palette itself is not yet implemented.
- In `dev:memory` mode, **data is wiped on every restart** by design.
- `node --watch` occasionally misses model-file changes — restart the server if the API seems stale after editing a model.

---

*Built by [Sadat Amir](https://github.com/s-a-d-a-t) — a personal developer OS, made to be lived in.*
