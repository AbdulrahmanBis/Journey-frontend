import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { QuestionDraft } from '../../../core/services/exam.service';
import { QUESTION_TYPES, QuestionTypeCode, optionCodeFor, optionIndexOf } from '../../../core/models/enums';

/** An editable question: options are always an array while editing. */
export interface QuestionRow extends QuestionDraft {
  options: string[];
}

export function blankQuestion(): QuestionRow {
  return { type: QuestionTypeCode.MultipleChoice, prompt: '', options: ['', ''], correctOptionIndex: optionCodeFor(0), correctBoolAnswer: true };
}

/** For sending: options and answers only where the type uses them. */
export function toQuestionDraft(q: QuestionRow): QuestionDraft {
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt.trim(),
    options: q.type === QuestionTypeCode.MultipleChoice ? q.options.map((o) => o.trim()).filter(Boolean) : undefined,
    correctOptionIndex: q.type === QuestionTypeCode.MultipleChoice ? q.correctOptionIndex : undefined,
    correctBoolAnswer: q.type === QuestionTypeCode.YesNo ? q.correctBoolAnswer : undefined,
  };
}

/**
 * One question's editor: type, prompt, and either options with the correct one, or the yes/no answer.
 * Used by the exam form and by unit quizzes (which leave out open questions: `[allowOpen]="false"`).
 */
@Component({
  selector: 'app-question-editor',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, FormsModule, TranslatePipe],
  template: `
    <div class="border rounded p-3 mb-3 bg-body-tertiary">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="small text-body-tertiary" dir="auto">{{ 'EXAM.QUESTION_SHORT' | translate: { n: index + 1 } }}</span>
        <button class="btn btn-outline-danger btn-sm" type="button" (click)="remove.emit()" [title]="'EXAM.REMOVE_QUESTION' | translate">✕</button>
      </div>

      <div class="mb-3">
        <label class="form-label" [for]="idPrefix + '-type'">{{ 'EXAM.QUESTION_TYPE' | translate }}</label>
        <select class="form-select" [id]="idPrefix + '-type'" [(ngModel)]="question.type" [name]="idPrefix + '-type'" (ngModelChange)="onTypeChange()">
          <option *ngFor="let t of types" [ngValue]="t.code">{{ lang.label(t) }}</option>
        </select>
      </div>

      <textarea class="form-control user-content" [(ngModel)]="question.prompt" [name]="idPrefix + '-prompt'" [placeholder]="'EXAM.PROMPT_PLACEHOLDER' | translate" rows="2"></textarea>

      <div *ngIf="question.type === Q.MultipleChoice" class="mt-3 pt-3 border-top">
        <div class="form-text mt-0 mb-2">{{ 'EXAM.PICK_CORRECT' | translate }}</div>
        <div class="d-flex align-items-center gap-2 mb-2" *ngFor="let opt of question.options; let oi = index; trackBy: trackIndex">
          <input
            type="radio"
            class="form-check-input mt-0 flex-shrink-0"
            [name]="idPrefix + '-correct'"
            [checked]="question.correctOptionIndex === optionCodeFor(oi)"
            (change)="question.correctOptionIndex = optionCodeFor(oi)"
            [attr.aria-label]="'EXAM.PICK_CORRECT' | translate"
          />
          <input class="form-control user-content" [(ngModel)]="question.options[oi]" [name]="idPrefix + '-opt-' + oi" [placeholder]="'EXAM.OPTION_PLACEHOLDER' | translate" />
          <button class="btn btn-outline-secondary btn-sm" type="button" [disabled]="question.options.length <= 2" (click)="removeOption(oi)" [title]="'EXAM.REMOVE_OPTION' | translate">✕</button>
        </div>
        <button class="btn btn-outline-secondary btn-sm" type="button" [disabled]="question.options.length >= 4" (click)="question.options.push('')">{{ 'EXAM.ADD_OPTION' | translate }}</button>
      </div>

      <div *ngIf="question.type === Q.YesNo" class="mt-3 pt-3 border-top">
        <div class="form-text mt-0 mb-2">{{ 'EXAM.CORRECT_ANSWER' | translate }}</div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-sm rounded-pill" [ngClass]="question.correctBoolAnswer === true ? 'btn-completed' : 'btn-outline-completed'" (click)="question.correctBoolAnswer = true">{{ 'COMMON.YES' | translate }}</button>
          <button type="button" class="btn btn-sm rounded-pill" [ngClass]="question.correctBoolAnswer === false ? 'btn-cancelled' : 'btn-outline-cancelled'" (click)="question.correctBoolAnswer = false">{{ 'COMMON.NO' | translate }}</button>
        </div>
      </div>

      <p class="form-text mb-0" *ngIf="question.type === Q.Open">{{ 'EXAM.OPEN_NOTE' | translate }}</p>
    </div>
  `,
})
export class QuestionEditorComponent {
  lang = inject(LanguageService);

  @Input({ required: true }) question!: QuestionRow;
  @Input() index = 0;
  /** Unique per question on the page, for element ids and radio groups. */
  @Input() idPrefix = 'q';
  /** Unit quizzes grade themselves, so they leave out open questions. */
  @Input() allowOpen = true;
  @Output() remove = new EventEmitter<void>();

  readonly Q = QuestionTypeCode;
  readonly optionCodeFor = optionCodeFor;

  get types() {
    return this.allowOpen ? QUESTION_TYPES : QUESTION_TYPES.filter((t) => t.code !== QuestionTypeCode.Open);
  }

  trackIndex = (i: number) => i;

  onTypeChange(): void {
    if (this.question.type === QuestionTypeCode.MultipleChoice && this.question.options.length < 2) this.question.options = ['', ''];
  }

  removeOption(index: number): void {
    this.question.options.splice(index, 1);
    if ((optionIndexOf(this.question.correctOptionIndex) ?? 0) >= this.question.options.length) {
      this.question.correctOptionIndex = optionCodeFor(0);
    }
  }
}
