# Journey — IT Onboarding Quest Log (Angular Frontend)

Angular 18 standalone-component SPA. All data comes from a real REST backend at `http://localhost:3000/api`.

---

## Quick start

```bash
npm install
npm start        # ng serve -o  →  http://localhost:4200
```

**The backend must be running at `http://localhost:3000/api` before you open the app.**  
See `API_CONTRACT.md` for the full endpoint specification the backend must implement.

To change the base URL for a different environment, edit one line:

```ts
// src/app/core/services/api.config.ts
export const API_BASE = 'http://localhost:3000/api';
```

---

## Authentication

Login and signup both call the backend, which returns `{ user, token }`.  
The token is stored in `localStorage` under `ioj_token` and automatically attached to every subsequent request as `Authorization: Bearer <token>` via an Angular functional HTTP interceptor (`auth.interceptor.ts`).

The current user object is also stored in `localStorage` (`ioj_user`) so the session survives a browser refresh without needing a separate `/me` round-trip on startup.

---

## Project structure

```
src/app/
  core/
    models/
      enums.ts          UserRole, Status, QuestionType, …
      models.ts         User, Journey, Exam, LearnerJourneyView, …
      metrics.ts        LearnerMetrics, GroupMetrics, OrgMetrics, …
    services/
      api.config.ts     API_BASE constant (single place to change the URL)
      auth.interceptor.ts  JWT Bearer interceptor + TokenStore helper
      auth.service.ts   login / signup / logout / session restore
      user.service.ts   GET/POST/PUT/PATCH/DELETE /users
      journey.service.ts  journey templates + items CRUD
      assignment.service.ts  learner-journeys, item status, notes, dashboards
      exam.service.ts   exam template CRUD + attempt submit/grade
      metrics.service.ts  /metrics/learner, /metrics/senior, /metrics/org
      toast.service.ts  in-memory notification queue (no backend needed)
    guards/
      guards.ts         authGuard, roleGuard, guestGuard
  shared/
    components/
      navbar              role-aware sidebar nav
      status-badge        colored status pill
      progress-ring       SVG donut chart
      bar-chart           CSS flex bar chart for hours
      exam-grade-badge    inline 🎓 grade display
      note-thread         note list + add-note form
      confirm-dialog      yes/no modal
      toast-container     pop-up notification stack
  features/
    auth/           login, signup
    dashboard/      role-router → learner-dashboard, team-overview
    journeys/       journey-list, journey-form, journey-log, exam-form, exam-attempt
    admin/          user-list, user-form
    metrics/        metrics (role-aware: org → senior team → individual learner)
```

---

## Roles & what each role can do

| Screen | Admin | Manager | Senior | Learner |
|--------|-------|---------|--------|---------|
| Dashboard | senior+learner tree | senior+learner tree | own learners | own journeys |
| Journeys list | ✓ | ✓ | ✓ | — |
| Create/edit journey | ✓ | ✓ | ✓ | — |
| Assign journey | ✓ | ✓ | ✓ (own learners) | — |
| Create/edit exam | ✓ | ✓ | ✓ | — |
| Quest log — view | ✓ | ✓ | own learners | own journeys |
| Quest log — change status | ✓ | ✓ | ✓ | ✓ |
| Quest log — add notes | ✓ | ✓ | ✓ | ✓ |
| Override journey status | ✓ | ✓ | — | — |
| Take exam | — | — | — | ✓ |
| Grade exam | ✓ | ✓ | ✓ | — |
| User management | ✓ | ✓ | — | — |
| Metrics — own stats | ✓ | ✓ | ✓ | ✓ |
| Metrics — team drill-down | ✓ | ✓ | own team | — |
| Metrics — org overview | ✓ | ✓ | — | — |

---

## Key HTTP services summary

| Service | Endpoints used |
|---------|---------------|
| AuthService | `POST /auth/login`, `POST /auth/signup` |
| UserService | `GET/POST/PUT/PATCH/DELETE /users` |
| JourneyService | `GET/POST/PUT/DELETE /journeys`, `GET /journeys/:id/items` |
| AssignmentService | `GET/POST /learner-journeys`, `PATCH /learner-journeys/:id/status`, `PATCH /learner-journey-items/:id/status`, `POST /learner-journey-items/:id/notes`, `GET /dashboard/senior/:id`, `GET /dashboard/manager` |
| ExamService | `GET/POST/DELETE /journeys/:id/exam`, `GET/POST /learner-journeys/:id/exam-attempt`, `PATCH /exam-attempts/:id/grade` |
| MetricsService | `GET /metrics/learner/:id`, `GET /metrics/senior/:id`, `GET /metrics/org` |

Full request/response shapes for every endpoint are in **`API_CONTRACT.md`**.

---

## Notes on verification

The backend isn't running in this environment so the app will show loading spinners and network errors until your backend is up. The Angular code compiles cleanly (verified with TypeScript syntax check — no errors outside expected missing-module noise). Run `npm install && npm start` and point it at your running backend.
