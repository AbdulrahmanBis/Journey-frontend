import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { RoleCode } from '../../core/models/enums';
import { LearnerDashboardComponent } from './learner-dashboard/learner-dashboard.component';
import { TeamDashboardComponent } from './team-dashboard/team-dashboard.component';
import { AnnouncementStripComponent } from './announcement-strip/announcement-strip.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgIf, LearnerDashboardComponent, TeamDashboardComponent, AnnouncementStripComponent],
  template: `
    <app-announcement-strip></app-announcement-strip>
    <app-learner-dashboard *ngIf="isLearner"></app-learner-dashboard>
    <app-team-dashboard *ngIf="!isLearner"></app-team-dashboard>
  `,
})
export class DashboardComponent {
  private auth = inject(AuthService);

  get isLearner(): boolean {
    return this.auth.hasRole(RoleCode.Learner);
  }
}
