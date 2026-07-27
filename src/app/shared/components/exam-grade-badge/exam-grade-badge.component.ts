import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { Exam, ExamAttempt } from '../../../core/models/models';

@Component({
  selector: 'app-exam-grade-badge',
  standalone: true,
  imports: [NgIf],
  template: `
    <span class="badge exam-badge graded" *ngIf="attempt?.status === 'graded'" [class.pass]="attempt!.passed" [class.fail]="!attempt!.passed">
      🎓 {{ attempt!.scorePercent }}% · {{ attempt!.passed ? 'Passed' : 'Failed' }}
    </span>
    <span class="badge exam-badge pending" *ngIf="attempt?.status === 'submitted'">⏳ Exam under review</span>
    <span class="badge exam-badge ready" *ngIf="!attempt && exam && percentComplete >= 100">🎓 Exam available</span>
  `,
  styles: [],
})
export class ExamGradeBadgeComponent {
  @Input() exam?: Exam;
  @Input() attempt?: ExamAttempt;
  @Input() percentComplete = 0;
}
