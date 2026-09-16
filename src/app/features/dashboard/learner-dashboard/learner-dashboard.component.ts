import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { AssignmentService } from '../../../core/services/assignment.service';
import { LearnerJourneyView } from '../../../core/models/models';
import { StatusCode, isStatus } from '../../../core/models/enums';
import { JourneyCardComponent } from '../../../shared/components/journey-card/journey-card.component';

@Component({
  selector: 'app-learner-dashboard',
  standalone: true,
  imports: [CommonModule, JourneyCardComponent, TranslatePipe],
  templateUrl: './learner-dashboard.component.html',
  styleUrl: './learner-dashboard.component.scss',
})
export class LearnerDashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private assignments = inject(AssignmentService);
  private router = inject(Router);

  journeys: LearnerJourneyView[] = [];
  loading = true;

  get user() {
    return this.auth.currentUser!;
  }

  get activeCount(): number {
    return this.journeys.filter(
      (j) => !isStatus(j.status, StatusCode.Completed) && !isStatus(j.status, StatusCode.Cancelled),
    ).length;
  }

  get completedCount(): number {
    return this.journeys.filter((j) => isStatus(j.status, StatusCode.Completed)).length;
  }

  get totalHours(): number {
    return Math.round(this.journeys.reduce((sum, j) => sum + j.totalTimeSpentHours, 0) * 10) / 10;
  }

  ngOnInit(): void {
    this.assignments.getLearnerJourneyViews(this.user.id).subscribe((views) => {
      this.journeys = views;
      this.loading = false;
    });
  }

  open(view: LearnerJourneyView): void {
    this.router.navigate(['/journey-log', view.id]);
  }
}
