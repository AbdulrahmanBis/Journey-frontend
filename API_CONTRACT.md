# Journey — Backend API Contract

Base URL: `http://localhost:3000/api`  
All endpoints expect/return `Content-Type: application/json`.  
All protected endpoints require `Authorization: Bearer <jwt>`.

---

## Auth

### `POST /api/auth/login`
Request: `{ email, password }`  
Response: `{ user: User, token: string }`

### `POST /api/auth/signup`
Request: `{ name, email, password }`  
Response: `{ user: User, token: string }`
> New accounts created via signup are always role `learner`.

---

## Users

### `GET /api/users`
Query params: `role?` (`admin|manager|senior|learner`), `seniorId?` (filters learners by senior)  
Response: `User[]`

### `GET /api/users/:id`
Response: `User`

### `POST /api/users`
Request: `{ name, email, password, role, seniorId? }`  
Response: `User`

### `PUT /api/users/:id`
Request: `Partial<User>` (name, email, password, role, seniorId)  
Response: `User`

### `PATCH /api/users/:id`
Request: `{ seniorId }` — for reassigning a learner to a different senior  
Response: `User`

### `DELETE /api/users/:id`
Response: `204 No Content`

---

## Journey Templates

### `GET /api/journeys`
Response: `Journey[]`

### `GET /api/journeys/:id`
Response: `Journey`

### `GET /api/journeys/:id/items`
Response: `JourneyItem[]` sorted by `order`

### `POST /api/journeys`
Request: `{ title, description, techTag, items: [{ title, description }], createdById, createdByName }`  
Response: `Journey` (backend assigns IDs and `order` to items)

### `PUT /api/journeys/:id`
Request: `{ title, description, techTag, items: [{ id?, title, description }] }`  
Response: `Journey` (full item list is replaced; existing items with `id` are updated)

### `DELETE /api/journeys/:id`
Response: `204 No Content`

---

## Exams (one per journey template)

### `GET /api/journeys/:journeyId/exam`
Response: `Exam | null` (404 or `null` body if no exam configured)

### `POST /api/journeys/:journeyId/exam`
Creates **or replaces** the journey's exam.  
Request:
```json
{
  "title": "string",
  "passingScorePercent": 70,
  "createdById": "string",
  "createdByName": "string",
  "questions": [
    {
      "id": "string (omit for new questions)",
      "type": "multiple_choice | yes_no | open",
      "prompt": "string",
      "options": ["string"] ,
      "correctOptionIndex": 0,
      "correctBoolAnswer": true
    }
  ]
}
```
Response: `Exam`

### `DELETE /api/journeys/:journeyId/exam`
Response: `204 No Content`

---

## Learner Journeys (assignments)

A **LearnerJourney** is a journey template assigned to a specific learner.  
The `LearnerJourneyView` is the fully composed shape that includes `journey`, `items` (with per-learner `progress`), `percentComplete`, `totalTimeSpentHours`, plus the attached `exam` and `examAttempt` if present.

### `GET /api/learner-journeys?learnerId=:id`
Response: `LearnerJourneyView[]`

### `GET /api/learner-journeys/:id`
Response: `LearnerJourneyView` — full composed view

### `POST /api/learner-journeys`
Request: `{ journeyId, learnerId, assignedById, assignedByName }`  
Response: `LearnerJourney`  
> Backend auto-creates a `LearnerJourneyItem` row (status: `new`) for each item in the template.

### `PATCH /api/learner-journeys/:id/status`
Request: `{ status: "new|reflect|response|completed|cancelled" }`  
Response: `LearnerJourney`

---

## Learner Journey Items

### `PATCH /api/learner-journey-items/:id/status`
Request: `{ status, timeSpentHours?, actorId }`  
Response: `LearnerJourneyItem`  
> `timeSpentHours` is required when `status = "completed"`.

### `POST /api/learner-journey-items/:id/notes`
Request: `{ message, actorId, actorName, actorRole }`  
Response: `Note`

---

## Exam Attempts

### `GET /api/learner-journeys/:learnerJourneyId/exam-attempt`
Response: `ExamAttempt | null`

### `POST /api/learner-journeys/:learnerJourneyId/exam-attempt`
Submit the learner's answers. One attempt per learner-journey — returns 409 if already submitted.  
Request:
```json
{
  "examId": "string",
  "answers": [
    {
      "questionId": "string",
      "selectedOptionIndex": 0,
      "boolAnswer": true,
      "openText": "string"
    }
  ]
}
```
Response: `ExamAttempt`  
> Backend auto-marks `markedCorrect` for `multiple_choice` and `yes_no` questions on submit.

