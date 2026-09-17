import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CatalogService } from '../../../core/services/catalog.service';
import { LanguageService } from '../../../core/services/language.service';
import { ToastService } from '../../../core/services/toast.service';
import { CatalogDetail } from '../../../core/models/models';
import { CatalogTypeCode, LearningStatusCode, STAFF_ROLES, codeOf, learningStatusChipClass } from '../../../core/models/enums';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogActionComponent } from '../../../shared/components/catalog-action/catalog-action.component';
import { openErrorPage } from '../../../core/services/api-error';

/**
 * A catalog entry's overview page: what it covers (quest items, or a package's journeys), who
 * reviews it, and the one action the viewer can take. Journeys in a package link to their own page.
 */
@Component({
  selector: 'app-catalog-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, CatalogActionComponent],
  templateUrl: './catalog-detail.component.html',
  styleUrl: './catalog-detail.component.scss',
})
export class CatalogDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalog = inject(CatalogService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);
  lang = inject(LanguageService);

  detail: CatalogDetail | null = null;
  /** Unit orders that are expanded; the first unit starts open. */
  private openUnits = new Set<number>();
  loading = true;
  private type: CatalogTypeCode = CatalogTypeCode.Journey;
  private id = '';

  get isPackage(): boolean { return this.type === CatalogTypeCode.Package; }

  /** Staff preview everything; learners get a sample (the first unit). */
  get isStaff(): boolean { return this.auth.hasRole(...STAFF_ROLES); }

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
      next: (detail) => {
        this.detail = detail;
        this.openUnits = new Set(detail.units?.length ? [detail.units[0].order] : []);
        this.loading = false;
      },
      error: (err) => openErrorPage(this.router, err),
    });
  }

  isOpen(order: number): boolean { return this.openUnits.has(order); }

  toggle(order: number): void {
    this.openUnits.has(order) ? this.openUnits.delete(order) : this.openUnits.add(order);
  }

  /** Quest item descriptions are one bullet per line; the outline shows only the first. */
  firstLine(text?: string): string {
    const plain = (text ?? '').replace(/<\/(p|li|h[1-6]|div)>/gi, '\n').replace(/<[^>]+>/g, '');
    return plain.split('\n').map((l) => l.trim()).find((l) => !!l) ?? '';
  }
}
