import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PackageService } from '../../../core/services/package.service';
import { ToastService } from '../../../core/services/toast.service';
import { JourneyPackage } from '../../../core/models/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AssignChoice, AssignLearnerModalComponent } from '../../../shared/components/assign-learner-modal/assign-learner-modal.component';
import { JourneysTabsComponent } from '../journeys-tabs/journeys-tabs.component';
import { apiErrorMessage } from '../../../core/services/api-error';

/** How many journey titles a card lists before collapsing the rest into "+N more". */
const PREVIEW_JOURNEYS = 4;

@Component({
  selector: 'app-package-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmDialogComponent, AssignLearnerModalComponent, JourneysTabsComponent, TranslatePipe],
  templateUrl: './package-list.component.html',
})
export class PackageListComponent implements OnInit {
  private packageService = inject(PackageService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  readonly previewCount = PREVIEW_JOURNEYS;

  packages: JourneyPackage[] = [];
  loading = true;

  assigning: JourneyPackage | null = null;
  saving = false;

  deleting: JourneyPackage | null = null;

  get deleteMessage(): string {
    return this.translate.instant('PACKAGE.DELETE_MESSAGE', { title: this.deleting?.title ?? '' });
  }

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.loading = true;
    this.packageService.list().subscribe({
      next: (packages) => { this.packages = packages; this.loading = false; },
      error: () => { this.loading = false; this.toast.error(this.translate.instant('PACKAGE.LOAD_FAILED')); },
    });
  }

  edit(pkg: JourneyPackage): void { this.router.navigate(['/journeys/packages', pkg.id, 'edit']); }

  assign({ learner, dueDate }: AssignChoice): void {
    if (!this.assigning) return;
    const title = this.assigning.title;
    this.saving = true;
    this.packageService.assign(this.assigning.id, learner.id, dueDate).subscribe({
      next: () => {
        this.saving = false;
        this.assigning = null;
        this.toast.success(this.translate.instant('PACKAGE.ASSIGNED', { title, name: learner.name }));
        this.refresh();
      },
      error: (err: any) => {
        this.saving = false;
        this.toast.error(apiErrorMessage(err) ?? this.translate.instant('JOURNEY.ASSIGN_FAILED'));
      },
    });
  }

  confirmDelete(): void {
    if (!this.deleting) return;
    const title = this.deleting.title;
    this.packageService.delete(this.deleting.id).subscribe({
      next: () => {
        this.deleting = null;
        this.toast.success(this.translate.instant('PACKAGE.DELETED', { title }));
        this.refresh();
      },
      error: (err: any) => {
        this.deleting = null;
        this.toast.error(apiErrorMessage(err) ?? this.translate.instant('COMMON.DELETE_FAILED'));
      },
    });
  }
}
