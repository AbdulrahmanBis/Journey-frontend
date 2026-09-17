/**
 * Every status / role / type the API returns arrives as this triple. The database stores only
 * `code`; the backend enum owns the english + arabic text and sends all three, so the UI can render
 * either language without its own lookup. Requests send back just the `code`.
 */
export interface EnumValue {
  code: number;
  english: string;
  arabic: string;
}

export type Lang = 'english' | 'arabic';

/** Renders an enum value in the requested language. Safe against null/undefined. */
export function enumLabel(value: EnumValue | null | undefined, lang: Lang = 'english'): string {
  if (!value) return '';
  return lang === 'arabic' ? value.arabic : value.english;
}

/** Narrows either an EnumValue or a bare code down to the numeric code. */
export function codeOf(value: EnumValue | number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  return typeof value === 'number' ? value : value.code;
}

/* ------------------------------- Team dashboard ------------------------------ */

export const LearnerHealthCode = { Overdue: 1001, AtRisk: 1002, OnTrack: 1003, NotStarted: 1004, Done: 1005 } as const;
export type LearnerHealthCode = (typeof LearnerHealthCode)[keyof typeof LearnerHealthCode];

export function healthChipClass(health: EnumValue | number | null | undefined): string {
  switch (codeOf(health)) {
    case LearnerHealthCode.Overdue: return 'bg-danger-subtle text-danger-emphasis';
    case LearnerHealthCode.AtRisk: return 'bg-warning-subtle text-warning-emphasis';
    case LearnerHealthCode.OnTrack: return 'bg-completed-subtle text-completed-emphasis';
    case LearnerHealthCode.Done: return 'bg-navy-subtle text-navy';
    default: return 'bg-secondary-subtle text-secondary-emphasis';
  }
}

export const AttentionTypeCode = {
  Overdue: 1001, ExamToGrade: 1002, AwaitingReview: 1003, UnansweredNote: 1004,
  Inactive: 1005, NothingAssigned: 1006, NoSenior: 1007,
} as const;
export type AttentionTypeCode = (typeof AttentionTypeCode)[keyof typeof AttentionTypeCode];

/* ---------------------------------- Catalog --------------------------------- */

export const CatalogTypeCode = { Journey: 1001, Package: 1002 } as const;
export type CatalogTypeCode = (typeof CatalogTypeCode)[keyof typeof CatalogTypeCode];

/** The learner's own standing with a catalog entry — coarser than a journey's StatusCode. */
export const LearningStatusCode = { NotStarted: 1001, InProgress: 1002, Completed: 1003, Cancelled: 1004 } as const;
export type LearningStatusCode = (typeof LearningStatusCode)[keyof typeof LearningStatusCode];

/** Badge colours for a LearningStatus, reusing the journey status palette. */
export function learningStatusChipClass(status: EnumValue | number | null | undefined): string {
  switch (codeOf(status)) {
    case LearningStatusCode.InProgress: return 'bg-reflect-subtle text-reflect-emphasis';
    case LearningStatusCode.Completed: return 'bg-completed-subtle text-completed-emphasis';
    case LearningStatusCode.Cancelled: return 'bg-cancelled-subtle text-cancelled-emphasis';
    default: return 'bg-secondary-subtle text-secondary-emphasis';
  }
}

/* ----------------------------------- Roles ---------------------------------- */

export const RoleCode = {
  Admin: 1001,
  Manager: 1002,
  Senior: 1003,
  Learner: 1004,
  /** Sees and manages people in every department; Manager is limited to their own. */
  Hr: 1005,
} as const;
export type RoleCode = (typeof RoleCode)[keyof typeof RoleCode];

/** Local catalog — used to populate pickers before any server value exists. */
export const USER_ROLES: readonly EnumValue[] = [
  { code: RoleCode.Admin, english: 'Admin', arabic: 'مدير النظام' },
  { code: RoleCode.Manager, english: 'Manager', arabic: 'مدير' },
  { code: RoleCode.Senior, english: 'Senior', arabic: 'مشرف' },
  { code: RoleCode.Learner, english: 'Learner', arabic: 'متعلم' },
  { code: RoleCode.Hr, english: 'HR', arabic: 'الموارد البشرية' },
];

/*
  Role groups. These mirror AccessPolicy on the server, which is what actually enforces them;
  here they only decide what the UI offers, so nobody is shown a button that would answer 403.
*/

