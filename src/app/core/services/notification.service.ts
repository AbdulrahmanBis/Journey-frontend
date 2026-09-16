import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AppNotification, NotificationPage } from '../models/models';
import { LanguageService } from './language.service';
import { API_BASE } from './api.config';

/** How often the bell asks for new notifications. */
const POLL_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private lang = inject(LanguageService);

  /** Drives the badge; kept here so any component can read it without its own request. */
  readonly unreadCount = signal(0);

  /** The dropdown's contents. */
  readonly recent = signal<AppNotification[]>([]);

  private polling?: Subscription;

  /**
   * Polling, not a socket.
   *
   * <p>A notification arriving up to 30s late is not a problem worth a WebSocket or an SSE stream:
   * either would need its own auth story, reconnection handling and a proxy that keeps connections
   * open. This is one small request on a timer and can be swapped for a push stream later without
   * changing a single caller — they all read the signals.
   */
  startPolling(): void {
    this.stopPolling();
    this.polling = timer(0, POLL_INTERVAL_MS)
      .pipe(switchMap(() => this.fetchRecent()))
      .subscribe({
        next: (page) => this.apply(page),
        // A failed poll is not worth a toast — the next tick retries.
        error: () => undefined,
      });
  }

  stopPolling(): void {
    this.polling?.unsubscribe();
    this.polling = undefined;
  }

  /** Re-reads immediately — used after marking read and when the language changes. */
  refresh(): void {
    this.fetchRecent().subscribe({
      next: (page) => this.apply(page),
      error: () => undefined,
    });
  }

  /** Full history for the notifications page. */
  list(page: number, size: number): Observable<NotificationPage> {
    return this.http.get<NotificationPage>(`${API_BASE}/notifications`, {
      params: { page, size, lang: this.langCode() },
    });
  }

  markRead(id: string): Observable<AppNotification> {
    return this.http.patch<AppNotification>(
      `${API_BASE}/notifications/${id}/read`,
      {},
      { params: { lang: this.langCode() } },
    );
  }

  markAllRead(): Observable<{ marked: number }> {
    return this.http.patch<{ marked: number }>(`${API_BASE}/notifications/read-all`, {});
  }

  private fetchRecent(): Observable<NotificationPage> {
    return this.http.get<NotificationPage>(`${API_BASE}/notifications/recent`, {
      params: { lang: this.langCode() },
    });
  }

  private apply(page: NotificationPage): void {
    this.recent.set(page.items);
    this.unreadCount.set(page.unreadCount);
  }

  /** The server renders the wording, so it needs to know which language is on screen. */
  private langCode(): string {
    return this.lang.current() === 'arabic' ? 'ar' : 'en';
  }
}
