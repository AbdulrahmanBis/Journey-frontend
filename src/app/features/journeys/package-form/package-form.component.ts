import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { JourneyService } from '../../../core/services/journey.service';
import { PackageService } from '../../../core/services/package.service';
import { ToastService } from '../../../core/services/toast.service';
import { Journey } from '../../../core/models/models';
import { apiErrorMessage, openErrorPage } from '../../../core/services/api-error';

/** Create or edit a package: its details, and which journeys it holds in what order. */
@Component({
  selector: 'app-package-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './package-form.component.html',
})
export class PackageFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private journeyService = inject(JourneyService);
  private packageService = inject(PackageService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  packageId: string | null = null;
  isEdit = false;
  /** Assigned at least once: edits only reach future assignments, which the form says. */
  hasAssignments = false;
  loading = true;
  saving = false;
  error = '';

  title = '';
  description = '';
  targetDays: number | null = null;
  /** The package's journeys, in order. */
  selected: Journey[] = [];

  allJourneys: Journey[] = [];
  search = '';

  /** Journeys not yet in the package that match the search. */
  get available(): Journey[] {
    const q = this.search.trim().toLowerCase();
    const chosen = new Set(this.selected.map((j) => j.id));
    return this.allJourneys.filter(
      (j) => !chosen.has(j.id) && (!q || j.title.toLowerCase().includes(q) || (j.techTag ?? '').toLowerCase().includes(q)),
    );
  }

  ngOnInit(): void {
    this.packageId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.packageId;

    forkJoin({
      journeys: this.journeyService.getJourneys(),
      pkg: this.isEdit ? this.packageService.get(this.packageId!) : of(null),
    }).subscribe({
      next: ({ journeys, pkg }) => {
        this.allJourneys = journeys;
        if (pkg) {
          this.title = pkg.title;
          this.description = pkg.description ?? '';
          this.targetDays = pkg.targetDays ?? null;
          this.hasAssignments = !pkg.deletable;
          const byId = new Map(journeys.map((j) => [j.id, j]));
          this.selected = pkg.journeys
            .map((pj) => byId.get(pj.journeyId))
            .filter((j): j is Journey => !!j);
        }
        this.loading = false;
      },
      error: (err) => openErrorPage(this.router, err),
    });
  }

  add(journey: Journey): void { this.selected = [...this.selected, journey]; }

  remove(index: number): void { this.selected = this.selected.filter((_, i) => i !== index); }

  move(index: number, delta: -1 | 1): void {
    const target = index + delta;
    if (target < 0 || target >= this.selected.length) return;
    const next = [...this.selected];
    [next[index], next[target]] = [next[target], next[index]];
    this.selected = next;
  }

  save(): void {
    this.error = '';
    if (!this.title.trim()) { this.error = this.translate.instant('PACKAGE.NEEDS_TITLE'); return; }
    if (!this.selected.length) { this.error = this.translate.instant('PACKAGE.NEEDS_JOURNEY'); return; }

    const payload = {
      title: this.title.trim(),
      description: this.description.trim() || undefined,
      targetDays: this.targetDays || null,
      journeyIds: this.selected.map((j) => j.id),
    };
    this.saving = true;
    const request = this.isEdit
      ? this.packageService.update(this.packageId!, payload)
      : this.packageService.create(payload);
    request.subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(this.translate.instant(this.isEdit ? 'PACKAGE.UPDATED' : 'PACKAGE.CREATED'));
        this.router.navigate(['/journeys/packages']);
      },
      error: (err: any) => {
        this.saving = false;
        this.error = apiErrorMessage(err) ?? this.translate.instant('COMMON.SAVE_FAILED');
      },
    });
  }
}
