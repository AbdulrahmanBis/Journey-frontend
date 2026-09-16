# Journey — Backend API Contract

Base URL: `http://localhost:3000/api`
All endpoints expect/return `Content-Type: application/json`.
All protected endpoints require `Authorization: Bearer <jwt>`.

---

## Enum-backed values

Every status, role and question type is **stored in the database as an integer code starting at 1001**.

- **In responses** the server sends the full triple so the client can render either language without its own lookup:
  ```json
  { "code": 1004, "english": "Learner", "arabic": "متعلم" }
  ```
- **In requests** the client sends only the `code` (e.g. `"status": 1004`).

An unknown code is answered with `400`, never a `500`.

### UserRole
| Code | English | Arabic |
|---|---|---|
| 1001 | Admin | مدير النظام |
| 1002 | Manager | مدير |
| 1003 | Senior | خبير |
| 1004 | Learner | متعلم |

### ItemStatus — used for both a learner-journey and each item in it
| Code | English | Arabic |
|---|---|---|
| 1001 | new | جديد |
| 1002 | reflect | راجع |
| 1003 | response | إجابة |
| 1004 | completed | مكتمل |
| 1005 | cancelled | ملغي |

### ExamAttemptStatus
| Code | English | Arabic |
|---|---|---|
| 1001 | draft | مسودة |
| 1002 | submitted | تم الإرسال |
| 1003 | graded | تم التصحيح |

### ExamQuestionType
| Code | English | Arabic |
|---|---|---|
| 1001 | Multiple choice | اختيار من متعدد |
| 1002 | Yes / No | نعم / لا |
| 1003 | Open question | سؤال مفتوح |

---

## Auth

### `POST /api/auth/login`
Request: `{ email, password }`
Response: `{ user: User, token: string }`

### `POST /api/auth/signup`
Request: `{ name, email, password }`
Response: `{ user: User, token: string }`
> New accounts created via signup are always role `Learner` (1004).

---

## Users

### `GET /api/users`
Query params: `role?` (accepts the **code** `1003` or the English name `Senior`), `seniorId?`
Response: `User[]`

### `GET /api/users/:id`
Response: `User`

### `POST /api/users`
Request: `{ name, email, password, role: number, seniorId? }` — `role` is the code
Response: `User`

### `PUT /api/users/:id`
Request: `{ name?, email?, password?, role?: number, seniorId? }`
Response: `User`

### `PATCH /api/users/:id`
Request: `{ seniorId }` — reassign a learner to a different senior
Response: `User`

### `DELETE /api/users/:id`
Response: `204 No Content`

---

## Journey Templates

### `GET /api/journeys` → `Journey[]`
### `GET /api/journeys/:id` → `Journey`
### `GET /api/journeys/:id/items` → `JourneyItem[]` sorted by `order`

### `POST /api/journeys`
Request: `{ title, description, techTag, items: [{ title, description }], createdById, createdByName }`
Response: `Journey`

### `PUT /api/journeys/:id`
Request: `{ title, description, techTag, items: [{ id?, title, description }] }`
Response: `Journey` (item list is replaced wholesale)

### `DELETE /api/journeys/:id` → `204 No Content`

---

## Exams (one per journey template)

### `GET /api/journeys/:journeyId/exam`
Response: `Exam`, or an empty body when no exam is configured.

### `POST /api/journeys/:journeyId/exam`
Creates the exam, or **updates it in place** when one already exists — learners' past attempts are preserved. Questions are replaced wholesale.

```json
{
  "title": "string",
  "passingScorePercent": 70,
  "createdById": "string",
  "createdByName": "string",
  "questions": [
    {
      "id": "string (omit for new questions)",
      "type": 1001,
      "prompt": "string",
      "options": ["string"],
      "correctOptionIndex": 0,
      "correctBoolAnswer": true
    }
  ]
}
```
Response: `Exam`

### `DELETE /api/journeys/:journeyId/exam` → `204 No Content`

---

## Learner Journeys (assignments)

### `GET /api/learner-journeys?learnerId=:id` → `LearnerJourneyView[]`
### `GET /api/learner-journeys/:id` → `LearnerJourneyView`

### `POST /api/learner-journeys`
Request: `{ journeyId, learnerId, assignedById, assignedByName }`
Response: `LearnerJourneyView`
> Auto-creates a `LearnerJourneyItem` (status 1001) for each template item.
> `409` if this learner already has that journey.

### `PATCH /api/learner-journeys/:id/status`
Request: `{ status: 1004 }`
Response: `LearnerJourneyView`

---

## Learner Journey Items

### `PATCH /api/learner-journey-items/:id/status`
Request: `{ status: number, timeSpentHours?, actorId }`
Response: `LearnerJourneyItem`
> `timeSpentHours` is required (and must be > 0) when `status = 1004` (completed).

