import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { RoleCode } from '../../core/models/enums';
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
    return this.auth.hasRole(RoleCode.Learner);
  }

  get scope(): 'senior' | 'manager' {
    return this.auth.hasRole(RoleCode.Senior) ? 'senior' : 'manager';
  }
}
