import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { LearnerJourneyView } from '../../../core/models/models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { ProgressRingComponent } from '../progress-ring/progress-ring.component';
import { ExamGradeBadgeComponent } from '../exam-grade-badge/exam-grade-badge.component';
import { DueBadgeComponent } from '../due-badge/due-badge.component';
import { StatusCode, isStatus } from '../../../core/models/enums';

/**
 * One learner's journey as a card: tag, status, title, exam state, progress and hours.
 *
 * Shared by the learner dashboard and the team overview, which carried two copies of this
 * markup. Purely presentational — it reports a click and lets the page decide what opening
 * a journey means.
 */
@Component({
  selector: 'app-journey-card',
  standalone: true,
  imports: [NgIf, TranslatePipe, StatusBadgeComponent, ProgressRingComponent, ExamGradeBadgeComponent, DueBadgeComponent],
  templateUrl: './journey-card.component.html',
})
export class JourneyCardComponent {
  @Input({ required: true }) view!: LearnerJourneyView;
  /** Smaller ring and no description — used inside the team overview's nested rows. */
  @Input() compact = false;
  @Output() opened = new EventEmitter<LearnerJourneyView>();

  get closed(): boolean {
    return isStatus(this.view.status, StatusCode.Completed) || isStatus(this.view.status, StatusCode.Cancelled);
  }
}
