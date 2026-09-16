import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../core/services/notification.service';
import { LanguageService } from '../../core/services/language.service';
import { ToastService } from '../../core/services/toast.service';
import { AppNotification } from '../../core/models/models';

const PAGE_SIZE = 20;

/** The full notification history, paged. Reached from "Show all" in the bell. */
@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent implements OnInit {
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);
  private lang = inject(LanguageService);

  items: AppNotification[] = [];
  loading = true;
  page = 0;
  totalPages = 1;
  totalItems = 0;
  unreadCount = 0;

  ngOnInit(): void {
    this.load(0);
  }

  load(page: number): void {
    this.loading = true;
    this.notifications.list(page, PAGE_SIZE).subscribe({
      next: (result) => {
        this.items = result.items;
        this.page = result.page;
        this.totalPages = Math.max(result.totalPages, 1);
        this.totalItems = result.totalItems;
        this.unreadCount = result.unreadCount;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error(this.translate.instant('NOTIFICATIONS.LOAD_FAILED'));
      },
    });
  }

  select(notification: AppNotification): void {
    if (!notification.read) {
      this.notifications.markRead(notification.id).subscribe({
        next: () => {
          // Update in place rather than reloading — the list must not jump under the click.
          notification.read = true;
          this.unreadCount = Math.max(this.unreadCount - 1, 0);
          this.notifications.refresh();
        },
        error: () => undefined,
      });
    }

    if (notification.link) {
      this.router.navigateByUrl(notification.link);
    }
  }

  markAllRead(): void {
    this.notifications.markAllRead().subscribe({
      next: () => {
        this.items.forEach((n) => (n.read = true));
        this.unreadCount = 0;
        this.notifications.refresh();
      },
      error: () => this.toast.error(this.translate.instant('COMMON.UPDATE_FAILED')),
    });
  }

  previous(): void {
    if (this.page > 0) this.load(this.page - 1);
  }

  next(): void {
    if (this.page + 1 < this.totalPages) this.load(this.page + 1);
  }

  /** Absolute date here — on the history page the exact time is the useful thing. */
  formatDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(this.lang.current() === 'arabic' ? 'ar' : 'en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }
}
