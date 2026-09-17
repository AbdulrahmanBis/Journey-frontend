import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { TeamService } from '../../../core/services/team.service';
import { AssignmentService } from '../../../core/services/assignment.service';
import { PackageService } from '../../../core/services/package.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { ToastService } from '../../../core/services/toast.service';
import { LearnerJourneyView, LearnerSnapshot, PackageAssignment } from '../../../core/models/models';
import { ORG_VIEW_ROLES, healthChipClass } from '../../../core/models/enums';
import { AttentionListComponent } from '../../../shared/components/attention-list/attention-list.component';
import { JourneyCardComponent } from '../../../shared/components/journey-card/journey-card.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { JourneyGroups, PackageGroupComponent, groupByPackage } from '../../../shared/components/package-group/package-group.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';

/** Everything about one learner on one page: status, what needs attention, packages and journeys. */
@Component({
  selector: 'app-learner-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, AttentionListComponent, JourneyCardComponent, PackageGroupComponent, ConfirmDialogComponent, TimeAgoPipe],
  templateUrl: './learner-profile.component.html',
})
export class LearnerProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private team = inject(TeamService);
  private assignments = inject(AssignmentService);
  private packages = inject(PackageService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  lang = inject(LanguageService);

  healthChipClass = healthChipClass;

  snapshot: LearnerSnapshot | null = null;
  groups: JourneyGroups = { packages: [], standalone: [] };
  loading = true;
  cancelling: PackageAssignment | null = null;
  private learnerId = '';

  get canCancelPackages(): boolean { return this.auth.hasRole(...ORG_VIEW_ROLES); }

  get cancelMessage(): string {
    return this.translate.instant('PACKAGE.CANCEL_MESSAGE', { title: this.cancelling?.title ?? '' });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.learnerId = params.get('id')!;
      this.load();
    });
  }

  load(): void {
    this.loading = true;
    forkJoin({
      snapshot: this.team.learner(this.learnerId),
      views: this.assignments.getLearnerJourneyViews(this.learnerId),
      packages: this.packages.assignmentsFor(this.learnerId),
    }).subscribe({
      next: ({ snapshot, views, packages }) => {
        this.snapshot = snapshot;
        this.groups = groupByPackage(views, packages);
        this.loading = false;
      },
      error: () => {
        this.toast.error(this.translate.instant('TEAM.LEARNER_NOT_FOUND'));
        this.router.navigate(['/dashboard']);
      },
    });
  }

  openJourney(view: LearnerJourneyView): void {
    this.router.navigate(['/journey-log', view.id]);
  }

  confirmCancel(): void {
    if (!this.cancelling) return;
    const title = this.cancelling.title;
    this.packages.cancel(this.cancelling.id).subscribe({
      next: () => {
        this.cancelling = null;
        this.toast.success(this.translate.instant('PACKAGE.CANCELLED', { title }));
        this.load();
      },
      error: (err: any) => {
        this.cancelling = null;
        this.toast.error(err?.error?.message ?? this.translate.instant('COMMON.UPDATE_FAILED'));
      },
    });
  }
}
