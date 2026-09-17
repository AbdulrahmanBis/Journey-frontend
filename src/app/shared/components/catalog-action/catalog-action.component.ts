import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { CatalogService } from '../../../core/services/catalog.service';
import { AssignmentService } from '../../../core/services/assignment.service';
import { PackageService } from '../../../core/services/package.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { CatalogEntry } from '../../../core/models/models';
import { CatalogTypeCode, LearningStatusCode, STAFF_ROLES, codeOf } from '../../../core/models/enums';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { AssignChoice, AssignLearnerModalComponent } from '../assign-learner-modal/assign-learner-modal.component';
import { apiErrorMessage } from '../../../core/services/api-error';

type Action = 'enroll' | 'continue' | 'review' | 'enrollAgain' | 'assign' | 'none';

/**
 * The one button a catalog entry needs, for whoever is looking:
 *
 *   learner, not started → Enroll        (confirms, names the reviewer)
 *   learner, in progress → Continue      (opens the journey log)
 *   learner, completed   → Review        (opens it again)
 *   learner, cancelled   → Enroll again
 *   staff                → Assign        (pick a learner)
 *
 * Shared by the catalog card and the detail page so the rules live in one place. Emits `changed`
 * after an enrollment or assignment that stays on the page, so the parent can refresh.
 */
@Component({
  selector: 'app-catalog-action',
  standalone: true,
  imports: [NgIf, TranslatePipe, ConfirmDialogComponent, AssignLearnerModalComponent],
  template: `
    <button
      *ngIf="action !== 'none'"
      type="button"
      class="btn"
      [class.btn-sm]="small"
      [class.btn-primary]="action === 'enroll' || action === 'continue' || action === 'assign'"
      [class.btn-outline-primary]="action === 'review' || action === 'enrollAgain'"
      [disabled]="busy || blockedForLearner"
      [title]="blockedForLearner ? ('CATALOG.NO_REVIEWER' | translate) : ''"
      (click)="run(); $event.stopPropagation()"
    >
      {{ labelKey | translate }}
    </button>

    <app-confirm-dialog
      [open]="confirming"
      [title]="'CATALOG.ENROLL_TITLE' | translate: { title: entry.title }"
      [message]="'CATALOG.ENROLL_MESSAGE' | translate: { reviewer: reviewerName ?? '' }"
      [confirmLabel]="'CATALOG.ENROLL' | translate"
      (confirmed)="enroll()"
      (cancelled)="confirming = false"
    ></app-confirm-dialog>

    <app-assign-learner-modal
      [open]="assigning"
      [title]="'PACKAGE.ASSIGN_TITLE' | translate: { title: entry.title }"
      [subtitle]="(isPackage ? 'PACKAGE.ASSIGN_SUB' : 'JOURNEY.ASSIGN_SUB') | translate"
      [busy]="busy"
      [targetDays]="entry.targetDays"
      (confirmed)="assign($event)"
      (dismissed)="assigning = false"
    ></app-assign-learner-modal>
  `,
})
export class CatalogActionComponent {
  private router = inject(Router);
  private auth = inject(AuthService);
  private catalog = inject(CatalogService);
  private assignments = inject(AssignmentService);
  private packages = inject(PackageService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  @Input({ required: true }) entry!: CatalogEntry;
  /** Learner's reviewer; enrolling is refused without one. */
  @Input() reviewerName?: string | null;
  @Input() small = false;
  @Output() changed = new EventEmitter<void>();

  confirming = false;
  assigning = false;
  busy = false;

  get isPackage(): boolean { return codeOf(this.entry.type) === CatalogTypeCode.Package; }

  get action(): Action {
    const mine = this.entry.mine;
    if (!mine) return this.auth.hasRole(...STAFF_ROLES) ? 'assign' : 'none';
    switch (codeOf(mine.status)) {
      case LearningStatusCode.InProgress: return 'continue';
      case LearningStatusCode.Completed: return 'review';
      case LearningStatusCode.Cancelled: return 'enrollAgain';
      default: return 'enroll';
    }
  }

  get labelKey(): string {
    return {
      enroll: 'CATALOG.ENROLL', continue: 'CATALOG.CONTINUE', review: 'CATALOG.REVIEW',
      enrollAgain: 'CATALOG.ENROLL_AGAIN', assign: 'COMMON.ASSIGN', none: '',
    }[this.action];
  }

  /** Enrolling needs someone to review the work. */
  get blockedForLearner(): boolean {
    return (this.action === 'enroll' || this.action === 'enrollAgain') && !this.reviewerName;
  }

  run(): void {
    switch (this.action) {
      case 'enroll':
      case 'enrollAgain':
        this.confirming = true;
        break;
      case 'assign':
        this.assigning = true;
        break;
      default:
        this.openMine();
    }
  }

  /** Continue / Review: a journey opens its log; a package opens the dashboard, where it is grouped. */
  private openMine(): void {
    const mine = this.entry.mine;
    if (mine?.learnerJourneyId) this.router.navigate(['/journey-log', mine.learnerJourneyId]);
    else this.router.navigate(['/dashboard']);
  }

  enroll(): void {
    this.confirming = false;
    this.busy = true;
    this.catalog.enroll(codeOf(this.entry.type)!, this.entry.id).subscribe({
      next: (result) => {
        this.busy = false;
        this.toast.success(this.translate.instant('CATALOG.ENROLLED', { title: this.entry.title }));
        if (result.learnerJourneyId) this.router.navigate(['/journey-log', result.learnerJourneyId]);
        else this.changed.emit();
      },
      error: (err: any) => {
        this.busy = false;
        this.toast.error(apiErrorMessage(err) ?? this.translate.instant('CATALOG.ENROLL_FAILED'));
      },
    });
  }

  assign({ learner, dueDate }: AssignChoice): void {
    this.busy = true;
    const request: Observable<unknown> = this.isPackage
      ? this.packages.assign(this.entry.id, learner.id, dueDate)
      : this.assignments.assignJourney(this.entry.id, learner.id, this.auth.currentUser!, dueDate);
    request.subscribe({
      next: () => {
        this.busy = false;
        this.assigning = false;
        this.toast.success(this.translate.instant('PACKAGE.ASSIGNED', { title: this.entry.title, name: learner.name }));
        this.changed.emit();
      },
      error: (err: any) => {
        this.busy = false;
        this.toast.error(apiErrorMessage(err) ?? this.translate.instant('JOURNEY.ASSIGN_FAILED'));
      },
    });
  }
}
