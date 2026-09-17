import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LearnerUnitService } from '../../../core/services/learner-unit.service';
import { LanguageService } from '../../../core/services/language.service';
import { ToastService } from '../../../core/services/toast.service';
import { OutlineUnit } from '../../../core/models/models';
import { EnumValue, STATUS_ORDER, StatusCode, codeOf, statusSlug, toggleButtonClass } from '../../../core/models/enums';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { NoteThreadComponent } from '../../../shared/components/note-thread/note-thread.component';

/**
 * A unit's review: where it stands, the reviewer's status control, the learner's "send for review",
 * and the unit-level discussion (review feedback).
 */
@Component({
  selector: 'app-unit-review',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, TranslatePipe, StatusBadgeComponent, NoteThreadComponent],
  template: `
    <div class="card card-body gap-3">
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
        <div class="overflow-hidden">
          <span class="page-eyebrow">{{ 'LOG.UNIT_N' | translate: { n: unit.order } }}</span>
          <h2 class="h4 mb-1 user-content">{{ unit.title }}</h2>
          <p class="text-body-secondary mb-0 user-content" *ngIf="unit.description && !compact">{{ unit.description }}</p>
        </div>
        <app-status-badge [status]="unit.status"></app-status-badge>
      </div>

      <div class="d-flex flex-wrap gap-4 small" dir="auto">
        <span>{{ 'LOG.ITEMS_DONE' | translate: { done: unit.completedItems, total: unit.totalItems } }}</span>
        <span *ngIf="unit.quiz">{{ 'LOG.QUIZ' | translate }}: {{ unit.quiz.answered ? unit.quiz.scorePercent + '%' : ('LOG.QUIZ_NOT_TAKEN_SHORT' | translate) }}</span>
      </div>

      <!-- Learner -->
      <ng-container *ngIf="isLearner">
        <div class="alert alert-info small mb-0" *ngIf="isWaiting">{{ 'LOG.WAITING_REVIEW' | translate }}</div>
        <div class="alert alert-success small mb-0" *ngIf="isCompleted">{{ 'LOG.UNIT_COMPLETED' | translate }}</div>
        <div *ngIf="canSend">
          <p class="small text-body-secondary mb-2">{{ 'LOG.READY_HINT' | translate }}</p>
          <button type="button" class="btn btn-primary" [disabled]="busy" (click)="send()">{{ 'LOG.SEND_FOR_REVIEW' | translate }}</button>
        </div>
      </ng-container>

      <!-- Reviewer -->
      <div *ngIf="isReviewer" class="pt-3 border-top">
        <div class="small text-body-tertiary mb-2">{{ 'LOG.SET_UNIT_STATUS' | translate }}</div>
        <div class="d-flex flex-wrap gap-2">
          <button
            type="button"
            class="btn btn-sm rounded-pill"
            *ngFor="let s of statuses"
            [ngClass]="toggleButtonClass(codeOf(unit.status) === s.code, statusSlug(s))"
            [disabled]="busy"
            (click)="setStatus(s)"
          >
            {{ lang.label(s) }}
          </button>
        </div>
        <p class="small text-body-tertiary mt-2 mb-0">{{ 'LOG.SEND_BACK_HINT' | translate }}</p>
      </div>

      <div class="pt-3 border-top">
        <h3 class="h6 mb-2">{{ 'LOG.UNIT_DISCUSSION' | translate }}</h3>
        <app-note-thread [notes]="unit.notes" [currentUserId]="currentUserId" (noteAdded)="addNote($event)"></app-note-thread>
      </div>
    </div>
  `,
})
export class UnitReviewComponent {
  private units = inject(LearnerUnitService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  lang = inject(LanguageService);

  @Input({ required: true }) unit!: OutlineUnit;
  @Input() isLearner = false;
  @Input() isReviewer = false;
  @Input() currentUserId = '';
  /** Leave out the description when shown under an item. */
  @Input() compact = false;
  /** Something changed on the server; the page reloads its outline. */
  @Output() changed = new EventEmitter<void>();

  readonly statuses = STATUS_ORDER;
  readonly statusSlug = statusSlug;
  readonly toggleButtonClass = toggleButtonClass;
  readonly codeOf = codeOf;
  busy = false;

  get isWaiting(): boolean { return codeOf(this.unit.status) === StatusCode.Response; }
  get isCompleted(): boolean { return codeOf(this.unit.status) === StatusCode.Completed; }

  /** Finished but not with the reviewer — typically after being sent back. */
  get canSend(): boolean {
    const code = codeOf(this.unit.status);
    return this.unit.readyForReview && (code === StatusCode.New || code === StatusCode.Reflect);
  }

  send(): void {
    this.busy = true;
    this.units.submitUnit(this.unit.learnerUnitId).subscribe({
      next: () => { this.busy = false; this.toast.success(this.translate.instant('LOG.SENT_FOR_REVIEW')); this.changed.emit(); },
      error: (err: any) => { this.busy = false; this.toast.error(err?.error?.message ?? this.translate.instant('COMMON.UPDATE_FAILED')); },
    });
  }

  setStatus(status: EnumValue): void {
    if (codeOf(this.unit.status) === status.code) return;
    this.busy = true;
    this.units.setUnitStatus(this.unit.learnerUnitId, status.code).subscribe({
      next: () => {
        this.busy = false;
        this.toast.success(this.translate.instant('LOG.UNIT_STATUS_SAVED', { status: this.lang.label(status) }));
        this.changed.emit();
      },
      error: (err: any) => { this.busy = false; this.toast.error(err?.error?.message ?? this.translate.instant('COMMON.UPDATE_FAILED')); },
    });
  }

  addNote(message: string): void {
    this.units.addUnitNote(this.unit.learnerUnitId, message).subscribe({
      next: () => { this.toast.success(this.translate.instant('QUEST_LOG.NOTE_ADDED')); this.changed.emit(); },
      error: (err: any) => this.toast.error(err?.error?.message ?? this.translate.instant('QUEST_LOG.NOTE_FAILED')),
    });
  }
}