### `POST /api/learner-journey-items/:id/notes`
Request: `{ message, actorId, actorName, actorRole: number }`
Response: `Note`

---

## Exam Attempts

### `GET /api/learner-journeys/:learnerJourneyId/exam-attempt`
Response: `ExamAttempt`, or an empty body if not attempted.

### `POST /api/learner-journeys/:learnerJourneyId/exam-attempt`
One attempt per learner-journey — `409` if already submitted.
```json
{
  "examId": "string",
  "answers": [
    { "questionId": "string", "selectedOptionIndex": 0, "boolAnswer": true, "openText": "string" }
  ]
}
```
Response: `ExamAttempt`
> `markedCorrect` is auto-set for multiple-choice and yes/no questions on submit.
> `400` if an answer refers to a question that isn't on the exam.

### `PATCH /api/exam-attempts/:id/grade`
Request: `{ marks: [{ questionId, markedCorrect }], passed: boolean, gradedById, gradedByName }`
Response: `ExamAttempt`
> `scorePercent` is computed server-side. `400` if the attempt has no answers.

---

## Dashboards

### `GET /api/dashboard/senior/:seniorId` → `LearnerSummary[]`
### `GET /api/dashboard/manager` → `SeniorSummary[]`

---

## Metrics

### `GET /api/metrics/learner/:id` → `LearnerMetrics`
### `GET /api/metrics/senior/:id` → `GroupMetrics`
### `GET /api/metrics/org` → `OrgMetrics`

`exams` is computed from real attempt data (it previously returned hardcoded zeros).

---

## Data Models

```ts
interface EnumValue {
  code: number;
  english: string;
  arabic: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: EnumValue;
  seniorId?: string;   // learner only
  createdAt: string;   // ISO 8601
}

interface Journey {
  id: string;
  title: string;
  description: string;
  techTag: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

interface JourneyItem {
  id: string;
  journeyId: string;
  title: string;
  description: string;
  order: number;
}

interface LearnerJourney {
  id: string;
  journeyId: string;
  learnerId: string;
  assignedById: string;
  assignedByName: string;
  assignedAt: string;
  status: EnumValue;
  startedAt?: string;
  completedAt?: string;
}

interface LearnerJourneyItem {
  id: string;
  learnerJourneyId: string;
  journeyItemId: string;
  status: EnumValue;
  timeSpentHours?: number;
  updatedAt: string;
  notes: Note[];
}

interface Note {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: EnumValue;
  message: string;
  timestamp: string;
}

interface Exam {
  id: string;
  journeyId: string;
  title: string;
  passingScorePercent: number;
  createdById: string;
  createdByName: string;
  updatedAt: string;
  questions: ExamQuestion[];
}

interface ExamQuestion {
  id: string;
  type: EnumValue;
  prompt: string;
  options?: string[];
  correctOptionIndex?: number;
  correctBoolAnswer?: boolean;
}

interface ExamAttempt {
  id: string;
  learnerJourneyId: string;
  examId: string;
  status: EnumValue;
  answers: ExamAnswer[];
  submittedAt?: string;
  gradedAt?: string;
  gradedById?: string;
  gradedByName?: string;
  scorePercent?: number;
  passed?: boolean;
}

interface ExamAnswer {
  questionId: string;
  selectedOptionIndex?: number;
  boolAnswer?: boolean;
  openText?: string;
  markedCorrect?: boolean;
}

// Composed view returned by the learner-journey endpoints
interface LearnerJourneyView extends LearnerJourney {
  journey: Journey;
  items: JourneyItemView[];
  percentComplete: number;          // 0–100, computed server-side
  totalTimeSpentHours: number;      // sum of completed items
  exam?: Exam;                      // present if the template has an exam
  examAttempt?: ExamAttempt;        // present once the learner has submitted
}

interface JourneyItemView extends JourneyItem {
  progress: LearnerJourneyItem;
}

interface LearnerSummary {
  id: string;
  name: string;
  email: string;
  role: EnumValue;
  seniorId?: string;
  createdAt: string;
  journeys: LearnerJourneyView[];
}

interface SeniorSummary {
  id: string;
  name: string;
  email: string;
  role: EnumValue;
  createdAt: string;
  learners: LearnerSummary[];
}
```

---

## Error responses

All errors follow:
```json
{ "message": "Human-readable description of what went wrong" }
```

Common codes:
- `400` — validation error (missing field, invalid value, unknown enum code)
- `401` — missing or invalid token
- `403` — authenticated but not authorised
- `404` — resource not found
- `409` — conflict (duplicate email, exam already submitted, already assigned)