/** May author journeys and exams, assign them, and review a learner's work. */
export const STAFF_ROLES: readonly RoleCode[] = [RoleCode.Senior, RoleCode.Manager, RoleCode.Hr, RoleCode.Admin];

/** May manage user accounts (a Manager only within their own department). */
export const USER_ADMIN_ROLES: readonly RoleCode[] = [RoleCode.Manager, RoleCode.Hr, RoleCode.Admin];

/** See every department, and can switch between them. */
export const ORG_WIDE_ROLES: readonly RoleCode[] = [RoleCode.Hr, RoleCode.Admin];

/** Have an organisation view at all: their department (Manager) or every department. */
export const ORG_VIEW_ROLES: readonly RoleCode[] = [RoleCode.Manager, RoleCode.Hr, RoleCode.Admin];

/**
 * Stable CSS slug per role code. Deliberately derived from the code, not from the server's text,
 * so styling never breaks if a label is reworded or the UI switches to Arabic.
 */
const ROLE_SLUG: Readonly<Record<number, string>> = {
  [RoleCode.Admin]: 'admin',
  [RoleCode.Manager]: 'manager',
  [RoleCode.Senior]: 'senior',
  [RoleCode.Learner]: 'learner',
  [RoleCode.Hr]: 'hr',
};

export function roleSlug(role: EnumValue | number | null | undefined): string {
  const code = codeOf(role);
  return (code !== undefined && ROLE_SLUG[code]) || 'learner';
}

/** Bootstrap classes for a soft role chip, e.g. `bg-senior-subtle text-senior-emphasis`. */
export function roleChipClass(role: EnumValue | number | null | undefined): string {
  const slug = roleSlug(role);
  return `bg-${slug}-subtle text-${slug}-emphasis`;
}

/* ---------------------------------- Statuses -------------------------------- */

/** Shared by a journey assignment (learner-journey) and each item within it. */
export const StatusCode = {
  New: 1001,
  Reflect: 1002,
  Response: 1003,
  Completed: 1004,
  Cancelled: 1005,
} as const;
export type StatusCode = (typeof StatusCode)[keyof typeof StatusCode];

/** Local catalog, in the order used by dropdowns and the status-cycle control. */
export const STATUS_ORDER: readonly EnumValue[] = [
  { code: StatusCode.New, english: 'new', arabic: 'جديد' },
  { code: StatusCode.Reflect, english: 'in progress', arabic: 'قيد التنفيذ' },
  { code: StatusCode.Response, english: 'waiting for review', arabic: 'بانتظار المراجعة' },
  { code: StatusCode.Completed, english: 'completed', arabic: 'مكتمل' },
  { code: StatusCode.Cancelled, english: 'cancelled', arabic: 'ملغي' },
];

const STATUS_SLUG: Readonly<Record<number, string>> = {
  [StatusCode.New]: 'new',
  [StatusCode.Reflect]: 'reflect',
  [StatusCode.Response]: 'response',
  [StatusCode.Completed]: 'completed',
  [StatusCode.Cancelled]: 'cancelled',
};

export function statusSlug(status: EnumValue | number | null | undefined): string {
  const code = codeOf(status);
  return (code !== undefined && STATUS_SLUG[code]) || 'new';
}

/**
 * Bootstrap classes for a soft status chip, e.g. `bg-completed-subtle text-completed-emphasis`.
 * The slugs double as theme colour names (src/theme/_colors.scss), so there is no second lookup.
 */
export function statusChipClass(status: EnumValue | number | null | undefined): string {
  const slug = statusSlug(status);
  return `bg-${slug}-subtle text-${slug}-emphasis`;
}

/** True when the value is the given status, tolerating either an EnumValue or a raw code. */
export function isStatus(value: EnumValue | number | null | undefined, status: StatusCode): boolean {
  return codeOf(value) === status;
}

/* ----------------------------------- Exams ---------------------------------- */

export const QuestionTypeCode = {
  MultipleChoice: 1001,
  YesNo: 1002,
  Open: 1003,
} as const;
export type QuestionTypeCode = (typeof QuestionTypeCode)[keyof typeof QuestionTypeCode];

export const QUESTION_TYPES: readonly EnumValue[] = [
  { code: QuestionTypeCode.MultipleChoice, english: 'Multiple choice', arabic: 'اختيار من متعدد' },
  { code: QuestionTypeCode.YesNo, english: 'Yes / No', arabic: 'نعم / لا' },
  { code: QuestionTypeCode.Open, english: 'Open question', arabic: 'سؤال مفتوح' },
];

