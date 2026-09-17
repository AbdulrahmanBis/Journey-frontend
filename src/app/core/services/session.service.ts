import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

/** Signed in but untouched for this long: the session ends and the person is sent to the sign-in page. */
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

/** Shared by every open tab, so working in one tab keeps the others signed in too. */
const LAST_ACTIVITY_KEY = 'ioj_last_activity';
const CHECK_EVERY_MS = 15 * 1000;
/** Mouse moves fire constantly; storage is written at most this often. */
const WRITE_EVERY_MS = 10 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart'];

export type SessionEndReason = 'idle' | 'expired';

/**
 * Ends the session when the person stops using the app, and when the server says the token is no longer
 * valid. Either way they land on the sign-in page with a notice, and come back to the page they were on.
 *
 * <p>Activity is any pointer, key, scroll or touch input in any tab, plus a playing video or audio (watching a
 * lesson is not idling). A browser that was closed or asleep for longer than the timeout is signed out on the
 * next check.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private zone = inject(NgZone);

  private lastWrite = 0;
  private ending = false;

  /** Called once from the app shell. */
  start(): void {
    this.zone.runOutsideAngular(() => {
      const onActivity = () => this.touch();
      for (const type of ACTIVITY_EVENTS) {
        document.addEventListener(type, onActivity, { passive: true, capture: true });
      }
      setInterval(() => this.check(), CHECK_EVERY_MS);
      // Another tab signed out (or in as someone else): follow it.
      window.addEventListener('storage', (event) => {
        if (event.key === 'ioj_token' && !event.newValue && this.auth.isLoggedIn) {
          this.zone.run(() => {
            this.auth.logout();
            this.router.navigate(['/login']);
          });
        }
      });
    });
    this.check();
  }

  /** Marks "now" as the last activity — also called on sign-in, so an old timestamp cannot end the new session. */
  touch(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastWrite < WRITE_EVERY_MS) return;
    this.lastWrite = now;
    try { localStorage.setItem(LAST_ACTIVITY_KEY, String(now)); } catch { /* ignore */ }
  }

  /** Signs the person out, tells them why, and remembers where they were. */
  end(reason: SessionEndReason): void {
    if (!this.auth.isLoggedIn || this.ending) return;
    this.ending = true;
    this.zone.run(() => {
      // Before the first navigation (a stale session found on page load) the router has no url yet.
      const current = this.router.navigated ? this.router.url : window.location.pathname + window.location.search;
      const returnUrl = current.startsWith('/login') || current === '/' ? undefined : current;
      this.auth.logout();
      // get(), not instant(): on page load the translations may not have arrived yet.
      this.translate.get(reason === 'idle' ? 'SESSION.IDLE' : 'SESSION.EXPIRED')
        .subscribe((message: string) => this.toast.show(message, 'info', 8000));
      this.router.navigate(['/login'], { queryParams: returnUrl ? { returnUrl } : {} })
        .finally(() => (this.ending = false));
    });
  }

  private check(): void {
    if (!this.auth.isLoggedIn) return;
    if (this.mediaPlaying()) {
      this.touch(true);
      return;
    }
    if (Date.now() - this.lastActivity() >= IDLE_TIMEOUT_MS) this.end('idle');
  }

  private lastActivity(): number {
    try {
      const stored = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
      return Number.isFinite(stored) && stored > 0 ? stored : 0;
    } catch {
      return Date.now();
    }
  }

  private mediaPlaying(): boolean {
    return Array.from(document.querySelectorAll<HTMLMediaElement>('video, audio')).some((m) => !m.paused && !m.ended);
  }
}
