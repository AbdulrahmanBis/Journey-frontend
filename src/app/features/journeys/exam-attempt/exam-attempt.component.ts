import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { AssignmentService } from '../../../core/services/assignment.service';
import { UserService } from '../../../core/services/user.service';
import { ExamService, AnswerDraft } from '../../../core/services/exam.service';
import { ToastService } from '../../../core/services/toast.service';
import { Exam, ExamQuestion, LearnerJourneyView, User } from '../../../core/models/models';
import { AttemptStatusCode, ORG_VIEW_ROLES, QuestionTypeCode, RoleCode, codeOf, optionCodeFor, optionIndexOf, toggleButtonClass } from '../../../core/models/enums';

interface DraftAnswer {
  selectedOptionIndex?: number;
  boolAnswer?: boolean;
  openText: string;
}

@Component({
  selector: 'app-exam-attempt',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './exam-attempt.component.html',
  styleUrl: './exam-attempt.component.scss',
})
export class ExamAttemptComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private assignments = inject(AssignmentService);
  private userService = inject(UserService);
  private examService = inject(ExamService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  loading = true;
  notAllowed = false;
  view: LearnerJourneyView | null = null;
  learner: User | null = null;

  draftAnswers: Record<string, DraftAnswer> = {};
  submitting = false;

  marks: Record<string, boolean | undefined> = {};
  passDecision = false;
  grading = false;

  optionCodeFor = optionCodeFor;
  toggleButtonClass = toggleButtonClass;

  get currentUser(): User { return this.auth.currentUser!; }
  get isReviewer(): boolean { return !this.auth.hasRole(RoleCode.Learner); }
  get exam(): Exam | undefined { return this.view?.exam; }
  get attempt() { return this.view?.examAttempt; }

  /** Every unit's items completed and quiz answered — the same rule the journey log uses. */
  get unitsReady(): boolean {
    const units = this.view?.units ?? [];
    if (!units.length) return (this.view?.percentComplete ?? 0) >= 100;
    return units.every((u) => u.completedItems === u.totalItems && (!u.hasQuiz || u.quizAnswered));
  }

  // ── Question-type helpers (the wire format is { code, english, arabic }) ──
  isMc(q: ExamQuestion): boolean { return codeOf(q.type) === QuestionTypeCode.MultipleChoice; }
  isYesNo(q: ExamQuestion): boolean { return codeOf(q.type) === QuestionTypeCode.YesNo; }
  isOpen(q: ExamQuestion): boolean { return codeOf(q.type) === QuestionTypeCode.Open; }

  get mode(): string {
    if (!this.view) return 'locked';
    if (!this.exam) return 'no-exam';
    if (!this.unitsReady) return 'locked';
    if (!this.attempt) return this.isReviewer ? 'awaiting' : 'take';
    if (codeOf(this.attempt.status) === AttemptStatusCode.Submitted) {
      return this.isReviewer ? 'grading' : 'under-review';
    }
    return 'result';
  }

  get liveScorePercent(): number {
    const total = this.exam?.questions.length ?? 0;
    if (!total) return 0;
    return Math.round((Object.values(this.marks).filter((m) => m === true).length / total) * 100);
  }

  get allMarked(): boolean {
    return (this.exam?.questions ?? []).every((q) => this.marks[q.id] !== undefined);
  }

  get allAnswered(): boolean {
    return (this.exam?.questions ?? []).every((q) => {
      const a = this.draftAnswers[q.id];
      if (!a) return false;
      if (this.isMc(q)) return a.selectedOptionIndex !== undefined;
      if (this.isYesNo(q)) return a.boolAnswer !== undefined;
      return a.openText.trim().length > 0;
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.assignments.getLearnerJourneyView(id).subscribe({
      next: (view) => {
        if (!this.authorize(view)) { this.notAllowed = true; this.loading = false; return; }
        this.view = view;
        this.userService.getById(view.learnerId).subscribe((u) => (this.learner = u));
        this.initFormState();
        this.loading = false;
      },
      error: () => {
        this.toast.error(this.translate.instant('QUEST_LOG.NOT_FOUND'));
        this.router.navigate(['/dashboard']);
      },
    });
  }

  private authorize(view: LearnerJourneyView): boolean {
    if (this.auth.hasRole(...ORG_VIEW_ROLES)) return true;
    if (this.auth.hasRole(RoleCode.Learner)) return view.learnerId === this.currentUser.id;
    // For Senior: the backend only returns accessible views, so trust its authorization.
    return true;
  }

  private initFormState(): void {
    if (!this.exam) return;
    this.draftAnswers = {};
    for (const q of this.exam.questions) this.draftAnswers[q.id] = { openText: '' };
    if (this.attempt) {
      this.marks = {};
      for (const ans of this.attempt.answers) this.marks[ans.questionId] = ans.markedCorrect;
      this.passDecision = this.attempt.passed ?? this.liveScorePercent >= (this.exam?.passingScorePercent ?? 70);
    }
  }

  answerFor(questionId: string): DraftAnswer {
    return this.draftAnswers[questionId] ?? { openText: '' };
  }

  answerOf(question: ExamQuestion) {
    return this.attempt?.answers.find((a) => a.questionId === question.id);
  }

  /** Takes the stored 1001-based option code and resolves it to the option's text. */
  optionText(question: ExamQuestion, code?: number): string {
    const index = optionIndexOf(code);
    if (index === undefined || !question.options) return '—';
    return question.options[index] ?? '—';
  }

  refresh(): void {
    if (!this.view) return;
    this.assignments.getLearnerJourneyView(this.view.id).subscribe((view) => {
      this.view = view;
      this.initFormState();
    });
  }

  submitExam(): void {
    if (!this.exam || !this.view || !this.allAnswered) return;
    this.submitting = true;
    const answers: AnswerDraft[] = this.exam.questions.map((q) => {
      const a = this.draftAnswers[q.id];
      return { questionId: q.id, selectedOptionIndex: a.selectedOptionIndex, boolAnswer: a.boolAnswer, openText: a.openText.trim() || undefined };
    });
    this.examService.submitAttempt(this.view.id, this.exam.id, answers).subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success(this.translate.instant('EXAM.SUBMITTED_TOAST'));
        this.refresh();
      },
      error: (err: any) => {
        this.submitting = false;
        this.toast.error(err?.error?.message ?? this.translate.instant('EXAM.SUBMIT_FAILED'));
      },
    });
  }

  setMark(questionId: string, value: boolean): void {
    this.marks[questionId] = value;
    this.passDecision = this.liveScorePercent >= (this.exam?.passingScorePercent ?? 70);
  }

  submitGrade(): void {
    if (!this.exam || !this.attempt || !this.allMarked) return;
    this.grading = true;
    const marks = this.exam.questions.map((q) => ({ questionId: q.id, markedCorrect: !!this.marks[q.id] }));
    this.examService.gradeAttempt(this.attempt.id, marks, this.passDecision, this.currentUser).subscribe({
      next: () => {
        this.grading = false;
        this.toast.success(this.translate.instant('EXAM.GRADE_SUBMITTED'));
        this.refresh();
      },
      error: (err: any) => {
        this.grading = false;
        this.toast.error(err?.error?.message ?? this.translate.instant('EXAM.GRADE_FAILED'));
      },
    });
  }
}