### `PATCH /api/exam-attempts/:id/grade`
Request: `{ marks: [{ questionId, markedCorrect }], passed: boolean, gradedById, gradedByName }`  
Response: `ExamAttempt`  
> Backend computes `scorePercent` from the marks array.

---

## Dashboards (composed views for the tree UI)

### `GET /api/dashboard/senior/:seniorId`
Returns each learner assigned to this senior, with their full journey list embedded.  
Response: `LearnerSummary[]`

```ts
interface LearnerSummary extends User {
  journeys: LearnerJourneyView[];
}
```

### `GET /api/dashboard/manager`
Returns all seniors with their learners and journeys nested.  
Response: `SeniorSummary[]`

```ts
interface SeniorSummary extends User {
  learners: LearnerSummary[];
}
```

---

## Metrics

All metrics endpoints compute their aggregations server-side and return ready-to-render shapes.

### `GET /api/metrics/learner/:id`
Response: `LearnerMetrics`

```ts
interface LearnerMetrics {
  learnerId: string;
  learnerName: string;
  totalJourneys: number;
  activeJourneys: number;
  completedJourneys: number;
  cancelledJourneys: number;
  totalItems: number;
  completedItems: number;
  itemCompletionPercent: number;   // 0-100
  totalHours: number;
  avgHoursPerCompletedItem: number | null;
  exams: ExamStats;
  hoursByDay: HoursBucket[];       // last 14 days
  hoursByMonth: HoursBucket[];     // last 6 months
  hoursByQuarter: HoursBucket[];   // last 4 quarters
}
```

### `GET /api/metrics/senior/:id`
Response: `GroupMetrics`

```ts
interface GroupMetrics {
  learnerCount: number;
  totalJourneys: number;
  activeJourneys: number;
  completedJourneys: number;
  totalHours: number;
  avgCompletionPercent: number;
  exams: ExamStats;
  hoursByDay: HoursBucket[];
  hoursByMonth: HoursBucket[];
  hoursByQuarter: HoursBucket[];
  perLearner: {
    learnerId: string;
    learnerName: string;
    activeJourneys: number;
    completedJourneys: number;
    totalHours: number;
    avgCompletionPercent: number;
    examsPassed: number;
    examsFailed: number;
  }[];
}
```

### `GET /api/metrics/org`
Response: `OrgMetrics` (extends `GroupMetrics`)

```ts
interface OrgMetrics extends GroupMetrics {
  seniorCount: number;
  perSenior: {
    seniorId: string;
    seniorName: string;
    learnerCount: number;
    totalHours: number;
    avgCompletionPercent: number;
    examsPassed: number;
    examsFailed: number;
  }[];
}
```

### Shared types

```ts
interface ExamStats {
  configured: number;        // journeys that have an exam attached
  taken: number;             // attempts submitted or graded
  underReview: number;       // status = 'submitted'
  graded: number;
  passed: number;
  failed: number;
  avgScorePercent: number | null;
}

interface HoursBucket {
  label: string;   // e.g. "Jun 28", "Jun '25", "Apr–Jun '25"
  hours: number;
}
```

---

## Data Models

```ts
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'senior' | 'learner';
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
  status: 'new' | 'reflect' | 'response' | 'completed' | 'cancelled';
  startedAt?: string;
  completedAt?: string;
}

interface LearnerJourneyItem {
  id: string;
  learnerJourneyId: string;
  journeyItemId: string;
  status: 'new' | 'reflect' | 'response' | 'completed' | 'cancelled';
  timeSpentHours?: number;
  updatedAt: string;
  notes: Note[];
}

interface Note {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
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
  examId: string;
  order: number;
  type: 'multiple_choice' | 'yes_no' | 'open';
  prompt: string;
  options?: string[];
  correctOptionIndex?: number;
  correctBoolAnswer?: boolean;
}

interface ExamAttempt {
  id: string;
  learnerJourneyId: string;
  examId: string;
  status: 'submitted' | 'graded';
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

// Composed view returned by GET /api/learner-journeys/:id
interface LearnerJourneyView extends LearnerJourney {
  journey: Journey;
  items: JourneyItemView[];
  percentComplete: number;          // 0–100, computed server-side
  totalTimeSpentHours: number;      // sum of all completed items
  exam?: Exam;                      // present if the journey template has an exam
  examAttempt?: ExamAttempt;        // present once the learner has submitted
}

interface JourneyItemView extends JourneyItem {
  progress: LearnerJourneyItem;
}
```

---

## Error responses

All errors follow:
```json
{ "message": "Human-readable description of what went wrong" }
```

Common codes:
- `400` — validation error (missing field, invalid value)
- `401` — missing or invalid token
- `403` — authenticated but not authorised (wrong role or wrong team)
- `404` — resource not found
- `409` — conflict (duplicate email, exam already submitted, already assigned)
