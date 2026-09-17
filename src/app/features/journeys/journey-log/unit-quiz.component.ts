import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LearnerUnitService } from '../../../core/services/learner-unit.service';
import { ToastService } from '../../../core/services/toast.service';
import { QuizQuestion, UnitQuiz } from '../../../core/models/models';
import { QuestionTypeCode, codeOf, optionCodeFor } from '../../../core/models/enums';
import { apiErrorMessage } from '../../../core/services/api-error';

/**
 * A unit's quiz. The learner answers and gets feedback on the spot (it grades itself), and may try
 * again until the unit is completed. Reviewers see the learner's last answers read-only.
 */
@Component({
  selector: 'app-unit-quiz',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, TranslatePipe],
  template: `
    <div class="card card-body gap-3">
      <div>
        <span class="page-eyebrow">{{ unitTitle }}</span>
        <h2 class="h4 mb-1">{{ 'LOG.QUIZ' | translate }}</h2>
        <p class="small text-body-secondary mb-0" *ngIf="canAnswer">{{ 'LOG.QUIZ_INTRO' | translate }}</p>
      </div>

      <p class="text-body-secondary" *ngIf="!quiz">{{ 'LOG.LOADING' | translate }}</p>

      <ng-container *ngIf="quiz">
        <div class="alert mb-0" *ngIf="quiz.submitted && !retaking" [ngClass]="(quiz.scorePercent ?? 0) === 100 ? 'alert-success' : 'alert-info'">
          {{ 'LOG.QUIZ_RESULT' | translate: { score: quiz.scorePercent } }}
        </div>
        <p class="text-body-secondary mb-0" *ngIf="!quiz.submitted && !canAnswer">{{ 'LOG.QUIZ_NOT_TAKEN' | translate }}</p>

        <fieldset class="border rounded p-3" *ngFor="let q of quiz.questions; let i = index" [class.quiz-feedback]="showFeedback">
          <legend class="float-none w-auto fs-6 fw-semibold px-1 mb-2 user-content">{{ i + 1 }}. {{ q.prompt }}</legend>

          <ng-container *ngIf="isMultipleChoice(q)">
            <div class="form-check" *ngFor="let opt of q.options; let oi = index">
              <input
                class="form-check-input"
                type="radio"
                [id]="'uq-' + q.id + '-' + oi"
                [name]="'uq-' + q.id"
                [disabled]="!editable"
                [checked]="answers[q.id]?.selectedOptionIndex === code(oi)"
                (change)="answers[q.id] = { selectedOptionIndex: code(oi) }"
              />
              <label class="form-check-label user-content" [for]="'uq-' + q.id + '-' + oi" [ngClass]="optionClass(q, oi)">{{ opt }}</label>
            </div>
          </ng-container>

          <div class="d-flex gap-2" *ngIf="!isMultipleChoice(q)">
            <button type="button" class="btn btn-sm rounded-pill" [disabled]="!editable" [ngClass]="answers[q.id]?.boolAnswer === true ? 'btn-primary' : 'btn-outline-primary'" (click)="answers[q.id] = { boolAnswer: true }">{{ 'COMMON.YES' | translate }}</button>
            <button type="button" class="btn btn-sm rounded-pill" [disabled]="!editable" [ngClass]="answers[q.id]?.boolAnswer === false ? 'btn-primary' : 'btn-outline-primary'" (click)="answers[q.id] = { boolAnswer: false }">{{ 'COMMON.NO' | translate }}</button>
          </div>

          <p class="small mt-2 mb-0" *ngIf="showFeedback && q.correct !== undefined && q.correct !== null" [ngClass]="q.correct ? 'text-completed' : 'text-danger'">
            {{ q.correct ? ('LOG.QUIZ_CORRECT' | translate) : ('LOG.QUIZ_WRONG' | translate: { answer: correctAnswer(q) }) }}
          </p>
        </fieldset>

        <div class="d-flex gap-2" *ngIf="canAnswer">
          <button type="button" class="btn btn-primary" *ngIf="editable" [disabled]="submitting" (click)="submit()">{{ 'LOG.QUIZ_SUBMIT' | translate }}</button>
          <button type="button" class="btn btn-outline-secondary" *ngIf="quiz.submitted && !retaking && !closed" (click)="retake()">{{ 'LOG.QUIZ_RETAKE' | translate }}</button>
        </div>
      </ng-container>
    </div>
  `,
  styles: [
    `
      /* After grading the answers stay readable: Bootstrap would fade a disabled option's label. */
      .quiz-feedback .form-check-input:disabled ~ .form-check-label { opacity: 1; }
      .quiz-feedback .btn:disabled { opacity: 0.85; }
    `,
  ],
})
export class UnitQuizComponent implements OnChanges {
  private units = inject(LearnerUnitService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  @Input({ required: true }) learnerUnitId!: string;
  @Input() unitTitle = '';
  /** The learner themselves; everyone else sees it read-only. */
  @Input() canAnswer = false;
  /** Completed or cancelled units can't be retaken. */
  @Input() closed = false;
  @Output() submitted = new EventEmitter<UnitQuiz>();

  quiz: UnitQuiz | null = null;
  /** Question id → the chosen answer; a question may not be answered yet. */
  answers: Partial<Record<string, { selectedOptionIndex?: number; boolAnswer?: boolean }>> = {};
  retaking = false;
  submitting = false;

  get editable(): boolean {
    return this.canAnswer && !this.closed && (!this.quiz?.submitted || this.retaking);
  }

  get showFeedback(): boolean {
    return !!this.quiz?.submitted && !this.retaking;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['learnerUnitId']) this.load();
  }

