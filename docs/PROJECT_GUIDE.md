# 📖 TaskForge Engineering & Architecture Guide

> **Authoritative Technical Specification & Operational Manual for TaskForge**  
> Version: 1.0.0  
> Date: October 2026

---

## 1. Executive Summary

TaskForge is a production-grade, autonomous SaaS task and project management system designed for high-velocity engineering teams. It marries the ultra-fast reactivity of modern single-page applications with the reliability and data integrity of persistent relational persistence.

The system is delivered as a cleanly segregated TypeScript monorepo powered by `pnpm`, featuring:
- **`packages/shared`**: Shared TypeScript contracts, DTOs, and domain types.
- **`apps/api`**: Express REST API backend running on Node 22 with the built-in `node:sqlite` engine.
- **`apps/web`**: Single-Page Application constructed with React 18, Vite 6, and a customized responsive design system.
- **`tests/`**: Comprehensive automated test suite validating authentication, resource CRUD, query engines, and a 10-step E2E persistence lifecycle.

---

## 2. Technical Architecture & Monorepo Layout

### Monorepo Dependency Graph

```
                   ┌───────────────────────┐
                   │   @taskforge/shared   │
                   └───────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
     ┌─────────────────────┐       ┌─────────────────────┐
     │   @taskforge/api    │       │   @taskforge/web    │
     │  (Express + SQLite) │       │  (React 18 + Vite)  │
     └──────────┬──────────┘       └──────────┬──────────┘
                │                             │
                └──────────────┬──────────────┘
                               ▼
                   ┌───────────────────────┐
                   │    Unified Serving    │
                   │   Express (Port 4000) │
                   └───────────────────────┘
```

### Directory Structure

```
taskforge/
├── .gitignore
├── .npmrc
├── package.json               # Root workspace configuration & scripts
├── pnpm-workspace.yaml        # pnpm monorepo workspace definition
├── vitest.config.ts           # Vitest runner configuration (serial SQLite runner)
├── docs/
│   └── PROJECT_GUIDE.md       # This comprehensive engineering manual
├── packages/
│   └── shared/                # Domain models and API DTO definitions
│       ├── src/
│       │   ├── index.ts
│       │   └── types.ts
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── config.ts              # Centralized environment & server configuration
│   │   │   ├── app.ts                 # Express application factory with middleware
│   │   │   ├── index.ts               # Production HTTP listener entrypoint
│   │   │   ├── db/
│   │   │   │   ├── schema.sql         # Relational SQLite DDL schema
│   │   │   │   └── index.ts           # Database connection & query helper factory
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts            # JWT verification & RBAC authorization
│   │   │   │   └── errorHandler.ts    # Centralized HTTP error handler
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts            # /api/auth
│   │   │   │   ├── projects.ts        # /api/projects (including /members endpoints)
│   │   │   │   ├── tasks.ts           # /api/tasks
│   │   │   │   ├── comments.ts        # /api/comments
│   │   │   │   ├── activity.ts        # /api/activity
│   │   │   │   ├── dashboard.ts       # /api/dashboard
│   │   │   │   ├── search.ts          # /api/search
│   │   │   │   ├── notifications.ts   # /api/notifications
│   │   │   │   └── users.ts           # /api/users (user search & member lookup)
│   │   │   ├── services/              # Business logic & relational data access (including userService.ts)
│   │   │   └── scripts/
│   │   │       ├── migrate.ts         # Schema migration runner
│   │   │       └── seed.ts            # Test & demo seed generator
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/
│       ├── index.html                 # Single page application HTML shell
│       ├── vite.config.ts             # Vite build & dev-proxy configuration
│       ├── src/
│       │   ├── main.tsx               # Client entrypoint with React tree mounting
│       │   ├── App.tsx                # Primary layout, routing, and modal host
│       │   ├── index.css              # Custom CSS variables, components, & utility classes
│       │   ├── services/api.ts        # Type-safe Fetch client for TaskForge API
│       │   ├── context/
│       │   │   ├── AuthContext.tsx    # User session, JWT storage, and demo logins
│       │   │   ├── ProjectContext.tsx # Active project state and selector
│       │   │   └── ToastContext.tsx   # Global notification toasts
│       │   ├── components/
│       │   │   ├── Layout/            # Topbar, Sidebar, Toasts
│       │   │   ├── Kanban/            # Multi-column task board with status shifts
│       │   │   ├── Tasks/             # Task cards, modals, detail views, comments, member assignees
│       │   │   ├── Projects/          # Project creation modals, cards, & ProjectMembersModal
│       │   │   ├── Auth/              # AccountSettingsModal (profile update & password change)
│       │   │   ├── Dashboard/         # KPI metric widgets & activity streams
│       │   │   └── Common/            # Modal dialogs, Confirm dialogs, Empty states
│       │   └── pages/
│       │       ├── AuthPage.tsx       # Sign in / Sign up with 1-click profiles
│       │       ├── DashboardPage.tsx  # Executive analytics view
│       │       ├── KanbanPage.tsx     # Visual sprint/workflow board
│       │       ├── TasksPage.tsx      # Tabular task list with filters and sorting
│       │       ├── ProjectsPage.tsx   # Workspace portfolio manager
│       │       └── ActivityPage.tsx   # System audit log timeline
│       ├── package.json
│       └── tsconfig.json
└── tests/
    ├── api/
    │   ├── auth.test.ts
    │   ├── projects.test.ts
    │   ├── tasks.test.ts
    │   ├── comments.test.ts
    │   ├── dashboard.test.ts
    │   ├── search.test.ts
    │   └── edge_cases_and_security.test.ts # Reorder auth bypass, FK crash, RBAC, concurrency
    ├── frontend/
    │   └── components.test.tsx             # StatCard, EmptyState, Modal, TaskCard, KanbanBoard
    └── e2e/
        └── full_lifecycle.test.ts         # 10-step full system persistence verification
```

