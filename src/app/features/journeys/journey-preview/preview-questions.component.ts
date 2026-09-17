import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ExamQuestion } from '../../../core/models/models';
import { QuestionTypeCode, codeOf, optionCodeFor } from '../../../core/models/enums';

/**
 * A unit quiz or the final exam in a preview: answer like a learner and check the answers on the spot.
 * Grading happens here in the browser and nothing is sent anywhere. Open questions can be answered but
 * are marked by a reviewer in a real attempt, so they are not scored.
 */
@Component({
  selector: 'app-preview-questions',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, FormsModule, TranslatePipe],
  template: `
    <div class="card card-body gap-3">
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
        <div>
          <span class="page-eyebrow user-content">{{ eyebrow }}</span>
          <h2 class="h4 mb-1 user-content">{{ title }}</h2>
          <p class="small text-body-secondary mb-0" *ngIf="passingScorePercent != null" dir="auto">
            {{ 'PREVIEW.PASSING_SCORE' | translate: { score: passingScorePercent } }}
          </p>
        </div>
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" role="switch" [id]="idPrefix + '-answers'" [(ngModel)]="showAnswers" />
          <label class="form-check-label small" [for]="idPrefix + '-answers'">{{ 'PREVIEW.SHOW_ANSWERS' | translate }}</label>
        </div>
      </div>

      <div class="alert mb-0" *ngIf="checked && gradable" [ngClass]="score === 100 ? 'alert-success' : 'alert-info'" dir="auto">
        {{ 'PREVIEW.RESULT' | translate: { score: score } }}
      </div>

      <fieldset class="border rounded p-3" *ngFor="let q of questions; let i = index" [class.quiz-feedback]="checked">
        <legend class="float-none w-auto fs-6 fw-semibold px-1 mb-2 user-content">{{ i + 1 }}. {{ q.prompt }}</legend>

        <ng-container *ngIf="isType(q, 'mc')">
          <div class="form-check" *ngFor="let opt of q.options ?? []; let oi = index">
            <input
              class="form-check-input"
              type="radio"
              [id]="idPrefix + '-' + q.id + '-' + oi"
              [name]="idPrefix + '-' + q.id"
              [disabled]="checked"
              [checked]="answers[q.id]?.option === code(oi)"
              (change)="answers[q.id] = { option: code(oi) }"
            />
            <label class="form-check-label user-content" [for]="idPrefix + '-' + q.id + '-' + oi" [ngClass]="optionClass(q, oi)">
              {{ opt }}<span *ngIf="showAnswers && code(oi) === q.correctOptionIndex" aria-hidden="true"> ✓</span>
            </label>
          </div>
        </ng-container>

        <ng-container *ngIf="isType(q, 'yesno')">
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm rounded-pill" [disabled]="checked" [ngClass]="boolClass(q, true)" (click)="answers[q.id] = { bool: true }">{{ 'COMMON.YES' | translate }}</button>
            <button type="button" class="btn btn-sm rounded-pill" [disabled]="checked" [ngClass]="boolClass(q, false)" (click)="answers[q.id] = { bool: false }">{{ 'COMMON.NO' | translate }}</button>
          </div>
          <p class="small text-completed mt-2 mb-0" *ngIf="showAnswers && !checked">
            {{ 'PREVIEW.CORRECT_IS' | translate: { answer: correctAnswer(q) } }}
          </p>
        </ng-container>

        <ng-container *ngIf="isType(q, 'open')">
          <textarea class="form-control" rows="3" [name]="idPrefix + '-' + q.id" [disabled]="checked" [(ngModel)]="openAnswers[q.id]" [attr.aria-label]="q.prompt"></textarea>
          <p class="small text-body-tertiary mt-2 mb-0">{{ 'PREVIEW.OPEN_NOTE' | translate }}</p>
        </ng-container>

        <p class="small mt-2 mb-0" *ngIf="checked && !isType(q, 'open')" [ngClass]="isRight(q) ? 'text-completed' : 'text-danger'">
          {{ isRight(q) ? ('LOG.QUIZ_CORRECT' | translate) : ('LOG.QUIZ_WRONG' | translate: { answer: correctAnswer(q) }) }}
        </p>
      </fieldset>

      <div class="d-flex flex-wrap align-items-center gap-2">
        <button type="button" class="btn btn-primary" *ngIf="!checked" (click)="check()">{{ 'PREVIEW.CHECK' | translate }}</button>
        <button type="button" class="btn btn-outline-secondary" *ngIf="checked" (click)="reset()">{{ 'LOG.QUIZ_RETAKE' | translate }}</button>
        <span class="small text-body-tertiary">{{ 'PREVIEW.NOT_SAVED' | translate }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .quiz-feedback .form-check-input:disabled ~ .form-check-label { opacity: 1; }
      .quiz-feedback .btn:disabled { opacity: 0.85; }
    `,
  ],
})
export class PreviewQuestionsComponent implements OnChanges {
  private translate = inject(TranslateService);

  @Input({ required: true }) questions: ExamQuestion[] = [];
  @Input() title = '';
  @Input() eyebrow = '';
  /** The exam's pass mark; absent for a unit quiz. */
  @Input() passingScorePercent: number | null = null;
  /** Keeps input ids unique when the component is reused for another step. */
  @Input() idPrefix = 'pq';

  answers: Partial<Record<string, { option?: number; bool?: boolean }>> = {};
  openAnswers: Record<string, string> = {};
  checked = false;
  showAnswers = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions']) this.reset();
  }

  code(index: number): number { return optionCodeFor(index); }

  isType(q: ExamQuestion, type: 'mc' | 'yesno' | 'open'): boolean {
    const c = codeOf(q.type);
    return type === 'mc' ? c === QuestionTypeCode.MultipleChoice : type === 'yesno' ? c === QuestionTypeCode.YesNo : c === QuestionTypeCode.Open;
  }

  /** Questions that grade themselves (open ones need a reviewer). */
  get gradable(): ExamQuestion[] { return this.questions.filter((q) => !this.isType(q, 'open')); }

  get score(): number {
    const g = this.gradable;
    return g.length ? Math.round((g.filter((q) => this.isRight(q)).length * 100) / g.length) : 0;
  }

  isRight(q: ExamQuestion): boolean {
    const a = this.answers[q.id];
    if (!a) return false;
    return this.isType(q, 'mc') ? a.option === q.correctOptionIndex : a.bool === q.correctBoolAnswer;
  }

  optionClass(q: ExamQuestion, index: number): string {
    const option = optionCodeFor(index);
    if ((this.checked || this.showAnswers) && option === q.correctOptionIndex) return 'text-completed fw-semibold';
    if (this.checked && option === this.answers[q.id]?.option) return 'text-danger text-decoration-line-through';
    return '';
  }

  boolClass(q: ExamQuestion, value: boolean): string {
    return this.answers[q.id]?.bool === value ? 'btn-primary' : 'btn-outline-primary';
  }

  correctAnswer(q: ExamQuestion): string {
    if (this.isType(q, 'mc')) {
      const i = (q.correctOptionIndex ?? optionCodeFor(0)) - optionCodeFor(0);
      return '⁨' + (q.options?.[i] ?? '') + '⁩';
    }
    return this.translate.instant(q.correctBoolAnswer ? 'COMMON.YES' : 'COMMON.NO');
  }

  check(): void { this.checked = true; }

  reset(): void {
    this.answers = {};
    this.openAnswers = {};
    this.checked = false;
  }
}
