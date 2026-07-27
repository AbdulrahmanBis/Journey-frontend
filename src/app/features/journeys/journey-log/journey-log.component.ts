import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AssignmentService } from '../../../core/services/assignment.service';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';
import { JourneyItemView, LearnerJourneyView, User } from '../../../core/models/models';
import { STATUS_LABEL, STATUS_ORDER, Status, UserRole } from '../../../core/models/enums';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ProgressRingComponent } from '../../../shared/components/progress-ring/progress-ring.component';
import { NoteThreadComponent } from '../../../shared/components/note-thread/note-thread.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ExamGradeBadgeComponent } from '../../../shared/components/exam-grade-badge/exam-grade-badge.component';

@Component({
  selector: 'app-journey-log',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent, ProgressRingComponent, NoteThreadComponent, ConfirmDialogComponent, ExamGradeBadgeComponent],
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

  STATUS_ORDER = STATUS_ORDER;
  STATUS_LABEL = STATUS_LABEL;
  Status = Status;

  view: LearnerJourneyView | null = null;
  learner: User | null = null;
  loading = true;
  notAllowed = false;

  expandedNotes = new Set<string>();
  completingItem: JourneyItemView | null = null;
  completingHours: number | null = null;
  showCancelConfirm = false;

  get currentUser(): User { return this.auth.currentUser!; }

  get completedCount(): number {
    return this.view?.items.filter((i) => i.progress.status === Status.Completed).length ?? 0;
  }

  get isOwnView(): boolean { return this.currentUser.role === UserRole.Learner; }

  get canOverrideJourneyStatus(): boolean {
    return this.auth.hasRole(UserRole.Manager, UserRole.Admin);
  }

  get canManageExam(): boolean {
    return this.auth.hasRole(UserRole.Senior, UserRole.Manager, UserRole.Admin);
  }

  get isReviewer(): boolean { return this.currentUser.role !== UserRole.Learner; }

  get examCtaLabel(): string {
    if (!this.view?.exam || this.view.percentComplete < 100) return '';
    const attempt = this.view.examAttempt;
    if (!attempt) return this.isReviewer ? '' : 'Take exam';
    if (attempt.status === 'submitted') return this.isReviewer ? 'Review exam' : 'View submission';
    return 'View exam result';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.assignments.getLearnerJourneyView(id).subscribe({
      next: (view) => {
        this.view = view;
        this.userService.getById(view.learnerId).subscribe((u) => (this.learner = u));
        this.loading = false;
      },
      error: () => { this.toast.error('Quest log not found.'); this.router.navigate(['/dashboard']); },
    });
  }

  private refresh(): void {
    if (!this.view) return;
    this.assignments.getLearnerJourneyView(this.view.id).subscribe((view) => { this.view = view; });
  }

  toggleNotes(itemId: string): void {
    this.expandedNotes.has(itemId) ? this.expandedNotes.delete(itemId) : this.expandedNotes.add(itemId);
  }

  setItemStatus(item: JourneyItemView, status: Status): void {
    if (status === item.progress.status) return;
    if (status === Status.Completed) { this.completingItem = item; this.completingHours = null; return; }
    this.assignments.updateItemStatus(item.progress.id, status, this.currentUser).subscribe({
      next: () => { this.toast.success(`Marked ${STATUS_LABEL[status].toLowerCase()}.`); this.refresh(); },
      error: (err: any) => this.toast.error(err?.error?.message ?? 'Update failed.'),
    });
  }

  confirmCompletion(): void {
    if (!this.completingItem || !this.completingHours || this.completingHours <= 0) return;
    this.assignments.updateItemStatus(this.completingItem.progress.id, Status.Completed, this.currentUser, this.completingHours).subscribe({
      next: () => {
        this.toast.success(`"${this.completingItem!.title}" completed in ${this.completingHours}h!`);
        this.completingItem = null;
        this.completingHours = null;
        this.refresh();
      },
      error: (err: any) => this.toast.error(err?.error?.message ?? 'Update failed.'),
    });
  }

  cancelCompletionModal(): void { this.completingItem = null; this.completingHours = null; }

  addNote(item: JourneyItemView, message: string): void {
    this.assignments.addNote(item.progress.id, message, this.currentUser).subscribe({
      next: () => { this.toast.success('Note added.'); this.refresh(); },
      error: (err: any) => this.toast.error(err?.error?.message ?? 'Note failed.'),
    });
  }

  setJourneyStatus(status: Status): void {
    if (!this.view) return;
    if (status === Status.Cancelled) { this.showCancelConfirm = true; return; }
    this.assignments.updateJourneyStatus(this.view.id, status).subscribe({
      next: () => { this.toast.success(`Journey status → ${STATUS_LABEL[status]}.`); this.refresh(); },
      error: (err: any) => this.toast.error(err?.error?.message ?? 'Update failed.'),
    });
  }

  confirmCancelJourney(): void {
    if (!this.view) return;
    this.assignments.updateJourneyStatus(this.view.id, Status.Cancelled).subscribe({
      next: () => { this.toast.success('Journey cancelled.'); this.showCancelConfirm = false; this.refresh(); },
      error: (err: any) => this.toast.error(err?.error?.message ?? 'Cancel failed.'),
    });
  }
}
