import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { MetricsService } from '../../core/services/metrics.service';
import { User } from '../../core/models/models';
import { GroupMetrics, HoursBucket, HoursGranularity, LearnerMetrics, OrgMetrics } from '../../core/models/metrics';
import { UserRole } from '../../core/models/enums';
import { BarChartComponent } from '../../shared/components/bar-chart/bar-chart.component';

type ViewKind = 'learner' | 'group' | 'org';

@Component({
  selector: 'app-metrics',
  standalone: true,
  imports: [CommonModule, FormsModule, BarChartComponent],
  templateUrl: './metrics.component.html',
  styleUrl: './metrics.component.scss',
})
export class MetricsComponent implements OnInit {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private metricsService = inject(MetricsService);

  UserRole = UserRole;
  granularity: HoursGranularity = 'month';
  loading = true;

  seniors: User[] = [];
  learnersInScope: User[] = [];
  selectedSeniorId = '';
  selectedLearnerId = '';

  viewKind: ViewKind = 'group';
  learnerMetrics: LearnerMetrics | null = null;
  groupMetrics: GroupMetrics | null = null;
  orgMetrics: OrgMetrics | null = null;

  get user(): User { return this.auth.currentUser!; }
  get isLearner(): boolean { return this.user.role === UserRole.Learner; }
  get isSenior(): boolean { return this.user.role === UserRole.Senior; }
  get isManagerOrAdmin(): boolean { return this.auth.hasRole(UserRole.Manager, UserRole.Admin); }

  get activeBuckets(): HoursBucket[] {
    const source = this.learnerMetrics ?? this.groupMetrics ?? this.orgMetrics;
    if (!source) return [];
    if (this.granularity === 'day') return source.hoursByDay;
    if (this.granularity === 'quarter') return source.hoursByQuarter;
    return source.hoursByMonth;
  }

  get scopeLabel(): string {
    if (this.viewKind === 'learner') return this.learnerMetrics?.learnerName ?? 'Learner';
    if (this.viewKind === 'org') return 'Whole org';
    return this.seniors.find((s) => s.id === this.selectedSeniorId)?.name ?? 'Your team';
  }

  ngOnInit(): void {
    if (this.isLearner) {
      this.loadLearnerView(this.user.id);
      return;
    }
    if (this.isSenior) {
      this.userService.getLearnersBySenior(this.user.id).subscribe((learners) => {
        this.learnersInScope = learners;
        this.loadGroupView(this.user.id);
      });
      return;
    }
    // Manager / Admin
    this.userService.getSeniors().subscribe((seniors) => (this.seniors = seniors));
    this.userService.getLearners().subscribe((learners) => {
      this.learnersInScope = learners;
      this.loadOrgView();
    });
  }

  onSeniorChange(): void {
    this.selectedLearnerId = '';
    if (this.selectedSeniorId) {
      this.userService.getLearnersBySenior(this.selectedSeniorId).subscribe((learners) => {
        this.learnersInScope = learners;
        this.loadGroupView(this.selectedSeniorId);
      });
    } else {
      this.userService.getLearners().subscribe((learners) => {
        this.learnersInScope = learners;
        this.loadOrgView();
      });
    }
  }

  onLearnerChange(): void {
    if (this.selectedLearnerId) {
      this.loadLearnerView(this.selectedLearnerId);
    } else if (this.isSenior) {
      this.loadGroupView(this.user.id);
    } else if (this.selectedSeniorId) {
      this.loadGroupView(this.selectedSeniorId);
    } else {
      this.loadOrgView();
    }
  }

  private loadLearnerView(learnerId: string): void {
    this.loading = true;
    this.viewKind = 'learner';
    this.groupMetrics = null;
    this.orgMetrics = null;
    this.metricsService.getLearnerMetrics(learnerId).subscribe({
      next: (m) => { this.learnerMetrics = m; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  private loadGroupView(seniorId: string): void {
    this.loading = true;
    this.viewKind = 'group';
    this.learnerMetrics = null;
    this.orgMetrics = null;
    this.metricsService.getSeniorTeamMetrics(seniorId).subscribe({
      next: (m) => { this.groupMetrics = m; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  private loadOrgView(): void {
    this.loading = true;
    this.viewKind = 'org';
    this.learnerMetrics = null;
    this.groupMetrics = null;
    this.metricsService.getOrgMetrics().subscribe({
      next: (m) => { this.orgMetrics = m; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
