import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';
import { AssignmentService } from '../../../core/services/assignment.service';
import { LearnerSummary, LearnerJourneyView, PackageAssignment, SeniorSummary } from '../../../core/models/models';
import { EnumValue, ORG_VIEW_ROLES, ORG_WIDE_ROLES, StatusCode, isStatus } from '../../../core/models/enums';
import { PackageService } from '../../../core/services/package.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { JourneyGroups, PackageGroupComponent, groupByPackage } from '../../../shared/components/package-group/package-group.component';
import { JourneyCardComponent } from '../../../shared/components/journey-card/journey-card.component';
import { DepartmentPickerComponent } from '../../../shared/components/department-picker/department-picker.component';

@Component({
  selector: 'app-team-overview',
  standalone: true,
  imports: [CommonModule, JourneyCardComponent, DepartmentPickerComponent, PackageGroupComponent, ConfirmDialogComponent, TranslatePipe],
  templateUrl: './team-overview.component.html',
  styleUrl: './team-overview.component.scss',
})
export class TeamOverviewComponent implements OnInit {
  @Input({ required: true }) scope!: 'senior' | 'manager';

  private auth = inject(AuthService);
  private assignments = inject(AssignmentService);
  private router = inject(Router);
  private lang = inject(LanguageService);
  private packageService = inject(PackageService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  /** Role wording comes from the API triple, so it follows the active language. */
  roleLabel(person: { role?: EnumValue }): string {
    return this.lang.label(person?.role);
  }

  loading = true;
  learners: LearnerSummary[] = []; // senior scope
  seniors: SeniorSummary[] = []; // manager scope

  expandedLearners = new Set<string>();
  expandedSeniors = new Set<string>();

  /** HR/Admin only; null = every department. A Manager is pinned to their own by the server. */
  departmentId: string | null = null;

  /** Each learner's journeys split into packages and the rest, computed once per load. */
  private groups = new Map<string, JourneyGroups>();
  cancelling: PackageAssignment | null = null;

  groupsFor(learner: LearnerSummary): JourneyGroups {
    let g = this.groups.get(learner.id);
    if (!g) {
      g = groupByPackage(learner.journeys, learner.packages);
      this.groups.set(learner.id, g);
    }
    return g;
  }

  /** Cancelling a package is a management decision, like cancelling a journey. */
  get canCancelPackages(): boolean {
    return this.auth.hasRole(...ORG_VIEW_ROLES);
  }

  get cancelMessage(): string {
    return this.translate.instant('PACKAGE.CANCEL_MESSAGE', { title: this.cancelling?.title ?? '' });
  }

  confirmCancel(): void {
    if (!this.cancelling) return;
    const title = this.cancelling.title;
    this.packageService.cancel(this.cancelling.id).subscribe({
      next: () => {
        this.cancelling = null;
        this.toast.success(this.translate.instant('PACKAGE.CANCELLED', { title }));
        this.reload();
      },
      error: (err: any) => {
        this.cancelling = null;
        this.toast.error(err?.error?.message ?? this.translate.instant('COMMON.UPDATE_FAILED'));
      },
    });
  }

  get user() {
    return this.auth.currentUser!;
  }

  get isManagerScope(): boolean {
    return this.scope === 'manager';
  }

  get isOrgWide(): boolean {
    return this.auth.hasRole(...ORG_WIDE_ROLES);
  }

  ngOnInit(): void { this.reload(); }

  private reload(): void {
    if (this.scope === 'senior') {
      this.assignments.getSeniorOverview(this.user.id).subscribe((learners) => {
        this.groups.clear();
        this.learners = learners;
        this.loading = false;
      });
    } else {
      this.loadManagerScope();
    }
  }

  onDepartmentChange(departmentId: string | null): void {
    this.departmentId = departmentId;
    this.expandedSeniors.clear();
    this.expandedLearners.clear();
    this.loadManagerScope();
  }

  private loadManagerScope(): void {
    this.loading = true;
    this.assignments.getManagerOverview(this.departmentId).subscribe({
      next: (seniors) => {
        this.groups.clear();
        this.seniors = seniors;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
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
    return journeys.filter(
      (j) => !isStatus(j.status, StatusCode.Completed) && !isStatus(j.status, StatusCode.Cancelled),
    ).length;
  }

  avgProgress(journeys: LearnerJourneyView[]): number {
    if (!journeys.length) return 0;
    return Math.round(journeys.reduce((sum, j) => sum + j.percentComplete, 0) / journeys.length);
  }

  totalLearnerCount(seniors: SeniorSummary[]): number {
    return seniors.reduce((sum, s) => sum + s.learners.length, 0);
  }
}
