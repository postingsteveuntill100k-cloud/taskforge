# TaskForge Autonomous Engineering Workforce — AGENTS.md

> **Notice to Autonomous Agents**: This document outlines universal repository architecture, operational conventions, role ownership, and verification rules for the TaskForge codebase. All agents operating on this repository must adhere strictly to these principles.

---

## 1. Architecture Overview

TaskForge is a full-stack, enterprise-grade task and project management monorepo.

```
taskforge/
├── apps/
│   ├── api/                  # Express + TypeScript backend on port 4000
│   │   ├── src/
│   │   │   ├── middleware/   # Auth, audit, error handling, rate limiting
│   │   │   ├── routes/       # Auth, projects, tasks, comments, dashboard, search, audit
│   │   │   ├── services/     # Business logic, taskService, subtaskService
│   │   │   ├── db.ts         # SQLite schema, transactions, migrations
│   │   │   └── index.ts      # Server entrypoint
│   └── web/                  # React 18 + Vite + Tailwind frontend
│       ├── src/
│       │   ├── components/   # KanbanBoard, TaskCard, TaskDetailModal, SubtaskList
│       │   ├── context/      # AuthContext, NotificationContext
│       │   └── api/          # Typed API client
├── packages/
│   └── shared/               # Shared TypeScript types, schemas, and validators
├── tests/
│   ├── api/                  # Backend Vitest suites (auth, projects, tasks, subtasks)
│   ├── frontend/             # React component tests (Kanban, modals, checklist)
│   └── e2e/                  # Full 10-step lifecycle verification
├── taskforge.db              # SQLite development database
├── vitest.config.ts          # Vitest testing configuration
└── package.json              # Monorepo workspaces
```

---

## 2. Persistent Role-Owned Workers

Every worker identity owns a distinct domain within TaskForge. Workers do not terminate after a single task; they maintain accumulated knowledge across physical execution sessions:

| Worker ID | Assigned Role | Domain Ownership | Responsibilities |
| :--- | :--- | :--- | :--- |
| `jules-dev-01` | **Primary Development Owner** | Core Backend & Evolution | API endpoints, business logic, DB schema migrations, service layers |
| `jules-dev-02` | **Secondary Development** | Integrations & Sub-features | Background jobs, export/import utilities, parallel workstreams |
| `jules-ui-01` | **Frontend / UX Owner** | React & Web Client | Components, UI polish, responsive layout, modals, client state |
| `jules-test-01` | **Testing / QA Specialist** | Quality Assurance | Vitest suites, edge case verification, E2E lifecycle workflows |
| `jules-security-01` | **Security Auditor** | Security & Auth | Password hashing, JWT boundaries, RBAC permissions, audit trails |
| `jules-critic-01` | **Code Review & Quality** | Critic Gate | Code quality, zero regression verification, architectural consistency |

---

## 3. Testing and Verification Rules

1. **Test Runner**:
   - Run tests with: `pnpm test` (or `npx vitest run`).
   - Every feature or bug fix must include or update corresponding tests in `tests/`.
2. **Zero Fake Success**:
   - Never report tests passed unless they actually run and exit with code 0.
   - All 15 test suites (66+ tests) must pass cleanly.
3. **Database Integrity**:
   - Database operations in `apps/api/src/db.ts` use SQLite transactions.
   - Never run raw destructive operations (`DROP TABLE`, `TRUNCATE`) in production code.

---

## 4. Git and Commit Conventions

- Use conventional commits:
  - `feat: <description>` for new capabilities
  - `fix: <description>` for bug repairs
  - `test: <description>` for test additions
  - `refactor: <description>` for non-functional code improvements
- Maintain non-destructive Git workflows:
  - Do not force-push (`git push --force`) to `main`.
  - Rebase or merge cleanly.

---

## 5. Checkpoints and Continuity Protocol

When approaching context exhaustion or completing a work item:
1. Update durable state files in `.agent/checkpoints/<worker_id>.json`.
2. Ensure `next_action` clearly states the exact next step for the workstream.
3. Preserve accumulated knowledge so subsequent execution sessions continue seamlessly.
