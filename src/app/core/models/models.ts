import { EnumValue, TechTag } from './enums';

/**
 * A department. `english` / `arabic` deliberately match the enum triple, so the same
 * LanguageService.label() helper renders it in the current language.
 */
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
}

/** A reusable training template, e.g. "AWS DevOps Fundamentals". */
export interface Journey {
  id: string;
  title: string;
  description: string;
  techTag: TechTag;
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
}

export interface LearnerSummary extends User {
  journeys: LearnerJourneyView[];
  /** Packages grouping some of `journeys`; those journeys are in `journeys` too. */
  packages?: PackageAssignment[];
}

// ─── Packages ───────────────────────────────────────────────────────────────────

/** A named, ordered bundle of existing journeys. */
export interface JourneyPackage {
  id: string;
  title: string;
  description?: string;
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

export interface CatalogDetail {
  entry: CatalogEntry;
  syllabus: SyllabusEntry[];
  reviewerName?: string;
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

export interface SeniorSummary extends User {
  learners: LearnerSummary[];
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
