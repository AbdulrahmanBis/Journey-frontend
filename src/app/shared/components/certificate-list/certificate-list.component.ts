import { Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Certificate } from '../../../core/models/models';
import { CatalogTypeCode, codeOf } from '../../../core/models/enums';
import { CertificateService } from '../../../core/services/certificate.service';
import { LanguageService } from '../../../core/services/language.service';

/**
 * A learner's certificates as a row of small cards, each opening the printable certificate. Renders nothing
 * until there is at least one.
 *
 *   <app-certificate-list></app-certificate-list>                       the signed-in learner's own
 *   <app-certificate-list [learnerId]="id"></app-certificate-list>     a learner staff can see
 */
@Component({
  selector: 'app-certificate-list',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, TranslatePipe],
  template: `
    <section class="mb-4" *ngIf="items.length">
      <h2 class="h6 mb-2">{{ 'CERTIFICATE.LIST_TITLE' | translate }} <span class="text-body-tertiary">({{ items.length }})</span></h2>
      <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-2">
        <div class="col" *ngFor="let c of items">
          <a class="card card-body card-interactive h-100 flex-row align-items-center gap-3 text-decoration-none text-body" [routerLink]="['/certificates', c.id]">
            <span class="fs-3" aria-hidden="true">{{ isPackage(c) ? '🏆' : '🏅' }}</span>
            <span class="overflow-hidden">
              <span class="d-block fw-semibold text-truncate user-content">{{ c.title }}</span>
              <span class="d-block small text-body-tertiary" dir="auto">
                {{ lang.label(c.type) }} · {{ date(c.completedAt) }}<ng-container *ngIf="c.examScorePercent != null"> · {{ c.examScorePercent }}%</ng-container>
              </span>
            </span>
          </a>
        </div>
      </div>
    </section>
  `,
})
export class CertificateListComponent implements OnInit, OnChanges {
  private certificates = inject(CertificateService);
  lang = inject(LanguageService);

  @Input() learnerId?: string;

  items: Certificate[] = [];

  // OnInit covers the no-input form, where OnChanges never runs.
  ngOnInit(): void { this.load(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['learnerId']?.firstChange) this.load();
  }

  private load(): void {
    this.certificates.list(this.learnerId).subscribe({
      next: (items) => (this.items = items),
      error: () => (this.items = []),
    });
  }

  isPackage(c: Certificate): boolean { return codeOf(c.type) === CatalogTypeCode.Package; }

  date(iso: string): string {
    return new Date(iso).toLocaleDateString(this.lang.current() === 'arabic' ? 'ar' : 'en', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
