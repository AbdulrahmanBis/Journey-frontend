import { JourneyItemView, LearnerJourneyView, UnitProgressSummary } from '../../../core/models/models';
import { AttemptStatusCode, StatusCode, codeOf, isStatus } from '../../../core/models/enums';

/**
 * What a learner should do next, worked out from their journey views alone (no extra API call).
 *
 *   - nextUp:  the one thing to open first
 *   - myTurn:  everything else that is waiting on the learner
 *   - waiting: what the learner has handed over and their reviewer hasn't answered yet
 *
 * Journeys are made of units: items move on as the learner reads, each unit may end with a quiz, and
 * the unit (not the item) is what waits for review.
 */
export type HomeTaskKind =
  | 'item'        // work on this item
  | 'quiz'        // a unit's items are done; its quiz is next
  | 'exam'        // every unit is done, the final exam is open
  | 'reply'       // the reviewer wrote last on an item
  | 'unitReview'  // unit finished, waiting for the reviewer
  | 'examReview'; // exam submitted, waiting to be graded

export interface HomeTask {
  kind: HomeTaskKind;
  view: LearnerJourneyView;
  item?: JourneyItemView;
  unit?: UnitProgressSummary;
  /** When it started waiting, for "2d ago". */
  since?: string;
}

export interface LearnerHome {
  nextUp: HomeTask | null;
  myTurn: HomeTask[];
  waiting: HomeTask[];
}

export function learnerHome(views: LearnerJourneyView[], learnerId: string): LearnerHome {
  const open = views.filter((v) => !isStatus(v.status, StatusCode.Completed) && !isStatus(v.status, StatusCode.Cancelled));

  const work: HomeTask[] = [];
  const replies: HomeTask[] = [];
  const waiting: HomeTask[] = [];

  for (const view of open) {
    const units = [...(view.units ?? [])].sort((a, b) => a.order - b.order);
    const unitOrder = new Map(units.map((u) => [u.unitId, u.order]));
    const items = [...view.items].sort((a, b) =>
      (unitOrder.get(a.unitId ?? '') ?? 0) - (unitOrder.get(b.unitId ?? '') ?? 0) || a.order - b.order);

    const next = items.find((i) => !isStatus(i.progress.status, StatusCode.Completed));
    const quizDue = units.find((u) => u.hasQuiz && !u.quizAnswered && u.completedItems === u.totalItems);
    if (next) {
      work.push({ kind: 'item', view, item: next });
    } else if (quizDue) {
      work.push({ kind: 'quiz', view, unit: quizDue });
    } else if (examIsOpen(view, units)) {
      work.push({ kind: 'exam', view });
    }

    for (const unit of units) {
      if (codeOf(unit.status) === StatusCode.Response) {
        waiting.push({ kind: 'unitReview', view, unit, since: unit.updatedAt });
      }
    }
    for (const item of items) {
      const last = latestNote(item);
      if (last && last.actorId !== learnerId) {
        replies.push({ kind: 'reply', view, item, since: last.timestamp });
      }
    }
  }

  // An exam waiting to be graded counts even once the journey itself is done.
  for (const view of views) {
    if (view.examAttempt && isStatus(view.examAttempt.status, AttemptStatusCode.Submitted)) {
      waiting.push({ kind: 'examReview', view, since: view.examAttempt.submittedAt });
    }
  }

  work.sort(byUrgency);
  const [nextUp = null, ...otherWork] = work;
  replies.sort((a, b) => (b.since ?? '').localeCompare(a.since ?? ''));
  waiting.sort((a, b) => (a.since ?? '').localeCompare(b.since ?? ''));

  return { nextUp, myTurn: [...replies, ...otherWork], waiting };
}

/** Every unit's items and quiz done, and the exam not taken (or only drafted). */
function examIsOpen(view: LearnerJourneyView, units: UnitProgressSummary[]): boolean {
  if (!view.exam) return false;
  const unitsReady = units.every((u) => u.completedItems === u.totalItems && (!u.hasQuiz || u.quizAnswered));
  if (!unitsReady) return false;
  return !view.examAttempt || isStatus(view.examAttempt.status, AttemptStatusCode.Draft);
}

function latestNote(item: JourneyItemView) {
  const notes = item.progress?.notes ?? [];
  return notes.reduce<(typeof notes)[number] | undefined>((last, n) => (!last || n.timestamp > last.timestamp ? n : last), undefined);
}

/** Soonest due date first (overdue naturally leads); then what the learner touched most recently. */
function byUrgency(a: HomeTask, b: HomeTask): number {
  const dueA = a.view.dueDate ?? '9999-12-31';
  const dueB = b.view.dueDate ?? '9999-12-31';
  if (dueA !== dueB) return dueA.localeCompare(dueB);
  return lastTouched(b.view).localeCompare(lastTouched(a.view));
}

function lastTouched(view: LearnerJourneyView): string {
  return view.items.reduce((max, i) => (i.progress?.updatedAt > max ? i.progress.updatedAt : max), view.assignedAt ?? '');
}
