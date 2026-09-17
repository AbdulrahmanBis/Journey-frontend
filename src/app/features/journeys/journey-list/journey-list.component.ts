import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { JourneyService } from '../../../core/services/journey.service';
import { AssignmentService } from '../../../core/services/assignment.service';
import { ToastService } from '../../../core/services/toast.service';
import { Journey } from '../../../core/models/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AssignChoice, AssignLearnerModalComponent } from '../../../shared/components/assign-learner-modal/assign-learner-modal.component';
import { JourneysTabsComponent } from '../journeys-tabs/journeys-tabs.component';

@Component({
  selector: 'app-journey-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ConfirmDialogComponent, AssignLearnerModalComponent, JourneysTabsComponent, TranslatePipe],
  templateUrl: './journey-list.component.html',
})
export class JourneyListComponent implements OnInit {
  private auth = inject(AuthService);
  private journeyService = inject(JourneyService);
  private assignments = inject(AssignmentService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  journeys: Journey[] = [];
  loading = true;

  // Assign modal
  assigningJourney: Journey | null = null;
  assigning = false;

  // Delete confirm
  deletingJourney: Journey | null = null;

  get user() { return this.auth.currentUser!; }

  get deleteMessage(): string {
    return this.translate.instant('JOURNEY.DELETE_MESSAGE', { title: this.deletingJourney?.title ?? '' });
  }

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.loading = true;
    this.journeyService.getJourneys().subscribe({
      next: (journeys) => {
        this.journeys = journeys;
        this.loading = false;
      },
      error: () => { this.loading = false; this.toast.error(this.translate.instant('JOURNEY.LOAD_FAILED')); },
    });
  }

  edit(journey: Journey): void { this.router.navigate(['/journeys', journey.id, 'edit']); }

  askDelete(journey: Journey): void { this.deletingJourney = journey; }

  confirmDelete(): void {
    if (!this.deletingJourney) return;
    const title = this.deletingJourney.title;
    this.journeyService.deleteJourney(this.deletingJourney.id).subscribe({
      next: () => {
        this.deletingJourney = null;
        this.toast.success(this.translate.instant('JOURNEY.DELETED', { title }));
        this.refresh();
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message ?? this.translate.instant('COMMON.DELETE_FAILED'));
      },
    });
  }

  openAssign(journey: Journey): void { this.assigningJourney = journey; }

  closeAssign(): void { this.assigningJourney = null; }

  confirmAssign({ learner, dueDate }: AssignChoice): void {
    if (!this.assigningJourney) return;
    this.assigning = true;
    const title = this.assigningJourney.title;
    this.assignments.assignJourney(this.assigningJourney.id, learner.id, this.user, dueDate).subscribe({
      next: () => {
        this.assigning = false;
        this.toast.success(this.translate.instant('JOURNEY.ASSIGNED', { title, name: learner.name }));
        this.closeAssign();
      },
      error: (err: any) => {
        this.assigning = false;
        this.toast.error(err?.error?.message ?? this.translate.instant('JOURNEY.ASSIGN_FAILED'));
      },
    });
  }
}
