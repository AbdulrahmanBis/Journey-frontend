import { EnumValue, TechTag } from './enums';

/**
 * A department. `english` / `arabic` deliberately match the enum triple, so the same
 * LanguageService.label() helper renders it in the current language.
 */
/** Proof of a completed journey (exam passed, if any) or package; see CertificateService on the backend. */
export interface Certificate {
  id: string;
  code: string;
  /** CatalogTypeCode: journey or package. */
  type: EnumValue;
  title: string;
  learnerId: string;
  learnerName: string;
  department?: Department;
  learnerJourneyId?: string;
  packageAssignmentId?: string;
  examScorePercent?: number;
  hours: number;
  reviewerName?: string;
  /** A package's completed journeys, in order. */
  journeys?: string[];
  completedAt: string;
  issuedAt: string;
}

/** A message on everyone's dashboard in its audience; see AnnouncementService on the backend. */
export interface Announcement {
  id: string;
  title: string;
  /** Rich HTML from the editor. */
  body: string;
  /** Plain-text start of the body. */
  excerpt: string;
  orgWide: boolean;
  departments: Department[];
  /** Last day on dashboards (yyyy-MM-dd). */
  showUntil: string;
  active: boolean;
  authorId?: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
}

export interface Department {
  id: string;
  english: string;
  arabic: string;
  /** Present on the departments list only. */
  memberCount?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: EnumValue;
  /** Every person belongs to exactly one department. */
  department?: Department;
  /** Set on learners only: which senior they report to for training. */
  seniorId?: string;
  createdAt: string;
  /** Intro guide version this person dismissed for good; absent if never. */
  introSeenVersion?: number;
}

