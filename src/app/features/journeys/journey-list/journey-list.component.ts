import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { JourneyService } from '../../../core/services/journey.service';
import { AssignmentService } from '../../../core/services/assignment.service';
import { UserService } from '../../../core/services/user.service';
import { ExamService } from '../../../core/services/exam.service';
import { ToastService } from '../../../core/services/toast.service';
import { Journey, User } from '../../../core/models/models';
import { UserRole } from '../../../core/models/enums';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-journey-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './journey-list.component.html',
  styleUrl: './journey-list.component.scss',
})
export class JourneyListComponent implements OnInit {
  private auth = inject(AuthService);
  private journeyService = inject(JourneyService);
  private assignments = inject(AssignmentService);
  private userService = inject(UserService);
  private examService = inject(ExamService);
  private toast = inject(ToastService);
  private router = inject(Router);

  journeys: Journey[] = [];
  loading = true;

  // exam presence cache: journeyId → boolean
  examMap: Record<string, boolean> = {};

  // Assign modal
  assigningJourney: Journey | null = null;
  availableLearners: User[] = [];
  selectedLearnerId = '';
  assigning = false;

  // Delete confirm
  deletingJourney: Journey | null = null;

  get user() { return this.auth.currentUser!; }

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.loading = true;
    this.journeyService.getJourneys().subscribe({
      next: (journeys) => {
        this.journeys = journeys;
        this.loading = false;
        // Load exam state for each journey to show the + Exam / Exam button correctly
        journeys.forEach((j) => {
          this.examService.getExamForJourney(j.id).subscribe((exam) => {
            this.examMap[j.id] = !!exam;
          });
        });
      },
      error: () => { this.loading = false; this.toast.error('Could not load journeys.'); },
    });
  }

  hasExam(journeyId: string): boolean { return !!this.examMap[journeyId]; }

  edit(journey: Journey): void { this.router.navigate(['/journeys', journey.id, 'edit']); }

  askDelete(journey: Journey): void { this.deletingJourney = journey; }

  confirmDelete(): void {
    if (!this.deletingJourney) return;
    const title = this.deletingJourney.title;
    this.journeyService.deleteJourney(this.deletingJourney.id).subscribe({
      next: () => { this.deletingJourney = null; this.toast.success(`"${title}" deleted.`); this.refresh(); },
      error: (err: any) => { this.toast.error(err?.error?.message ?? 'Delete failed.'); },
    });
  }

  openAssign(journey: Journey): void {
    this.assigningJourney = journey;
    this.selectedLearnerId = '';
    const source = this.user.role === UserRole.Senior
      ? this.userService.getLearnersBySenior(this.user.id)
      : this.userService.getLearners();
    source.subscribe((learners) => (this.availableLearners = learners));
  }

  closeAssign(): void { this.assigningJourney = null; }

  confirmAssign(): void {
    if (!this.assigningJourney || !this.selectedLearnerId) return;
    this.assigning = true;
    this.assignments.assignJourney(this.assigningJourney.id, this.selectedLearnerId, this.user).subscribe({
      next: () => {
        this.assigning = false;
        const learner = this.availableLearners.find((l) => l.id === this.selectedLearnerId);
        this.toast.success(`Assigned "${this.assigningJourney!.title}" to ${learner?.name}.`);
        this.closeAssign();
      },
      error: (err: any) => { this.assigning = false; this.toast.error(err?.error?.message ?? 'Assignment failed.'); },
    });
  }
}
