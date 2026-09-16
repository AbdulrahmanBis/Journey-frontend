# Journey — IT Onboarding Quest Log (Angular Frontend)

Angular 18 standalone-component SPA. All data comes from the Spring Boot backend at `http://localhost:3000/api`.

---

## Quick start

```bash
npm install
npm start        # ng serve -o  →  http://localhost:4200
```

**The backend must be running at `http://localhost:3000/api` before you open the app.**
See `API_CONTRACT.md` for the full endpoint specification.

To change the base URL for a different environment, edit one line:

```ts
// src/app/core/services/api.config.ts
export const API_BASE = 'http://localhost:3000/api';
```

---

## Authentication

Login calls the backend, which returns `{ user, token }`. The token is stored in `localStorage`
under `ioj_token` and attached to every subsequent request as `Authorization: Bearer <token>` via a
functional HTTP interceptor (`auth.interceptor.ts`). The current user is cached under `ioj_user` so
the session survives a refresh.

Role checks compare **numeric codes**, not strings — `auth.hasRole(RoleCode.Manager, RoleCode.Admin)`.

---

## Enum-backed values

Every status, role and question type arrives from the API as a triple:

```ts
interface EnumValue { code: number; english: string; arabic: string; }
```

- The **database stores only the `code`** (1001-based). Requests send back just the code.
- **Display text comes from the triple**, not from the i18n files — render it with
  `LanguageService.label(value)` so it follows the active language. Adding a new status means
  editing the backend enum only.
- **CSS keys off a local slug**, never the server text: `statusSlug()` / `roleSlug()` in
  `core/models/enums.ts` drive the `--status-*` variables and `.role-*` classes, so styling
  survives relabelling or an Arabic switch.
- Exam option choices are 1001-based too (`1001` = first option). Convert at the UI boundary with
  `optionCodeFor(index)` / `optionIndexOf(code)`.

---

## Internationalisation (English / Arabic + RTL)

Built on **ngx-translate v18**.

```
src/assets/i18n/en.json
src/assets/i18n/ar.json
```

- Templates: `{{ 'USER.FULL_NAME' | translate }}`; with params:
  `{{ 'DASHBOARD.GREETING' | translate: { name: firstName } }}`
- Component code (toasts, validation): `translate.instant('USER.CREATED')`
- Any component whose template uses the pipe must list `TranslatePipe` in its standalone `imports`.
- `core/services/language.service.ts` owns the active language, sets `lang` + `dir` on `<html>`,
  and persists the choice under `ioj_lang`. The navbar has the toggle.
- RTL overrides live in a `[dir="rtl"]` block at the bottom of `src/styles.scss` — only the rules
  that hard-code a physical side need them; flex/grid mirrors on its own. `.mono` is pinned to
  `direction: ltr` so ids, numbers and timestamps stay readable.

> Keep both files at **identical key sets**. A key present in one and missing from the other renders
> as the raw `SECTION.KEY` string on screen, with no build error.

---

## Project structure

```
src/app/
  core/
    models/
      enums.ts          EnumValue, RoleCode, StatusCode, QuestionTypeCode,
                        AttemptStatusCode, slugs + option-code helpers
      models.ts         User, Journey, Exam, LearnerJourneyView, …
      metrics.ts        LearnerMetrics, GroupMetrics, OrgMetrics, …
    services/
      api.config.ts     API_BASE constant
      auth.interceptor.ts  JWT Bearer interceptor + TokenStore helper
      auth.service.ts   login / signup / logout / session restore
      language.service.ts  active language, <html lang|dir>, enum label picker
      user.service.ts   /users CRUD
      journey.service.ts  journey templates + items CRUD
      assignment.service.ts  learner-journeys, item status, notes, dashboards
      exam.service.ts   exam template CRUD + attempt submit/grade
      metrics.service.ts  /metrics/learner, /metrics/senior, /metrics/org
      toast.service.ts  in-memory notification queue
    guards/
      guards.ts         authGuard, roleGuard(codes), guestGuard
  shared/components/
      navbar              role-aware sidebar nav + language toggle
      status-badge        colored status pill (label from the API triple)
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

## Notes

The composed `LearnerJourneyView` returned by `/learner-journeys/:id` now embeds `exam` and
`examAttempt`, so the quest log and exam screens no longer need separate lookups.

This project lives under OneDrive, which intermittently locks build output: `ng build` can finish
compiling and then fail with `EPERM: rmdir dist/...`. That is a lock artifact, not a code error —
clear `dist` and re-run.
