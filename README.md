# ⚡ TaskForge

> **High-Performance Autonomous SaaS Project & Task Management Platform**  
> Built with modern TypeScript, Express, React 18, Vite, and Node 22's native relational SQLite engine (`node:sqlite`).

[![CI Tests](https://img.shields.io/badge/Tests-25%2F25%20Passed-10b981.svg?style=flat-square)](https://github.com/postingsteveuntill100k-cloud/taskforge)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg?style=flat-square)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-v22.23.1-417e38.svg?style=flat-square)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

---

## 🎯 Overview

**TaskForge** is an enterprise-grade project workspace and task execution engine designed for agile engineering teams and autonomous workflows. It provides a fluid user experience featuring interactive Kanban boards, multi-parametric filtering tables, live audit activity streams, metrics dashboards, server-backed search, and multi-tenant project isolation.

---

## ✨ Key Features

- **Interactive Kanban Board**: Drag-free intuitive status shifting (`TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`) with real-time updates and quick task creation.
- **Advanced Task Management**: Full CRUD, priority levels (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), target due dates, custom tags, and team assignees.
- **Workspace & Project Isolation**: Multiple concurrent workspaces with archiving, member counters, and role-based permissions (`ADMIN`, `MEMBER`, `VIEWER`).
- **Comprehensive Audit Log**: Real-time event logging capturing project creations, task modifications, status movements, and comments.
- **Collaborative Comments**: Real-time threaded comments with authorship validation and deletion permissions.
- **Executive Analytics Dashboard**: Instant calculation of total tasks, completion rates, velocity metrics, status distributions, and overdue warnings.
- **Global Server-Backed Search**: Cross-field querying across tasks (title, description, status, priority, tags) and projects.
- **Built-in In-App Notification Center**: Instant unread badges and batch read capabilities.
- **Instant 1-Click Demo Profiles**: Pre-seeded demo credentials for instant evaluation (`Sarah Connor`, `Alex Chen`, `Elena Rostova`).

---

## 🏗️ Architecture & Tech Stack

```
taskforge/
├── apps/
│   ├── api/             # Backend REST API (Node 22, Express, node:sqlite, JWT, bcrypt)
│   └── web/             # Modern Frontend (React 18, Vite, Lucide Icons, Pure CSS System)
├── packages/
│   └── shared/          # Shared TypeScript models, DTOs, and interface contracts
├── tests/
│   ├── api/             # Unit and module tests (auth, projects, tasks, comments, search, dashboard)
│   └── e2e/             # 10-step full lifecycle end-to-end integration test
└── docs/
    └── PROJECT_GUIDE.md # Exhaustive technical architecture and deployment manual
```

- **Backend**: Node.js v22.23.1, Express, `node:sqlite` (`DatabaseSync` with Write-Ahead Logging & Foreign Keys enabled).
- **Authentication**: JWT authentication with unique cryptographic nonces (`jti`) and `sessions` table tracking.
- **Frontend**: React 18, Vite 6, TypeScript 5.7, Lucide Icons, zero-dependency design system.
- **Monorepo**: pnpm workspaces with clean package boundaries.
- **Testing**: Vitest + Supertest, covering 25 test specifications with 100% pass rate.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: >= 22.0.0 (Native `node:sqlite` support)
- **pnpm**: >= 9.0.0

### 2. Installation
```bash
git clone https://github.com/postingsteveuntill100k-cloud/taskforge.git
cd taskforge
pnpm install
```

### 3. Database Setup & Seeding
```bash
# Run relational database schema migration and populate sample users/projects
pnpm db:migrate
pnpm db:seed
```

### 4. Build Monorepo
```bash
# Builds shared contracts, web frontend, and api backend in dependency order
pnpm build
```

### 5. Run Development Servers
```bash
# Starts both Backend (port 4000) and Frontend Vite dev server (port 5173) concurrently
pnpm dev
```

### 6. Run Production Server
```bash
# Production server serves both API routes and static React frontend on port 4000
pnpm start
```
Visit `http://localhost:4000` in your browser.

---

## 🧪 Testing

TaskForge includes an exhaustive suite of 25 automated tests:

```bash
# Run all 25 test specifications (unit, api, and e2e integration)
pnpm test

# Run API module tests only
pnpm test:api

# Run 10-Step Full Lifecycle End-to-End Test
pnpm test:e2e
```

### Test Coverage Highlights
- ✅ **Authentication**: Registration, Login, Duplicate handling, Invalid password rejection, Token verification, Logout session invalidation.
- ✅ **Projects**: Creation, Update, Retrieval, Archiving, Project membership isolation.
- ✅ **Tasks**: Project-scoped creation, Status changes, Priority assignment, Due dates, Tagging, Soft reordering.
- ✅ **Comments**: Creation, Task linkage, Authorship boundary enforcement, Deletion.
- ✅ **Dashboard**: Metric aggregation, Velocity percentage, Status breakdowns, Recent events.
- ✅ **Search Engine**: Multi-field querying, Keyword filtering, Project filtering.
- ✅ **10-Step E2E Lifecycle**: Real SQLite disk persistence, account registration, project creation, task workflow transitions, comment threads, search queries, dashboard analytics, database restart, and data verification.

---

## 🔑 Demo Credentials

When running locally, select any profile on the sign-in screen or use:

| Role | Name | Email | Password |
|---|---|---|---|
| **Admin** | Sarah Connor | `admin@taskforge.dev` | `password123` |
| **Member** | Alex Chen | `alex@taskforge.dev` | `password123` |
| **Member** | Elena Rostova | `elena@taskforge.dev` | `password123` |

---

## 🛡️ License

MIT License © 2026 TaskForge Contributors.