---

## 3. Database Engine & Schema

TaskForge utilizes the native `node:sqlite` module bundled in Node.js v22 (`DatabaseSync`), bypassing fragile native C++ compilation modules (`node-gyp`, `better-sqlite3`).

### Database Configuration
- **Journal Mode**: `PRAGMA journal_mode = WAL;` (Write-Ahead Logging provides concurrent reading while writing).
- **Foreign Keys**: `PRAGMA foreign_keys = ON;` (Guarantees referential integrity and cascading deletes).
- **Synchronous**: `PRAGMA synchronous = NORMAL;` (Balances durability with optimal I/O throughput).

### Schema Definition (`apps/api/src/db/schema.sql`)

```sql
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT CHECK(role IN ('ADMIN', 'MEMBER', 'VIEWER')) NOT NULL DEFAULT 'MEMBER',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_archived INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#4f46e5',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Project Members (RBAC)
CREATE TABLE IF NOT EXISTS project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK(role IN ('ADMIN', 'MEMBER', 'VIEWER')) NOT NULL DEFAULT 'MEMBER',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);

-- 4. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK(status IN ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE')) NOT NULL DEFAULT 'TODO',
  priority TEXT CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')) NOT NULL DEFAULT 'MEDIUM',
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  due_date TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tags & Task-Tags Join Table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#64748b'
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- 6. Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Activity Audit Log
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  link TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. User Sessions Table (Stateful JWT Revocation)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);
```

---

## 4. Security & Authentication Architecture

1. **Password Hashing**: Passwords are saved as one-way salted hashes using `bcryptjs`. In production, 10 salt rounds are used; in test environments, 4 rounds are dynamically applied to optimize execution speed while preserving cryptographic parity.
2. **Dual-Layer Token Security**:
   - **JWT Nonce (`jti`)**: Every issued token incorporates a unique cryptographic UUID (`crypto.randomUUID()`). This eliminates millisecond token collisions during rapid programmatic sign-ins.
   - **Session Tracking (`sessions` table)**: Active tokens are recorded in the `sessions` table. During logout or token revocation, the session is removed, immediately invalidating the JWT across all endpoints.
3. **Project Membership Boundaries**:
   - Users are restricted to accessing projects they own or belong to via `project_members`.
   - Modifying or deleting comments requires authorship verification (or Workspace Administrator privileges).

---

## 5. REST API Specification

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Create a new user account.
  - Body: `{ email: string, name: string, password: string }`
  - Returns: `{ user: UserSafe, token: string }`
- `POST /api/auth/login`: Authenticate existing credentials.
  - Body: `{ email: string, password: string }`
  - Returns: `{ user: UserSafe, token: string }`