/** A reusable training template, e.g. "AWS DevOps Fundamentals". */
export interface Journey {
  id: string;
  title: string;
  description: string;
  techTag: TechTag;
  /** Expected duration in days; becomes the default due date when assigned. */
  targetDays?: number | null;
  /** On the journeys list only. */
  hasExam?: boolean;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A piece of content hanging off a journey item.
 *
 * Exactly one of `url` (link / embed kinds) or `storageKey` (uploaded kinds) is set — build the
 * src for uploaded ones with `FileService.mediaUrl()`, which appends the auth token that media
 * elements cannot send as a header.
 */
export interface Attachment {
  id?: string;
  kind: EnumValue;
  label?: string;
  url?: string;
  storageKey?: string;
  mimeType?: string;
  sizeBytes?: number;
  originalName?: string;
  order?: number;
}

/**
 * One step inside a Journey template.
 *
 * `description` is rich HTML from the editor (it used to be plain text split on newlines), so it
 * must be rendered as sanitized HTML rather than line-by-line.
 */
export interface JourneyItem {
  id: string;
  journeyId: string;
  /** The unit the item belongs to. */
  unitId?: string;
  title: string;
  description: string;
  order: number;
  attachments?: Attachment[];
}

/** A note left by any actor on a specific learner's progress through one item. */
export interface Note {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: EnumValue;
  message: string;
  timestamp: string;
}

/** A Journey assigned to a specific learner — the "quest log" instance. */
export interface LearnerJourney {
  id: string;
  journeyId: string;
  learnerId: string;
  assignedById: string;
  assignedByName: string;
  assignedAt: string;
  /** YYYY-MM-DD; absent when there is no deadline. */
  dueDate?: string;
  /** Enrolled from the catalog; `assignedBy` is then the reviewer. */
  selfEnrolled?: boolean;
  status: EnumValue;
  startedAt?: string;
  completedAt?: string;
}

/** Per-learner, per-item progress: status, time spent, and its own note thread. */
export interface LearnerJourneyItem {
  id: string;
  learnerJourneyId: string;
  journeyItemId: string;
  status: EnumValue;
  timeSpentHours?: number;
  updatedAt: string;
  notes: Note[];
}

/* ----------------------------------- Exams ---------------------------------- */

export interface ExamQuestion {
  id: string;
  type: EnumValue;
  prompt: string;
  /** multiple_choice only */
  options?: string[];
  /** multiple_choice only — index into options[] */
  correctOptionIndex?: number;
  /** yes_no only */
  correctBoolAnswer?: boolean;
}

/** One exam per journey template. */
export interface Exam {
  id: string;
  journeyId: string;
  title: string;
  passingScorePercent: number;
  createdById: string;
  createdByName: string;
  updatedAt: string;
  questions: ExamQuestion[];
}

export interface ExamAnswer {
  questionId: string;
  selectedOptionIndex?: number;
  boolAnswer?: boolean;
  openText?: string;
  /** Set automatically for objective questions on submit, and by the grader for open ones. */
  markedCorrect?: boolean;
}

export interface ExamAttempt {
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

/* ----------------------------------- Units ---------------------------------- */

/** A unit as authors edit it (GET /journeys/:id/units): items with content, quiz with answers. */
export interface JourneyUnit {
  id: string;
  title: string;
  description?: string;
  order: number;
  items: JourneyItem[];
  quiz: ExamQuestion[];
}

/** A learner's unit in brief, on journey views. */
export interface UnitProgressSummary {
  learnerUnitId?: string;
  unitId: string;
  title: string;
  order: number;
  /** StatusCode — the unit carries the review workflow. */
  status: EnumValue;
  completedItems: number;
  totalItems: number;
  hasQuiz: boolean;
  quizAnswered: boolean;
  updatedAt?: string;
}

export interface OutlineItem {
  progressId: string;
  journeyItemId: string;
  title: string;
  order: number;
  status: EnumValue;
  timeSpentHours?: number;
  noteCount: number;
}

export interface OutlineUnit {
  learnerUnitId: string;
  unitId: string;
  title: string;
  description?: string;
  order: number;
  status: EnumValue;
  completedItems: number;
  totalItems: number;
  quiz?: { questionCount: number; answered: boolean; scorePercent?: number };
  /** Items done and quiz answered: the learner can send it for review. */
  readyForReview: boolean;
  notes: Note[];
  items: OutlineItem[];
}

/** A journey without an assignment, for the preview page. Learners get the first unit only and no questions. */
export interface JourneyPreview {
  journey: Journey;
  /** Content past the first unit, and every question, was left out. */
  limited: boolean;
  units: {
    id: string;
    title: string;
    description?: string;
    order: number;
    locked: boolean;
    items: JourneyItem[];
    quizQuestionCount: number;
    /** Staff only. */
    quiz?: ExamQuestion[];
  }[];
  exam?: { title: string; passingScorePercent: number; questionCount: number; questions?: ExamQuestion[] };
}

/** The journey log's left panel: structure and statuses, no item content. */
export interface JourneyOutline {
  learnerJourneyId: string;
  learnerId: string;
  learnerName: string;
  journey: Journey;
  status: EnumValue;
  percentComplete: number;
  totalTimeSpentHours: number;
  dueDate?: string;
  selfEnrolled: boolean;
  assignedById: string;
  assignedByName: string;
  units: OutlineUnit[];
  /** Absent when the journey has no exam. `open` once every unit's items and quiz are done. */
  exam?: { examId: string; title: string; open: boolean; attemptStatus?: EnumValue; scorePercent?: number; passed?: boolean };
}

/** One item's content, loaded when it is opened. */
export interface ItemContent {
  progressId: string;
  journeyItemId: string;
  learnerUnitId: string;
  unitTitle: string;
  title: string;
  description: string;
  attachments: Attachment[];
  status: EnumValue;
  timeSpentHours?: number;
  notes: Note[];
  previousProgressId?: string;
  nextProgressId?: string;
  nextTitle?: string;
  lastInUnit: boolean;
}

export interface QuizQuestion {
  id: string;
  type: EnumValue;
  prompt: string;
  options: string[];
  selectedOptionIndex?: number;
  boolAnswer?: boolean;
  /** Filled in once submitted. */
  correct?: boolean;
  correctOptionIndex?: number;
  correctBoolAnswer?: boolean;
}

export interface UnitQuiz {
  learnerUnitId: string;
  unitTitle: string;
  questions: QuizQuestion[];
  submitted: boolean;
  scorePercent?: number;
  submittedAt?: string;
}

/* --------------------------- Composed view models --------------------------- */

export interface JourneyItemView extends JourneyItem {
  progress: LearnerJourneyItem;
}

export interface LearnerJourneyView extends LearnerJourney {
  journey: Journey;
  items: JourneyItemView[];
  percentComplete: number;
  totalTimeSpentHours: number;
  /** Present only if the journey template has an exam configured. */
  exam?: Exam;
  /** Present only once the learner has submitted. */
  examAttempt?: ExamAttempt;
  /** The journey's units with this learner's status on each. */
  units?: UnitProgressSummary[];
}

// ─── Packages ───────────────────────────────────────────────────────────────────

/** A named, ordered bundle of existing journeys. */
export interface JourneyPackage {
  id: string;
  title: string;
  description?: string;
  targetDays?: number | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  journeys: { journeyId: string; title: string; techTag: string; position: number }[];
  /** Assignments not cancelled. */
  activeAssignments: number;
  /** False once the package has ever been assigned. */
  deletable: boolean;
}

export interface PackageJourneyProgress {
  learnerJourneyId: string;
  journeyId: string;
  title: string;
  techTag: string;
  position: number;
  status: EnumValue;
  percentComplete: number;
}

/** A package as one learner has it. Progress averages its journeys that aren't cancelled. */
export interface PackageAssignment {
  id: string;
  packageId: string;
  title: string;
  description?: string;
  learnerId: string;
  assignedById: string;
  assignedByName: string;
  assignedAt: string;
  dueDate?: string;
  selfEnrolled?: boolean;
  cancelledAt?: string;
  status: EnumValue;
  percentComplete: number;
  completedJourneys: number;
  totalJourneys: number;
  journeys: PackageJourneyProgress[];
}

// ─── Catalog ────────────────────────────────────────────────────────────────────

/** The signed-in learner's standing with a catalog entry (LearningStatusCode). */
export interface MyProgress {
  status: EnumValue;
  percentComplete: number;
  learnerJourneyId?: string;
  packageAssignmentId?: string;
}

/** A journey or a package on the catalog shelf. */
export interface CatalogEntry {
  /** CatalogTypeCode */
  type: EnumValue;
  id: string;
  title: string;
  description?: string;
  tags: string[];
  /** Quest items for a journey; journeys for a package. */
  itemCount: number;
  targetDays?: number;
  hasExam: boolean;
  /** A package's journeys, in order. */
  journeyTitles?: string[];
  learnerCount: number;
  createdByName?: string;
  updatedAt?: string;
  /** Absent for staff. */
  mine?: MyProgress;
}

/** A filter option and how many results it would give with the other filters applied. */
export interface Facet {
  value: string;
  label?: EnumValue;
  count: number;
}

export interface CatalogPage {
  entries: CatalogEntry[];
  total: number;
  types: Facet[];
  tags: Facet[];
  /** Empty for staff. */
  statuses: Facet[];
  /** Who reviews the learner's self-enrollments; absent when nobody can. */
  reviewerName?: string;
}

export interface SyllabusEntry {
  position: number;
  title: string;
  description?: string;
  tag?: string;
  itemCount?: number;
  journeyId?: string;
}

/** A unit in a journey's catalog outline. */
export interface SyllabusUnit {
  order: number;
  title: string;
  description?: string;
  items: SyllabusEntry[];
  quizQuestions: number;
}

export interface CatalogDetail {
  entry: CatalogEntry;
  /** A package's journeys. */
  syllabus?: SyllabusEntry[];
  /** A journey's units. */
  units?: SyllabusUnit[];
  reviewerName?: string;
}

// ─── Team dashboard ─────────────────────────────────────────────────────────────

export interface TeamKpis {
  learners: number;
  onTrack: number;
  atRisk: number;
  overdue: number;
  /** Exams to grade plus items waiting for a reviewer. */
  awaitingReview: number;
  completedThisMonth: number;
}

/** Something a staff member should act on (AttentionTypeCode). The UI writes the sentence. */
export interface AttentionItem {
  type: EnumValue;
  learnerId: string;
  learnerName: string;
  journeyTitle?: string;
  itemTitle?: string;
  link: string;
  since?: string;
  dueDate?: string;
  days?: number;
}

export interface TeamLearner {
  id: string;
  name: string;
  email: string;
  department?: Department;
  seniorId?: string;
  seniorName?: string;
  /** LearnerHealthCode */
  health: EnumValue;
  openJourneys: number;
  completedJourneys: number;
  overdueJourneys: number;
  averageProgress: number;
  current?: { learnerJourneyId: string; title: string; percentComplete: number; status: EnumValue; dueDate?: string };
  lastActivityAt?: string;
  nextDueDate?: string;
  attentionCount: number;
}

export interface TeamOverview {
  kpis: TeamKpis;
  attention: AttentionItem[];
  learners: TeamLearner[];
  /** Seniors in scope with their learner counts; empty for a Senior. */
  seniors: { id: string; name: string; learnerCount: number }[];
}

export interface LearnerSnapshot {
  learner: TeamLearner;
  attention: AttentionItem[];
}

/** Where a learner journey sits in one of the learner's packages. */
export interface PackageContext {
  packageAssignmentId: string;
  packageTitle: string;
  position: number;
  total: number;
  completedJourneys: number;
  /** Next unfinished journey (wrapping round), or absent when the rest are done. */
  nextLearnerJourneyId?: string;
  nextJourneyTitle?: string;
}

/**
 * A notification as the bell and the notifications page receive it.
 *
 * Named AppNotification rather than Notification so it cannot be confused with — or shadowed by —
 * the browser's own `Notification` global.
 *
 * `title` and `body` arrive already rendered in the active language; the template and its
 * variables stay on the server.
 */
export interface AppNotification {
  id: string;
  templateId: string;
  channel: EnumValue;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationPage {
  items: AppNotification[];
  unreadCount: number;
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}
