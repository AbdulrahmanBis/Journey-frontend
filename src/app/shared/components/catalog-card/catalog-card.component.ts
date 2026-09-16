import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { NgClass, NgFor, NgIf, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { CatalogEntry } from '../../../core/models/models';
import { CatalogTypeCode, LearningStatusCode, codeOf, learningStatusChipClass } from '../../../core/models/enums';
import { CatalogActionComponent } from '../catalog-action/catalog-action.component';

/** One journey or package on the catalog shelf. The title links to its detail page. */
@Component({
  selector: 'app-catalog-card',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, SlicePipe, RouterLink, TranslatePipe, CatalogActionComponent],
  template: `
    <article class="card card-body h-100 gap-2">
      <div class="d-flex flex-wrap align-items-center gap-2">
        <span class="badge rounded-pill" [ngClass]="isPackage ? 'bg-navy text-white' : 'bg-navy-subtle text-navy'">
          {{ lang.label(entry.type) }}
        </span>
        <span class="badge rounded-pill bg-light text-body-secondary" *ngFor="let tag of entry.tags | slice: 0 : 2">{{ tag }}</span>
        <span class="badge rounded-pill bg-light text-body-secondary" *ngIf="entry.tags.length > 2">+{{ entry.tags.length - 2 }}</span>
        <span class="badge rounded-pill ms-auto" *ngIf="entry.mine && !notStarted" [ngClass]="statusClass">
          {{ lang.label(entry.mine.status) }}
        </span>
      </div>

      <h3 class="fs-5 mb-0">
        <a class="link-body-emphasis text-decoration-none user-content" [routerLink]="detailLink">{{ entry.title }}</a>
      </h3>
      <p class="small text-body-secondary text-clamp-2 user-content mb-0" *ngIf="entry.description">{{ entry.description }}</p>

      <ol class="small text-body-secondary mb-0 ps-3" *ngIf="entry.journeyTitles?.length">
        <li *ngFor="let t of entry.journeyTitles | slice: 0 : 3" class="text-truncate user-content">{{ t }}</li>
        <li *ngIf="entry.journeyTitles!.length > 3" class="list-unstyled text-body-tertiary">
          {{ 'PACKAGE.MORE' | translate: { count: entry.journeyTitles!.length - 3 } }}
        </li>
      </ol>

      <div class="d-flex flex-wrap gap-3 small text-body-tertiary mt-1" dir="auto">
        <span>{{ (isPackage ? 'CATALOG.JOURNEY_COUNT' : 'CATALOG.ITEM_COUNT') | translate: { count: entry.itemCount } }}</span>
        <span *ngIf="entry.hasExam">🎓 {{ 'CATALOG.HAS_EXAM' | translate }}</span>
        <span>{{ 'CATALOG.LEARNER_COUNT' | translate: { count: entry.learnerCount } }}</span>
      </div>

      <div *ngIf="entry.mine && inProgressOrDone" class="mt-1">
        <div class="progress progress-thin" role="progressbar" [attr.aria-valuenow]="entry.mine.percentComplete" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar" [style.width.%]="entry.mine.percentComplete"></div>
        </div>
      </div>

      <div class="d-flex align-items-center gap-2 mt-auto pt-2 border-top">
        <a class="btn btn-sm btn-link px-0" [routerLink]="detailLink">{{ 'CATALOG.DETAILS' | translate }}</a>
        <div class="ms-auto">
          <app-catalog-action [entry]="entry" [reviewerName]="reviewerName" [small]="true" (changed)="changed.emit()"></app-catalog-action>
        </div>
      </div>
    </article>
  `,
})
export class CatalogCardComponent {
  lang = inject(LanguageService);

  @Input({ required: true }) entry!: CatalogEntry;
  @Input() reviewerName?: string | null;
  @Output() changed = new EventEmitter<void>();

  get isPackage(): boolean { return codeOf(this.entry.type) === CatalogTypeCode.Package; }
  get detailLink(): string[] { return ['/catalog', this.isPackage ? 'packages' : 'journeys', this.entry.id]; }
  get notStarted(): boolean { return codeOf(this.entry.mine?.status) === LearningStatusCode.NotStarted; }
  get inProgressOrDone(): boolean {
    const c = codeOf(this.entry.mine?.status);
    return c === LearningStatusCode.InProgress || c === LearningStatusCode.Completed;
  }
  get statusClass(): string { return learningStatusChipClass(this.entry.mine?.status); }
}
