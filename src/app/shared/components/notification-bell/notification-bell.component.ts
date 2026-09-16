import { Component, ElementRef, HostListener, OnDestroy, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../../core/services/notification.service';
import { LanguageService } from '../../../core/services/language.service';
import { AppNotification } from '../../../core/models/models';

/**
 * The bell in the top bar: unread badge, a dropdown of the most recent notifications, and a way
 * through to the full list.
 *
 * <p>Sits at the inline end of the bar, so it is top-right in English and top-left in Arabic
 * without a direction check — the layout follows the document's `dir`.
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);
  private host = inject(ElementRef<HTMLElement>);

  open = false;

  readonly unreadCount = this.notifications.unreadCount;
  readonly items = this.notifications.recent;

  constructor() {
    // The server renders the wording, so a language switch needs a re-fetch, not just a re-render.
    effect(() => {
      this.lang.current();
      this.notifications.refresh();
    });
  }

  ngOnInit(): void {
    this.notifications.startPolling();
  }

  ngOnDestroy(): void {
    this.notifications.stopPolling();
  }

  toggle(): void {
    this.open = !this.open;
  }

  /** Any click that did not land inside this component closes the dropdown. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) {
      this.open = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open = false;
  }

  /**
   * Marks read and follows the link. Navigation does not wait for the mark-read call: the read
   * state is not worth delaying the page the user asked for, and the badge is refreshed either way.
   */
  select(notification: AppNotification): void {
    this.open = false;

    if (!notification.read) {
      this.notifications.markRead(notification.id).subscribe({
        next: () => this.notifications.refresh(),
        error: () => undefined,
      });
    }

    if (notification.link) {
      this.router.navigateByUrl(notification.link);
    }
  }

  markAllRead(event: MouseEvent): void {
    event.stopPropagation();
    this.notifications.markAllRead().subscribe({
      next: () => this.notifications.refresh(),
      error: () => undefined,
    });
  }

  /** Coarse relative time — exact minutes stop mattering quickly for a notification. */
  timeAgo(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';

    const minutes = Math.floor((Date.now() - then) / 60_000);
    if (minutes < 1) return this.translate.instant('NOTIFICATIONS.JUST_NOW');
    if (minutes < 60) return this.translate.instant('NOTIFICATIONS.MINUTES_AGO', { count: minutes });

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return this.translate.instant('NOTIFICATIONS.HOURS_AGO', { count: hours });

    const days = Math.floor(hours / 24);
    if (days < 30) return this.translate.instant('NOTIFICATIONS.DAYS_AGO', { count: days });

    return new Date(then).toLocaleDateString(this.lang.current() === 'arabic' ? 'ar' : 'en');
  }

  /** Caps the badge so a long absence cannot stretch the bar. */
  get badgeLabel(): string {
    const count = this.unreadCount();
    return count > 99 ? '99+' : String(count);
  }
}
