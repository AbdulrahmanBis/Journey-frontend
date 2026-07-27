import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/enums';
import { LearnerDashboardComponent } from './learner-dashboard/learner-dashboard.component';
import { TeamOverviewComponent } from './team-overview/team-overview.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgIf, LearnerDashboardComponent, TeamOverviewComponent],
  template: `
    <app-learner-dashboard *ngIf="isLearner"></app-learner-dashboard>
    <app-team-overview *ngIf="!isLearner" [scope]="scope"></app-team-overview>
  `,
})
export class DashboardComponent {
  private auth = inject(AuthService);

  get isLearner(): boolean {
    return this.auth.currentUser?.role === UserRole.Learner;
  }

  get scope(): 'senior' | 'manager' {
    return this.auth.currentUser?.role === UserRole.Senior ? 'senior' : 'manager';
  }
}
