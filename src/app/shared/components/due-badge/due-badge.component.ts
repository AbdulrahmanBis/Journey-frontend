import { Component, Input, inject } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';

/**
 * A due date as a chip: "Overdue 3d" (red), "Due today" / "Due in 2d" (amber), "Due 12 Oct" (quiet).
 * Renders nothing without a date, or once the work is closed.
 *
 *   <app-due-badge [dueDate]="view.dueDate" [closed]="isDone"></app-due-badge>
 */
@Component({
  selector: 'app-due-badge',
  standalone: true,
  imports: [NgClass, NgIf, TranslatePipe],
  template: `
    <span *ngIf="dueDate && !closed" class="badge rounded-pill" [ngClass]="chipClass" [title]="formatted" dir="auto">
      <ng-container *ngIf="days < 0">{{ 'DUE.OVERDUE' | translate: { days: -days } }}</ng-container>
      <ng-container *ngIf="days === 0">{{ 'DUE.TODAY' | translate }}</ng-container>
      <ng-container *ngIf="days > 0 && days <= soonDays">{{ 'DUE.IN_DAYS' | translate: { days: days } }}</ng-container>
      <ng-container *ngIf="days > soonDays">{{ 'DUE.ON' | translate: { date: formatted } }}</ng-container>
    </span>
  `,
})
export class DueBadgeComponent {
  private lang = inject(LanguageService);

  /** YYYY-MM-DD */
  @Input() dueDate?: string | null;
  /** Completed or cancelled: a deadline no longer matters. */
  @Input() closed = false;
  readonly soonDays = 3;

  /** Whole days from today to the due date; negative once past. */
  get days(): number {
    return daysUntil(this.dueDate!);
  }

  get chipClass(): string {
    if (this.days < 0) return 'bg-danger-subtle text-danger-emphasis';
    if (this.days <= this.soonDays) return 'bg-warning-subtle text-warning-emphasis';
    return 'bg-light text-body-secondary';
  }

  get formatted(): string {
    if (!this.dueDate) return '';
    const [y, m, d] = this.dueDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(this.lang.current() === 'arabic' ? 'ar' : 'en', { day: 'numeric', month: 'short' });
  }
}

/** Whole local days from today until a YYYY-MM-DD date (negative when past). */
export function daysUntil(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const due = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((due - today) / 86_400_000);
}

/** Today as YYYY-MM-DD in local time, for date inputs' `min`. */
export function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Today + n days as YYYY-MM-DD. */
export function isoInDays(n: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
