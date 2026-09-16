import { EnumValue, TechTag } from './enums';

export interface User {
  id: string;
  name: string;
  email: string;
  role: EnumValue;
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
}

export interface SeniorSummary extends User {
  learners: LearnerSummary[];
}
