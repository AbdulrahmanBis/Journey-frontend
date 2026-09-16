import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { LearnerJourneyView, PackageAssignment } from '../../../core/models/models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { JourneyCardComponent } from '../journey-card/journey-card.component';

/**
 * A package on a dashboard: its title, overall progress, and its journeys as ordinary journey
 * cards in package order. Use {@link groupByPackage} to split a learner's journeys first.
 */
@Component({
  selector: 'app-package-group',
  standalone: true,
  imports: [NgFor, NgIf, TranslatePipe, StatusBadgeComponent, JourneyCardComponent],
  template: `
    <section class="card card-body gap-3 border-navy-subtle">
      <div class="d-flex flex-wrap align-items-start gap-2">
        <div class="flex-grow-1 overflow-hidden">
          <span class="page-eyebrow">{{ 'PACKAGE.SINGULAR' | translate }}</span>
          <h3 class="mb-0 user-content" [class.fs-5]="!compact" [class.fs-6]="compact">{{ assignment.title }}</h3>
          <p class="small text-body-secondary text-clamp-2 user-content mb-0 mt-1" *ngIf="!compact && assignment.description">
            {{ assignment.description }}
          </p>
        </div>
        <app-status-badge [status]="assignment.status"></app-status-badge>
        <button *ngIf="canCancel" class="btn btn-sm btn-outline-danger" (click)="cancel.emit(assignment)">
          {{ 'PACKAGE.CANCEL' | translate }}
        </button>
      </div>

      <div>
        <div class="d-flex justify-content-between small text-body-secondary mb-1" dir="auto">
          <span>{{ 'PACKAGE.JOURNEYS_DONE' | translate: { done: assignment.completedJourneys, total: assignment.totalJourneys } }}</span>
          <span class="fw-semibold">{{ assignment.percentComplete }}%</span>
        </div>
        <div class="progress" role="progressbar" [attr.aria-valuenow]="assignment.percentComplete" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar" [style.width.%]="assignment.percentComplete"></div>
        </div>
      </div>

      <div class="row row-cols-1 row-cols-md-2 g-3" [class.row-cols-xl-3]="!compact" [class.row-cols-xxl-3]="compact">
        <div class="col" *ngFor="let view of views">
          <app-journey-card [view]="view" [compact]="compact" (opened)="opened.emit($event)"></app-journey-card>
        </div>
      </div>
    </section>
  `,
})
export class PackageGroupComponent {
  @Input({ required: true }) assignment!: PackageAssignment;
  /** This package's journey views, in package order. */
  @Input({ required: true }) views: LearnerJourneyView[] = [];
  @Input() compact = false;
  @Input() canCancel = false;
  @Output() opened = new EventEmitter<LearnerJourneyView>();
  @Output() cancel = new EventEmitter<PackageAssignment>();
}

export interface JourneyGroups {
  packages: { assignment: PackageAssignment; views: LearnerJourneyView[] }[];
  /** Journeys that aren't in any live package. */
  standalone: LearnerJourneyView[];
}

/**
 * Splits a learner's journeys into their live packages (in package order) and the rest. Cancelled
 * packages aren't shown as groups; their journeys fall back to the standalone list with their own
 * status. A journey in two live packages appears in both.
 */
export function groupByPackage(views: LearnerJourneyView[], assignments: PackageAssignment[] = []): JourneyGroups {
  const byId = new Map(views.map((v) => [v.id, v]));
  const grouped = new Set<string>();
  const packages = assignments
    .filter((a) => !a.cancelledAt)
    .map((assignment) => {
      const members = assignment.journeys
        .map((j) => byId.get(j.learnerJourneyId))
        .filter((v): v is LearnerJourneyView => !!v);
      members.forEach((v) => grouped.add(v.id));
      return { assignment, views: members };
    });
  return { packages, standalone: views.filter((v) => !grouped.has(v.id)) };
}
