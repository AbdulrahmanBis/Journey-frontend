import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { AssignmentService } from '../../../core/services/assignment.service';
import { LearnerJourneyView } from '../../../core/models/models';
import { StatusCode, isStatus } from '../../../core/models/enums';
import { JourneyCardComponent } from '../../../shared/components/journey-card/journey-card.component';
import { JourneyGroups, PackageGroupComponent, groupByPackage } from '../../../shared/components/package-group/package-group.component';
import { PackageService } from '../../../core/services/package.service';
import { forkJoin } from 'rxjs';
import { RouterLink } from '@angular/router';
import { HomeTask, LearnerHome, learnerHome } from './learner-home';
import { DueBadgeComponent } from '../../../shared/components/due-badge/due-badge.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-learner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, JourneyCardComponent, PackageGroupComponent, DueBadgeComponent, TimeAgoPipe, TranslatePipe],
  templateUrl: './learner-dashboard.component.html',
  styleUrl: './learner-dashboard.component.scss',
})
export class LearnerDashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private assignments = inject(AssignmentService);
  private packageService = inject(PackageService);
  private router = inject(Router);

  journeys: LearnerJourneyView[] = [];
  groups: JourneyGroups = { packages: [], standalone: [] };
  home: LearnerHome = { nextUp: null, myTurn: [], waiting: [] };
  /** Lists stay short; the journeys below hold everything. */
  readonly listLimit = 5;
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
    forkJoin({
      views: this.assignments.getLearnerJourneyViews(this.user.id),
      packages: this.packageService.assignmentsFor(this.user.id),
    }).subscribe(({ views, packages }) => {
      this.journeys = views;
      this.groups = groupByPackage(views, packages);
      this.home = learnerHome(views, this.user.id);
      this.loading = false;
    });
  }

  /** Where a task is done: the exam page, or the journey log scrolled to the item. */
  go(task: HomeTask): void {
    if (task.kind === 'exam' || task.kind === 'examReview') {
      this.router.navigate(['/exam', task.view.id]);
      return;
    }
    const queryParams = task.item ? { item: task.item.progress.id }
      : task.kind === 'quiz' && task.unit?.learnerUnitId ? { quiz: task.unit.learnerUnitId }
      : task.unit?.learnerUnitId ? { unit: task.unit.learnerUnitId } : {};
    this.router.navigate(['/journey-log', task.view.id], { queryParams });
  }

  taskKey(task: HomeTask): string {
    return {
      item: 'HOME.TASK_ITEM', quiz: 'HOME.TASK_QUIZ', exam: 'HOME.TASK_EXAM', reply: 'HOME.TASK_REPLY',
      unitReview: 'HOME.WAIT_ITEM', examReview: 'HOME.WAIT_EXAM',
    }[task.kind];
  }

  /** Titles isolated so an English title keeps its shape inside an Arabic sentence. */
  taskParams(task: HomeTask): Record<string, string> {
    const iso = (t?: string) => (t ? '\u2068' + t + '\u2069' : '');
    return { journey: iso(task.view.journey.title), item: iso(task.item?.title ?? task.unit?.title) };
  }

  open(view: LearnerJourneyView): void {
    this.router.navigate(['/journey-log', view.id]);
  }
}
