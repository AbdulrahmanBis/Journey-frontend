import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TeamService } from '../../../core/services/team.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { TeamLearner, TeamOverview } from '../../../core/models/models';
import { LearnerHealthCode, ORG_WIDE_ROLES, RoleCode, codeOf, healthChipClass } from '../../../core/models/enums';
import { DepartmentPickerComponent } from '../../../shared/components/department-picker/department-picker.component';
import { AttentionListComponent } from '../../../shared/components/attention-list/attention-list.component';
import { DueBadgeComponent } from '../../../shared/components/due-badge/due-badge.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';

/**
 * Home for staff. Leads with what needs acting on, then every learner in scope as one flat,
 * searchable table (a Senior's own learners, a Manager's department, everyone for HR/Admin).
 * Clicking a learner opens their profile.
 */
import { GettingStartedComponent } from '../getting-started/getting-started.component';

@Component({
  selector: 'app-team-dashboard',
  standalone: true,
  imports: [GettingStartedComponent, CommonModule, FormsModule, RouterLink, TranslatePipe, DepartmentPickerComponent, AttentionListComponent, DueBadgeComponent, TimeAgoPipe],
  templateUrl: './team-dashboard.component.html',
  styleUrl: './team-dashboard.component.scss',
})
export class TeamDashboardComponent implements OnInit {
  private team = inject(TeamService);
  private auth = inject(AuthService);
  private router = inject(Router);
  lang = inject(LanguageService);

  readonly Health = LearnerHealthCode;
  healthChipClass = healthChipClass;

  data: TeamOverview | null = null;
  loading = true;
  failed = false;

  departmentId: string | null = null;
  seniorId = '';
  search = '';
  /** LearnerHealthCode, or null for everyone. */
  health: number | null = null;

  get isSenior(): boolean { return this.auth.hasRole(RoleCode.Senior); }
  get isOrgWide(): boolean { return this.auth.hasRole(...ORG_WIDE_ROLES); }

  get eyebrowKey(): string {
    if (this.isSenior) return 'TEAM.EYEBROW_SENIOR';
    return this.isOrgWide ? 'TEAM.EYEBROW_ORG' : 'TEAM.EYEBROW_DEPARTMENT';
  }

  get rows(): TeamLearner[] {
    const q = this.search.trim().toLowerCase();
    return (this.data?.learners ?? []).filter((l) =>
      (this.health === null || codeOf(l.health) === this.health) &&
      (!q || [l.name, l.email, l.seniorName, l.current?.title].some((v) => v?.toLowerCase().includes(q))));
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.failed = false;
    this.team.overview(this.departmentId, this.isSenior ? null : this.seniorId || null).subscribe({
      next: (data) => { this.data = data; this.loading = false; },
      error: () => { this.loading = false; this.failed = true; },
    });
  }

  onDepartmentChange(departmentId: string | null): void {
    this.departmentId = departmentId;
    this.seniorId = '';
    this.load();
  }

  /** KPI tiles double as the table's status filter; clicking the active one clears it. */
  filterHealth(code: number | null): void {
    this.health = this.health === code ? null : code;
  }

  open(learner: TeamLearner): void {
    this.router.navigate(['/people', learner.id]);
  }

  clearFilters(): void {
    this.search = '';
    this.health = null;
    if (this.seniorId) { this.seniorId = ''; this.load(); }
  }
}