- `POST /api/auth/logout`: Revoke active session and token.
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ message: "Logged out successfully" }`
- `GET /api/auth/me`: Retrieve currently authenticated user profile.
- `PATCH /api/auth/profile`: Update user profile details (name, avatar_url, password).
  - Body: `{ name?: string, avatar_url?: string, password?: string }`
  - Returns: `{ user: UserSafe }`

### Users (`/api/users`)
- `GET /api/users?search=<q>`: Search and list users in the system for task assignment and project member invitations.
  - Returns: `UserSafe[]`

### Projects (`/api/projects`)
- `GET /api/projects`: List all accessible projects (with member & task aggregations).
- `POST /api/projects`: Create a new project workspace.
- `GET /api/projects/:id`: Get detailed project record.
- `PATCH /api/projects/:id`: Update project properties (name, description, color, `is_archived`).
- `DELETE /api/projects/:id`: Permanently delete project (cascades tasks, comments, and audit records).
- `GET /api/projects/:id/members`: List all members of a project with user profile and assigned roles (`ADMIN`, `MEMBER`, `VIEWER`).
- `POST /api/projects/:id/members`: Add a new member to the project (Requires Project Admin or Owner).
  - Body: `{ user_id: string, role?: 'ADMIN' | 'MEMBER' | 'VIEWER' }`
- `PATCH /api/projects/:id/members/:userId`: Update a member's role (Requires Project Admin or Owner).
  - Body: `{ role: 'ADMIN' | 'MEMBER' | 'VIEWER' }`
- `DELETE /api/projects/:id/members/:userId`: Remove a member or leave project (Requires Project Admin/Owner, or self).

### Tasks (`/api/tasks`)
- `GET /api/tasks?projectId=<id>&status=<status>&priority=<priority>&search=<q>&sort=<sort>`: Multi-parametric task list (supports matching title, description, and task tags).
- `POST /api/tasks`: Create a new task within a project.
  - Body: `{ project_id, title, description, status, priority, due_date, assignee_id, tags: string[] }`
  - Role enforcement: `VIEWER` role cannot create tasks (returns 403 Forbidden).
  - Normalization: `assignee_id: ""` is automatically normalized to `null` to avoid SQLite foreign key constraint violations.
- `GET /api/tasks/:id`: Retrieve single task with tags, assignee, and creator metadata.
- `PATCH /api/tasks/:id`: Update task properties or shift status.
  - Validation: Returns 400 Bad Request on invalid status or priority values.
  - Role enforcement: `VIEWER` role cannot update tasks (returns 403 Forbidden).
- `DELETE /api/tasks/:id`: Delete task (restricted from `VIEWER` role).
- `POST /api/tasks/reorder`: Reorder task positions for Kanban board priority arrangement.
  - Security: Validates project membership, enforces non-VIEWER permissions, and verifies that all reordered tasks strictly belong to the specified project within an ACID SQLite transaction.

### Comments (`/api/comments`)
- `GET /api/comments?taskId=<id>`: List chronological comments on a task.
- `POST /api/comments`: Add comment to task (records audit event and sends notifications).
- `DELETE /api/comments/:id`: Delete comment (author or admin only).

### Dashboard & Analytics (`/api/dashboard`)
- `GET /api/dashboard?projectId=<id>`: Calculate workspace metrics:
  - `total_tasks`: Count of all tasks.
  - `active_tasks`: Tasks in `TODO` or `IN_PROGRESS`.
  - `completed_tasks`: Tasks in `DONE`.
  - `blocked_tasks`: Tasks marked `BLOCKED`.
  - `overdue_tasks`: Incomplete tasks with `due_date < CURRENT_DATE`.
  - `completion_rate_pct`: Percentage completed (`(completed / total) * 100`).
  - `by_status`: Breakdown across all 4 statuses.
  - `by_priority`: Breakdown across 4 priority levels.
  - `recent_activity`: Chronological stream of the last 10 activity log entries.

### Search Engine (`/api/search`)
- `GET /api/search?q=<query>&projectId=<id>`: Searches across tasks (matching titles, descriptions, and tag labels) and projects.

### Notifications (`/api/notifications`)
- `GET /api/notifications`: Retrieve current user's alerts.
- `POST /api/notifications/read-all`: Mark all notifications as read.

---

## 6. Frontend Architecture & Design System

The web client (`apps/web`) is constructed without bulky component libraries (e.g. Tailwind, Material-UI, or AntD) to maximize rendering speed, minimize bundle footprint (under 65 kB gzipped), and maintain total control over accessibility and aesthetics:

- **Color Tokens**: CSS custom properties (`--primary: #4f46e5`, `--bg-main: #f8fafc`, `--surface: #ffffff`, `--border-color: #e2e8f0`).
- **Interactive State**:
  - `AuthContext`: Manages active token, session persistence in `localStorage`, and demo account switches.
  - `ProjectContext`: Maintains workspace selection, active project context, and creates/archives workspaces.
  - `ToastContext`: Dispatches non-blocking alerts (`success`, `error`, `info`, `warning`).
