import { Component, Input, inject } from '@angular/core';
import { NgClass, NgFor, NgIf, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AttentionItem } from '../../../core/models/models';
import { AttentionTypeCode, codeOf } from '../../../core/models/enums';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { LanguageService } from '../../../core/services/language.service';

const MESSAGE_KEY: Record<number, string> = {
  [AttentionTypeCode.Overdue]: 'TEAM.ATTN_OVERDUE',
  [AttentionTypeCode.ExamToGrade]: 'TEAM.ATTN_EXAM',
  [AttentionTypeCode.AwaitingReview]: 'TEAM.ATTN_REVIEW',
  [AttentionTypeCode.UnansweredNote]: 'TEAM.ATTN_NOTE',
  [AttentionTypeCode.Inactive]: 'TEAM.ATTN_INACTIVE',
  [AttentionTypeCode.NothingAssigned]: 'TEAM.ATTN_NOTHING',
  [AttentionTypeCode.NoSenior]: 'TEAM.ATTN_NO_SENIOR',
};

const ACTION_KEY: Record<number, string> = {
  [AttentionTypeCode.Overdue]: 'TEAM.ACT_OPEN',
  [AttentionTypeCode.ExamToGrade]: 'TEAM.ACT_GRADE',
  [AttentionTypeCode.AwaitingReview]: 'TEAM.ACT_REVIEW',
  [AttentionTypeCode.UnansweredNote]: 'TEAM.ACT_REPLY',
  [AttentionTypeCode.Inactive]: 'TEAM.ACT_OPEN',
  [AttentionTypeCode.NothingAssigned]: 'TEAM.ACT_ASSIGN',
  [AttentionTypeCode.NoSenior]: 'TEAM.ACT_SET_SENIOR',
};

/**
 * The "needs your attention" list: one line per thing to act on, with a button to where it's done.
 * Shared by the team dashboard and a learner's profile (where the learner name is left out).
 */
@Component({
  selector: 'app-attention-list',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, SlicePipe, RouterLink, TranslatePipe, TimeAgoPipe],
  template: `
    <div class="list-group list-group-flush" *ngIf="items.length; else allClear">
      <div class="list-group-item d-flex align-items-start gap-3 px-0" *ngFor="let a of items | slice: 0 : visibleCount">
        <span class="attention-dot mt-2 flex-shrink-0" [ngClass]="dotClass(a)"></span>
        <div class="flex-grow-1 overflow-hidden small">
          <!-- Follows the page direction; names and titles are isolated so they keep their own. -->
          <div>
            <a *ngIf="showLearner" class="fw-semibold link-body-emphasis" [routerLink]="['/people', a.learnerId]"><bdi>{{ a.learnerName }}</bdi></a>
            <span *ngIf="showLearner"> · </span>
            <span>{{ messageKey(a) | translate: params(a) }}</span>
          </div>
          <div class="text-body-tertiary">{{ lang.label(a.type) }}<ng-container *ngIf="a.since"> · {{ a.since | timeAgo }}</ng-container></div>
        </div>
        <a class="btn btn-sm btn-outline-primary flex-shrink-0" [routerLink]="a.link">{{ actionKey(a) | translate }}</a>
      </div>
      <button type="button" class="btn btn-link btn-sm px-0 mt-2" *ngIf="items.length > limit" (click)="expanded = !expanded">
        {{ (expanded ? 'TEAM.SHOW_LESS' : 'TEAM.SHOW_ALL') | translate: { count: items.length } }}
      </button>
    </div>
    <ng-template #allClear>
      <p class="text-body-secondary small mb-0">✓ {{ 'TEAM.ALL_CLEAR' | translate }}</p>
    </ng-template>
  `,
  styles: [
    `
      .attention-dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
      }
    `,
  ],
})
export class AttentionListComponent {
  @Input() items: AttentionItem[] = [];
  @Input() showLearner = true;
  @Input() limit = 6;

  lang = inject(LanguageService);

  expanded = false;

  get visibleCount(): number { return this.expanded ? this.items.length : this.limit; }

  /**
   * Titles are wrapped in Unicode isolates (FSI … PDI) so an English title inside an Arabic sentence,
   * or the reverse, keeps its own direction instead of pulling the quotes and punctuation around.
   */
  params(a: AttentionItem): Record<string, unknown> {
    const isolate = (text?: string) => (text ? '\u2068' + text + '\u2069' : '');
    return { journey: isolate(a.journeyTitle), item: isolate(a.itemTitle), days: a.days };
  }

  messageKey(a: AttentionItem): string { return MESSAGE_KEY[codeOf(a.type)!] ?? 'TEAM.ATTN_OPEN'; }
  actionKey(a: AttentionItem): string { return ACTION_KEY[codeOf(a.type)!] ?? 'TEAM.ACT_OPEN'; }

  dotClass(a: AttentionItem): string {
    switch (codeOf(a.type)) {
      case AttentionTypeCode.Overdue: return 'bg-danger';
      case AttentionTypeCode.ExamToGrade:
      case AttentionTypeCode.AwaitingReview: return 'bg-response';
      case AttentionTypeCode.UnansweredNote: return 'bg-primary';
      case AttentionTypeCode.Inactive: return 'bg-warning';
      default: return 'bg-secondary';
    }
  }
}
