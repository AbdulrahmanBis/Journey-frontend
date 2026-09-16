import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CatalogService } from '../../../core/services/catalog.service';
import { LanguageService } from '../../../core/services/language.service';
import { ToastService } from '../../../core/services/toast.service';
import { CatalogDetail } from '../../../core/models/models';
import { CatalogTypeCode, LearningStatusCode, codeOf, learningStatusChipClass } from '../../../core/models/enums';
import { CatalogActionComponent } from '../../../shared/components/catalog-action/catalog-action.component';

/**
 * A catalog entry's overview page: what it covers (quest items, or a package's journeys), who
 * reviews it, and the one action the viewer can take. Journeys in a package link to their own page.
 */
@Component({
  selector: 'app-catalog-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, CatalogActionComponent],
  templateUrl: './catalog-detail.component.html',
})
export class CatalogDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalog = inject(CatalogService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  lang = inject(LanguageService);

  detail: CatalogDetail | null = null;
  loading = true;
  private type: CatalogTypeCode = CatalogTypeCode.Journey;
  private id = '';

  get isPackage(): boolean { return this.type === CatalogTypeCode.Package; }

  get statusClass(): string { return learningStatusChipClass(this.detail?.entry.mine?.status); }

  get started(): boolean {
    const c = codeOf(this.detail?.entry.mine?.status);
    return c === LearningStatusCode.InProgress || c === LearningStatusCode.Completed;
  }

  ngOnInit(): void {
    // Subscribed: a package's journey links lead to this same route with another id.
    this.route.paramMap.subscribe((params) => {
      this.type = this.route.snapshot.data['type'];
      this.id = params.get('id')!;
      this.load();
    });
  }

  load(): void {
    this.loading = true;
    this.catalog.detail(this.type, this.id).subscribe({
      next: (detail) => { this.detail = detail; this.loading = false; },
      error: () => {
        this.toast.error(this.translate.instant('CATALOG.NOT_FOUND'));
        this.router.navigate(['/catalog']);
      },
    });
  }

  /** Quest item descriptions are one bullet per line; the outline shows only the first. */
  firstLine(text?: string): string {
    return (text ?? '').split('\n').map((l) => l.trim()).find((l) => !!l) ?? '';
  }
}