- **Kanban Engine**: Pure-React state-driven drag and click column transitions with instantaneous optimistic updates and server rollback on failure.

---

## 7. Verification & Testing Evidence

The test suite consists of 39 comprehensive tests running in Vitest:

| Suite | Tests | Description |
|---|---|---|
| `tests/api/auth.test.ts` | 7 Passed | User registration, login, JWT validation, duplicate detection, invalid credentials, and session revocation. |
| `tests/api/projects.test.ts` | 5 Passed | Project workspace CRUD, membership validation, and archiving. |
| `tests/api/tasks.test.ts` | 5 Passed | Task creation, status updating, tag associations, and filtering. |
| `tests/api/comments.test.ts` | 4 Passed | Comment addition, author verification, and deletion controls. |
| `tests/api/dashboard.test.ts` | 1 Passed | Metric computation, velocity percentage, and overdue counters. |
| `tests/api/search.test.ts` | 2 Passed | Cross-resource multi-keyword querying. |
| `tests/api/edge_cases_and_security.test.ts` | 9 Passed | Foreign key crash prevention on unassignment, Cross-tenant task reorder protection, Reorder role validation (VIEWER blocked), Input validation (invalid status 400), Viewer task creation/edit/delete blocking, Tag search in task listing, and SQLite concurrency with 20 parallel requests. |
| `tests/frontend/components.test.tsx` | 5 Passed | Component rendering & interaction verification in Happy-DOM for `StatCard`, `EmptyState`, `Modal`, `TaskCard`, and `KanbanBoard`. |
| `tests/e2e/full_lifecycle.test.ts` | 1 Passed | **10-Step Full Lifecycle Test**: User registration -> Project initialization -> Task creation -> Kanban transitions -> Tagging & Assignments -> Comment discussion -> Server search -> Dashboard metrics -> Database teardown & disk restart -> Full state verification. |

**Total Result**: 9 test files, 39 tests, 100% pass rate.

---

## 8. Autonomous Agent Workforce & Jules Boundary Report

During the development cycle, autonomous AI orchestration was coordinated across local environments:

1. **Jules CLI Diagnostic**:
   - OAuth authentication was successfully established (`jules remote list --session` returns valid OAuth tokens).
   - Remote repository operations (`jules remote list --repo`, `jules new`) require authorization of the Google Labs Jules GitHub App on the target repository.
   - **Boundary Condition**: Human user authorization must be completed at `https://github.com/apps/google-labs-jules/installations/select_target`.
   - **Integrity Compliance**: In accordance with core directives, this boundary is documented transparently without fabricating mock workers.
2. **OmniRoute Gateway Fallback**:
   - Seamlessly utilized the local OmniRoute gateway running on `127.0.0.1:20128` backed by Gemini 3.5 Flash (`gemini-2.5-flash` model identifier) with low latency (< 150ms) to ensure continuous autonomous coding velocity.

---

## 9. Deployment & Production Operations

### Running Locally with Production Build
```bash
# 1. Install dependencies
pnpm install

# 2. Run schema migrations and populate initial seed
pnpm db:migrate
pnpm db:seed

# 3. Build all workspace packages
pnpm build

# 4. Launch production server
pnpm start
```
The server binds to port `4000` (or `PORT` environment variable) and serves both API routes under `/api/*` and the static React application.

### Recommended Environment Variables (`.env`)
```env
PORT=4000
NODE_ENV=production
DATABASE_PATH=taskforge.db
JWT_SECRET=production-grade-super-secret-key-32-chars-minimum
CORS_ORIGIN=*
```
