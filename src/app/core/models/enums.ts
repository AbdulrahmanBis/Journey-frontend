export enum UserRole {
  Admin = 'admin',
  Manager = 'manager',
  Senior = 'senior',
  Learner = 'learner',
}

export const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.Admin]: 'Admin',
  [UserRole.Manager]: 'Manager',
  [UserRole.Senior]: 'Senior',
  [UserRole.Learner]: 'Learner',
};

/** Shared by both a Journey assignment (learner-journey) and each item within it. */
export enum Status {
  New = 'new',
  Reflect = 'reflect',
  Response = 'response',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export const STATUS_LABEL: Record<Status, string> = {
  [Status.New]: 'New',
  [Status.Reflect]: 'Reflect',
  [Status.Response]: 'Response',
  [Status.Completed]: 'Completed',
  [Status.Cancelled]: 'Cancelled',
};

/** Order used for select dropdowns and the status-cycle control. */
export const STATUS_ORDER: Status[] = [
  Status.New,
  Status.Reflect,
  Status.Response,
  Status.Completed,
  Status.Cancelled,
];

export const TECH_TAGS = [
  'Amazon DevOps',
  'Angular / Express',
  'Operations Tools',
  'Splunk & Reporting',
  'General',
] as const;

export type TechTag = (typeof TECH_TAGS)[number];

/* ----------------------------------- Exams ---------------------------------- */

export const QUESTION_TYPES = ['multiple_choice', 'yes_no', 'open'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  multiple_choice: 'Multiple choice',
  yes_no: 'Yes / No',
  open: 'Open question',
};

export type ExamAttemptStatus = 'not_started' | 'submitted' | 'graded';