/**
 * Option choices are 1001-based codes on the wire (1001 = first option … 1004 = fourth), matching
 * every other enum-ish value. The UI still works in array positions, so convert at the boundary.
 */
export const OPTION_CODE_BASE = 1001;

export function optionCodeFor(index: number): number {
  return OPTION_CODE_BASE + index;
}

export function optionIndexOf(code: number | null | undefined): number | undefined {
  if (code === null || code === undefined) return undefined;
  // Tolerate legacy 0-based values so old rows don't render as blanks.
  return code >= OPTION_CODE_BASE ? code - OPTION_CODE_BASE : code;
}

export const AttemptStatusCode = {
  Draft: 1001,
  Submitted: 1002,
  Graded: 1003,
} as const;
export type AttemptStatusCode = (typeof AttemptStatusCode)[keyof typeof AttemptStatusCode];

/* -------------------------------- Attachments -------------------------------- */

export const AttachmentKindCode = {
  Link: 1001,
  Image: 1002,
  Pdf: 1003,
  Document: 1004,
  VideoEmbed: 1005,
  VideoFile: 1006,
  Iframe: 1007,
} as const;
export type AttachmentKindCode = (typeof AttachmentKindCode)[keyof typeof AttachmentKindCode];

/** Local catalog for the "add attachment" picker, before any server value exists. */
export const ATTACHMENT_KINDS: readonly EnumValue[] = [
  { code: AttachmentKindCode.Link, english: 'Link', arabic: 'رابط' },
  { code: AttachmentKindCode.Image, english: 'Image', arabic: 'صورة' },
  { code: AttachmentKindCode.Pdf, english: 'PDF', arabic: 'ملف PDF' },
  { code: AttachmentKindCode.Document, english: 'Document', arabic: 'مستند' },
  { code: AttachmentKindCode.VideoEmbed, english: 'Video (embedded)', arabic: 'فيديو مضمّن' },
  { code: AttachmentKindCode.VideoFile, english: 'Video (uploaded)', arabic: 'فيديو مرفوع' },
  { code: AttachmentKindCode.Iframe, english: 'Embedded page', arabic: 'صفحة مضمّنة' },
];

/** Kinds whose content is uploaded rather than linked. Mirrors AttachmentKind.isUploaded(). */
export function isUploadedKind(kind: EnumValue | number | null | undefined): boolean {
  const code = codeOf(kind);
  return (
    code === AttachmentKindCode.Image ||
    code === AttachmentKindCode.Pdf ||
    code === AttachmentKindCode.Document ||
    code === AttachmentKindCode.VideoFile
  );
}

/** `accept` attribute for the file picker, matching the backend's allowlist. */
export function acceptFor(kind: EnumValue | number | null | undefined): string {
  switch (codeOf(kind)) {
    case AttachmentKindCode.Image:
      return 'image/png,image/jpeg,image/gif,image/webp';
    case AttachmentKindCode.Pdf:
      return 'application/pdf';
    case AttachmentKindCode.VideoFile:
      return 'video/mp4,video/webm,video/quicktime';
    case AttachmentKindCode.Document:
      return '.doc,.docx,.xls,.xlsx,.txt';
    default:
      return '';
  }
}

/**
 * Turns a page URL into something an iframe can actually play. YouTube and Vimeo watch URLs
 * refuse to render in a frame, so they are rewritten to their embed form; anything else is
 * passed through for the sanitizer to judge.
 */
export function toEmbedUrl(raw: string | null | undefined): string {
  const url = (raw ?? '').trim();
  if (!url) return '';

  const yt = url.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return url;
}

/* ---------------------------------- Tech tags -------------------------------- */

export const TECH_TAGS = [
  'Amazon DevOps',
  'Angular / Express',
  'Operations Tools',
  'Splunk & Reporting',
  'Security',
  'Sales & CRM',
  'People & Culture',
  'Project Delivery',
  'General',
] as const;

export type TechTag = (typeof TECH_TAGS)[number];

/* ------------------------------ Bootstrap classes ---------------------------- */

/**
 * A toggle button in one of the theme colours: solid when chosen, outlined when not.
 * Used for status pills and yes/no, correct/incorrect, pass/fail pairs, e.g.
 * `toggleButtonClass(chosen, statusSlug(s))` → `btn-completed` / `btn-outline-completed`.
 */
export function toggleButtonClass(active: boolean, color: string): string {
  return active ? `btn-${color}` : `btn-outline-${color}`;
}
