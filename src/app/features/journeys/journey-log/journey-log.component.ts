import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { AssignmentService } from '../../../core/services/assignment.service';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';
import { LanguageService } from '../../../core/services/language.service';
import { JourneyItemView, LearnerJourneyView, User } from '../../../core/models/models';
import {
  AttemptStatusCode,
  EnumValue,
  RoleCode,
  STATUS_ORDER,
  StatusCode,
  codeOf,
  isStatus,
  statusSlug,
} from '../../../core/models/enums';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ProgressRingComponent } from '../../../shared/components/progress-ring/progress-ring.component';
import { NoteThreadComponent } from '../../../shared/components/note-thread/note-thread.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ExamGradeBadgeComponent } from '../../../shared/components/exam-grade-badge/exam-grade-badge.component';
import { AttachmentViewComponent } from '../../../shared/components/attachment-view/attachment-view.component';

@Component({
  selector: 'app-journey-log',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent, ProgressRingComponent, NoteThreadComponent, ConfirmDialogComponent, ExamGradeBadgeComponent, AttachmentViewComponent, TranslatePipe],
  templateUrl: './journey-log.component.html',
  styleUrl: './journey-log.component.scss',
})
export class JourneyLogComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private assignments = inject(AssignmentService);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);

  STATUS_ORDER = STATUS_ORDER;
  StatusCode = StatusCode;
  statusSlug = statusSlug;

  view: LearnerJourneyView | null = null;
  learner: User | null = null;
  loading = true;
  notAllowed = false;

  expandedNotes = new Set<string>();
  completingItem: JourneyItemView | null = null;
  completingHours: number | null = null;
  showCancelConfirm = false;

  get currentUser(): User { return this.auth.currentUser!; }

  /** Status wording comes from the enum triple, so it follows the active language. */
  statusLabel(status: EnumValue | null | undefined): string {
    return this.lang.label(status);
  }

  get completedCount(): number {
    return this.view?.items.filter((i) => isStatus(i.progress.status, StatusCode.Completed)).length ?? 0;
  }

  get isOwnView(): boolean { return this.auth.hasRole(RoleCode.Learner); }

  get canOverrideJourneyStatus(): boolean {
    return this.auth.hasRole(RoleCode.Manager, RoleCode.Admin);
  }

  get canManageExam(): boolean {
    return this.auth.hasRole(RoleCode.Senior, RoleCode.Manager, RoleCode.Admin);
  }

  get isReviewer(): boolean { return !this.auth.hasRole(RoleCode.Learner); }

  isCompleted(item: JourneyItemView): boolean {
    return isStatus(item.progress.status, StatusCode.Completed);
  }

  isCurrent(status: EnumValue, current: EnumValue | undefined): boolean {
    return codeOf(current) === status.code;
  }

  /**
   * Item descriptions used to be plain text with one bullet per line; the editor now produces HTML.
   * Both shapes exist in the database, so legacy text keeps its bullet rendering instead of having
   * its line breaks collapse. Angular sanitizes the HTML branch, stripping scripts and handlers.
   */
  isRichText(description: string | null | undefined): boolean {
    return /<[a-z][\s\S]*>/i.test(description ?? '');
  }

  plainLines(description: string | null | undefined): string[] {
    return (description ?? '').split('\n').filter((line) => line.trim().length > 0);
  }

  get completeModalTitle(): string {
    return this.translate.instant('QUEST_LOG.COMPLETE_TITLE', { title: this.completingItem?.title ?? '' });
  }

  get examCtaLabel(): string {
    if (!this.view?.exam || this.view.percentComplete < 100) return '';
    const attempt = this.view.examAttempt;
    if (!attempt) return this.isReviewer ? '' : this.translate.instant('QUEST_LOG.TAKE_EXAM');
    if (codeOf(attempt.status) === AttemptStatusCode.Submitted) {
      return this.translate.instant(this.isReviewer ? 'QUEST_LOG.REVIEW_EXAM' : 'QUEST_LOG.VIEW_SUBMISSION');
    }
    return this.translate.instant('QUEST_LOG.VIEW_RESULT');
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.assignments.getLearnerJourneyView(id).subscribe({
      next: (view) => {
        this.view = view;
        this.userService.getById(view.learnerId).subscribe((u) => (this.learner = u));
        this.loading = false;
      },
      error: () => {
        this.toast.error(this.translate.instant('QUEST_LOG.NOT_FOUND'));
        this.router.navigate(['/dashboard']);
      },
    });
  }

  private refresh(): void {
    if (!this.view) return;
    this.assignments.getLearnerJourneyView(this.view.id).subscribe((view) => { this.view = view; });
  }

  toggleNotes(itemId: string): void {
    this.expandedNotes.has(itemId) ? this.expandedNotes.delete(itemId) : this.expandedNotes.add(itemId);
  }

  setItemStatus(item: JourneyItemView, status: EnumValue): void {
    if (codeOf(item.progress.status) === status.code) return;
    if (status.code === StatusCode.Completed) { this.completingItem = item; this.completingHours = null; return; }
    this.assignments.updateItemStatus(item.progress.id, status.code, this.currentUser).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('QUEST_LOG.MARKED_STATUS', {
          status: this.statusLabel(status).toLowerCase(),
        }));
        this.refresh();
      },
      error: (err: any) => this.toast.error(err?.error?.message ?? this.translate.instant('COMMON.UPDATE_FAILED')),
    });
  }

  confirmCompletion(): void {
    if (!this.completingItem || !this.completingHours || this.completingHours <= 0) return;
    const title = this.completingItem.title;
    const hours = this.completingHours;
    this.assignments.updateItemStatus(this.completingItem.progress.id, StatusCode.Completed, this.currentUser, hours).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('QUEST_LOG.COMPLETED_IN', { title, hours }));
        this.completingItem = null;
        this.completingHours = null;
        this.refresh();
      },
      error: (err: any) => this.toast.error(err?.error?.message ?? this.translate.instant('COMMON.UPDATE_FAILED')),
    });
  }

  cancelCompletionModal(): void { this.completingItem = null; this.completingHours = null; }

  addNote(item: JourneyItemView, message: string): void {
    this.assignments.addNote(item.progress.id, message, this.currentUser).subscribe({
      next: () => { this.toast.success(this.translate.instant('QUEST_LOG.NOTE_ADDED')); this.refresh(); },
      error: (err: any) => this.toast.error(err?.error?.message ?? this.translate.instant('QUEST_LOG.NOTE_FAILED')),
    });
  }

  setJourneyStatus(status: EnumValue): void {
    if (!this.view) return;
    if (status.code === StatusCode.Cancelled) { this.showCancelConfirm = true; return; }
    this.assignments.updateJourneyStatus(this.view.id, status.code).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('QUEST_LOG.STATUS_CHANGED', { status: this.statusLabel(status) }));
        this.refresh();
      },
      error: (err: any) => this.toast.error(err?.error?.message ?? this.translate.instant('COMMON.UPDATE_FAILED')),
    });
  }

  confirmCancelJourney(): void {
    if (!this.view) return;
    this.assignments.updateJourneyStatus(this.view.id, StatusCode.Cancelled).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('QUEST_LOG.CANCELLED'));
        this.showCancelConfirm = false;
        this.refresh();
      },
      error: (err: any) => this.toast.error(err?.error?.message ?? this.translate.instant('QUEST_LOG.CANCEL_FAILED')),
    });
  }
}
