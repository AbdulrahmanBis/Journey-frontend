import { Component, Input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Exam, ExamAttempt } from '../../../core/models/models';
import { AttemptStatusCode, codeOf } from '../../../core/models/enums';

@Component({
  selector: 'app-exam-grade-badge',
  standalone: true,
  imports: [NgClass, NgIf, TranslatePipe],
  template: `
    <span class="badge rounded-pill" *ngIf="isGraded" [ngClass]="gradedClass">
      🎓 {{ attempt!.scorePercent }}% · {{ (attempt!.passed ? 'EXAM.PASSED' : 'EXAM.FAILED') | translate }}
    </span>
    <span class="badge rounded-pill bg-reflect-subtle text-reflect-emphasis" *ngIf="isUnderReview">
      {{ 'EXAM.UNDER_REVIEW_SHORT' | translate }}
    </span>
    <span class="badge rounded-pill bg-primary-subtle text-primary-emphasis" *ngIf="!attempt && exam && percentComplete >= 100">
      {{ 'EXAM.AVAILABLE_BADGE' | translate }}
    </span>
  `,
})
export class ExamGradeBadgeComponent {
  @Input() exam?: Exam;
  @Input() attempt?: ExamAttempt;
  @Input() percentComplete = 0;

  get isGraded(): boolean {
    return codeOf(this.attempt?.status) === AttemptStatusCode.Graded;
  }

  get isUnderReview(): boolean {
    return codeOf(this.attempt?.status) === AttemptStatusCode.Submitted;
  }

  get gradedClass(): string {
    return this.attempt?.passed
      ? 'bg-completed-subtle text-completed-emphasis'
      : 'bg-cancelled-subtle text-cancelled-emphasis';
  }
}
