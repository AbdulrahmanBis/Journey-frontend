import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { IntroGuideService } from '../../../core/services/intro-guide.service';
import { RoleCode } from '../../../core/models/enums';
import { ModalComponent } from '../modal/modal.component';

interface Slide { icon: string; key: string; }

/** Slides per role; each key has TITLE and BODY under INTRO in the translation files. */
const SLIDES: Record<string, Slide[]> = {
  learner: [
    { icon: '👋', key: 'INTRO.LEARNER_1' },
    { icon: '▶️', key: 'INTRO.LEARNER_2' },
    { icon: '🔄', key: 'INTRO.LEARNER_3' },
    { icon: '📚', key: 'INTRO.LEARNER_4' },
    { icon: '🔔', key: 'INTRO.LEARNER_5' },
  ],
  senior: [
    { icon: '👋', key: 'INTRO.SENIOR_1' },
    { icon: '📋', key: 'INTRO.SENIOR_2' },
    { icon: '🔍', key: 'INTRO.SENIOR_3' },
    { icon: '🧩', key: 'INTRO.SENIOR_4' },
  ],
  manager: [
    { icon: '👋', key: 'INTRO.MANAGER_1' },
    { icon: '📋', key: 'INTRO.MANAGER_2' },
    { icon: '⏰', key: 'INTRO.MANAGER_3' },
    { icon: '🧩', key: 'INTRO.MANAGER_4' },
    { icon: '👥', key: 'INTRO.MANAGER_5' },
  ],
  org: [
    { icon: '👋', key: 'INTRO.ORG_1' },
    { icon: '📋', key: 'INTRO.ORG_2' },
    { icon: '🏢', key: 'INTRO.ORG_3' },
    { icon: '📚', key: 'INTRO.ORG_4' },
    { icon: '⏰', key: 'INTRO.ORG_5' },
  ],
};

/**
 * A short, role-specific welcome: a few slides with Back / Next, a "Don't show this again" choice,
 * and "Get started" on the last slide (which also counts as don't-show-again). Lives in the app shell.
 */
@Component({
  selector: 'app-intro-guide',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, TranslatePipe, ModalComponent],
  template: `
    <app-modal [open]="guide.isOpen()" (dismissed)="close()">
      <div class="text-center px-2 pt-2" *ngIf="slide() as s">
        <div class="intro-icon mb-3" aria-hidden="true">{{ s.icon }}</div>
        <h2 class="h4 mb-2">{{ s.key + '.TITLE' | translate }}</h2>
        <p class="text-body-secondary mb-3">{{ s.key + '.BODY' | translate }}</p>
        <div class="d-flex justify-content-center gap-2 mb-3" role="tablist" [attr.aria-label]="'INTRO.STEPS' | translate">
          <button
            type="button"
            *ngFor="let _ of slides(); let i = index"
            class="intro-dot"
            [class.active]="i === index()"
            role="tab"
            [attr.aria-selected]="i === index()"
            [attr.aria-label]="'INTRO.STEP' | translate: { n: i + 1, total: slides().length }"
            (click)="index.set(i)"
          ></button>
        </div>
        <div class="form-check d-inline-flex align-items-center gap-2 small text-body-secondary">
          <input id="intro-never" class="form-check-input" type="checkbox" [(ngModel)]="neverAgain" />
          <label for="intro-never" class="form-check-label">{{ 'INTRO.DONT_SHOW' | translate }}</label>
        </div>
      </div>
      <div modal-actions>
        <button type="button" class="btn btn-outline-secondary flex-fill" *ngIf="index() > 0" (click)="index.set(index() - 1)">{{ 'COMMON.BACK' | translate }}</button>
        <button type="button" class="btn btn-outline-secondary flex-fill" *ngIf="index() === 0" (click)="close()">{{ 'INTRO.SKIP' | translate }}</button>
        <button type="button" class="btn btn-primary flex-fill" *ngIf="!isLast()" (click)="index.set(index() + 1)">{{ 'COMMON.NEXT' | translate }}</button>
        <button type="button" class="btn btn-primary flex-fill" *ngIf="isLast()" (click)="finish()">{{ 'INTRO.GET_STARTED' | translate }}</button>
      </div>
    </app-modal>
  `,
  styles: [
    `
      .intro-icon { font-size: 3rem; line-height: 1; }
      .intro-dot {
        width: 0.5rem;
        height: 0.5rem;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: var(--bs-secondary-bg);
      }
      .intro-dot.active { background: var(--bs-primary); width: 1.25rem; border-radius: 1rem; }
    `,
  ],
})
export class IntroGuideComponent implements OnInit {
  guide = inject(IntroGuideService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  readonly index = signal(0);
  private readonly role = signal<string>('learner');
  neverAgain = false;

  readonly slides = computed(() => SLIDES[this.role()]);
  readonly slide = computed(() => this.slides()[Math.min(this.index(), this.slides().length - 1)]);
  readonly isLast = computed(() => this.index() >= this.slides().length - 1);

  ngOnInit(): void {
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      if (!user) return;
      this.role.set(slideSetFor(user.role?.code));
      this.index.set(0);
      this.neverAgain = false;
      // After navigation settles, so it opens over the page the person landed on.
      setTimeout(() => this.guide.showIfNeeded());
    });
  }

  close(): void {
    this.guide.close(this.neverAgain);
    this.index.set(0);
  }

  /** Reaching the end counts as having seen it. */
  finish(): void {
    this.guide.close(true);
    this.index.set(0);
  }
}

function slideSetFor(code: number | undefined): string {
  switch (code) {
    case RoleCode.Learner: return 'learner';
    case RoleCode.Senior: return 'senior';
    case RoleCode.Manager: return 'manager';
    default: return 'org';
  }
}
