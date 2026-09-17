import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Announcement } from '../../../core/models/models';
import { LanguageService } from '../../../core/services/language.service';
import { ModalComponent } from '../modal/modal.component';
import { RichLinksDirective } from '../../directives/rich-links.directive';
import { RichHtmlPipe } from '../../pipes/rich-html.pipe';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';

/**
 * One announcement in full. Links inside it navigate in the app (emitting followedLink).
 *
 *   <app-announcement-modal [announcement]="open" [canDismiss]="true" (closed)="open = null" (dismissed)="…">
 */
@Component({
  selector: 'app-announcement-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ModalComponent, RichLinksDirective, TimeAgoPipe, RichHtmlPipe],
  template: `
    <app-modal [open]="!!announcement" (dismissed)="closed.emit()">
      <ng-container *ngIf="announcement as a">
        <span class="page-eyebrow">📣 {{ 'ANNOUNCEMENTS.EYEBROW' | translate }}</span>
        <h2 class="h4 mb-1 user-content">{{ a.title }}</h2>
        <div class="small text-body-tertiary d-flex flex-wrap gap-2 mb-3">
          <span *ngIf="a.authorName" class="user-content">{{ a.authorName }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ a.createdAt | timeAgo }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ audience(a) }}</span>
        </div>
        <div class="rich-content user-content announcement-body" appRichLinks [innerHTML]="a.body | richHtml" (navigated)="followedLink.emit()"></div>
      </ng-container>
      <div modal-actions>
        <button type="button" class="btn btn-outline-secondary flex-fill" *ngIf="canDismiss" (click)="dismissed.emit()">
          {{ 'ANNOUNCEMENTS.DISMISS' | translate }}
        </button>
        <button type="button" class="btn btn-primary flex-fill" (click)="closed.emit()">{{ 'ANNOUNCEMENTS.CLOSE' | translate }}</button>
      </div>
    </app-modal>
  `,
  styles: [
    `
      .announcement-body {
        max-height: 60vh;
        overflow-y: auto;
      }
    `,
  ],
})
export class AnnouncementModalComponent {
  private lang = inject(LanguageService);
  private translate = inject(TranslateService);

  @Input() announcement: Announcement | null = null;
  /** Offer "remove from my dashboard". */
  @Input() canDismiss = false;
  @Output() closed = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();
  /** A link inside it took the user to another page; the parent should just forget the modal. */
  @Output() followedLink = new EventEmitter<void>();

  audience(a: Announcement): string {
    return audienceLabel(a, this.lang, this.translate);
  }
}

/** "Everyone" or the department names, in the current language. */
export function audienceLabel(a: Announcement, lang: LanguageService, translate: TranslateService): string {
  if (a.orgWide) return translate.instant('ANNOUNCEMENTS.EVERYONE');
  return a.departments.map((d) => lang.label(d)).join(translate.instant('ANNOUNCEMENTS.LIST_SEPARATOR'));
}
