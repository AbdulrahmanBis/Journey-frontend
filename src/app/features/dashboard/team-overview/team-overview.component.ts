import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AssignmentService } from '../../../core/services/assignment.service';
import { LearnerSummary, LearnerJourneyView, SeniorSummary } from '../../../core/models/models';
import { Status } from '../../../core/models/enums';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ProgressRingComponent } from '../../../shared/components/progress-ring/progress-ring.component';
import { ExamGradeBadgeComponent } from '../../../shared/components/exam-grade-badge/exam-grade-badge.component';

@Component({
  selector: 'app-team-overview',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, ProgressRingComponent, ExamGradeBadgeComponent],
  templateUrl: './team-overview.component.html',
  styleUrl: './team-overview.component.scss',
})
export class TeamOverviewComponent implements OnInit {
  @Input({ required: true }) scope!: 'senior' | 'manager';

  private auth = inject(AuthService);
  private assignments = inject(AssignmentService);
  private router = inject(Router);

  loading = true;
  learners: LearnerSummary[] = []; // senior scope
  seniors: SeniorSummary[] = []; // manager scope

  expandedLearners = new Set<string>();
  expandedSeniors = new Set<string>();

  get user() {
    return this.auth.currentUser!;
  }

  get isManagerScope(): boolean {
    return this.scope === 'manager';
  }

  ngOnInit(): void {
    if (this.scope === 'senior') {
      this.assignments.getSeniorOverview(this.user.id).subscribe((learners) => {
        this.learners = learners;
        this.loading = false;
      });
    } else {
      this.assignments.getManagerOverview().subscribe((seniors) => {
        this.seniors = seniors;
        this.loading = false;
      });
    }
  }

  toggleLearner(id: string): void {
    this.expandedLearners.has(id) ? this.expandedLearners.delete(id) : this.expandedLearners.add(id);
  }

  toggleSenior(id: string): void {
    this.expandedSeniors.has(id) ? this.expandedSeniors.delete(id) : this.expandedSeniors.add(id);
  }

  openJourney(view: LearnerJourneyView): void {
    this.router.navigate(['/journey-log', view.id]);
  }

  activeJourneyCount(journeys: LearnerJourneyView[]): number {
    return journeys.filter((j) => j.status !== Status.Completed && j.status !== Status.Cancelled).length;
  }

  avgProgress(journeys: LearnerJourneyView[]): number {
    if (!journeys.length) return 0;
    return Math.round(journeys.reduce((sum, j) => sum + j.percentComplete, 0) / journeys.length);
  }

  totalLearnerCount(seniors: SeniorSummary[]): number {
    return seniors.reduce((sum, s) => sum + s.learners.length, 0);
  }
}
