import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Exam, ExamAttempt } from '../../../core/models/models';
import { AttemptStatusCode, codeOf } from '../../../core/models/enums';

@Component({
  selector: 'app-exam-grade-badge',
  standalone: true,
  imports: [NgIf, TranslatePipe],
  template: `
    <span class="badge exam-badge graded" *ngIf="isGraded" [class.pass]="attempt!.passed" [class.fail]="!attempt!.passed">
      🎓 {{ attempt!.scorePercent }}% · {{ (attempt!.passed ? 'EXAM.PASSED' : 'EXAM.FAILED') | translate }}
    </span>
    <span class="badge exam-badge pending" *ngIf="isUnderReview">{{ 'EXAM.UNDER_REVIEW_SHORT' | translate }}</span>
    <span class="badge exam-badge ready" *ngIf="!attempt && exam && percentComplete >= 100">{{ 'EXAM.AVAILABLE_BADGE' | translate }}</span>
  `,
  styles: [],
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
}
