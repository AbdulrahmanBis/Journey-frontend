export type HoursGranularity = 'day' | 'month' | 'quarter';

export interface HoursBucket {
  label: string;
  hours: number;
}

export interface ExamStats {
  configured: number; // journeys with an exam attached
  taken: number; // attempts submitted or graded
  underReview: number;
  graded: number;
  passed: number;
  failed: number;
  avgScorePercent: number | null;
}

/** Metrics for a single learner — used standalone, and reused inside group drill-downs. */
export interface LearnerMetrics {
  learnerId: string;
  learnerName: string;
  totalJourneys: number;
  activeJourneys: number;
  completedJourneys: number;
  cancelledJourneys: number;
  totalItems: number;
  completedItems: number;
  itemCompletionPercent: number;
  totalHours: number;
  avgHoursPerCompletedItem: number | null;
  exams: ExamStats;
  hoursByDay: HoursBucket[];
  hoursByMonth: HoursBucket[];
  hoursByQuarter: HoursBucket[];
}

/** Aggregated metrics across a set of learners (a senior's team, or the whole org). */
export interface GroupMetrics {
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
  /** Per-learner roll-up for a leaderboard-style table. */
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

/** Org-wide metrics (Manager/Admin, "all seniors" view) — adds a per-senior rollup. */
export interface OrgMetrics extends GroupMetrics {
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