  load(): void {
    this.quiz = null;
    this.retaking = false;
    this.units.quiz(this.learnerUnitId).subscribe((quiz) => this.show(quiz));
  }

  code(index: number): number { return optionCodeFor(index); }

  isMultipleChoice(q: QuizQuestion): boolean { return codeOf(q.type) === QuestionTypeCode.MultipleChoice; }

  /** After submitting: the right option in green, a wrong pick in red. */
  optionClass(q: QuizQuestion, index: number): string {
    if (!this.showFeedback) return '';
    const option = optionCodeFor(index);
    if (option === q.correctOptionIndex) return 'text-completed fw-semibold';
    if (option === q.selectedOptionIndex) return 'text-danger text-decoration-line-through';
    return '';
  }

  correctAnswer(q: QuizQuestion): string {
    if (this.isMultipleChoice(q)) {
      const i = (q.correctOptionIndex ?? 0) - optionCodeFor(0);
      return '\u2068' + (q.options[i] ?? '') + '\u2069';
    }
    return this.translate.instant(q.correctBoolAnswer ? 'COMMON.YES' : 'COMMON.NO');
  }

  retake(): void {
    this.retaking = true;
    this.answers = {};
  }

  submit(): void {
    if (!this.quiz) return;
    const missing = this.quiz.questions.some((q) => {
      const a = this.answers[q.id];
      return !a || (this.isMultipleChoice(q) ? a.selectedOptionIndex == null : a.boolAnswer == null);
    });
    if (missing) {
      this.toast.error(this.translate.instant('LOG.QUIZ_ANSWER_ALL'));
      return;
    }
    this.submitting = true;
    const payload = this.quiz.questions.map((q) => ({ questionId: q.id, ...this.answers[q.id] }));
    this.units.submitQuiz(this.learnerUnitId, payload).subscribe({
      next: (quiz) => {
        this.submitting = false;
        this.show(quiz);
        this.submitted.emit(quiz);
      },
      error: (err: any) => {
        this.submitting = false;
        this.toast.error(apiErrorMessage(err) ?? this.translate.instant('COMMON.SAVE_FAILED'));
      },
    });
  }

  private show(quiz: UnitQuiz): void {
    this.quiz = quiz;
    this.retaking = false;
    this.answers = {};
    for (const q of quiz.questions) {
      if (q.selectedOptionIndex != null || q.boolAnswer != null) {
        this.answers[q.id] = { selectedOptionIndex: q.selectedOptionIndex, boolAnswer: q.boolAnswer };
      }
    }
  }
}
