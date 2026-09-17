import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { API_BASE } from './api.config';

/**
 * Bump when the guide changes enough that everyone should see it once more; people who dismissed an
 * older version get the new one on their next visit.
 */
export const INTRO_GUIDE_VERSION = 1;

const SESSION_KEY = 'ioj_intro_closed';

/**
 * When the intro guide shows. It opens on its own once per browser session until the person ticks
 * "Don't show this again" or finishes it (saved on their account, so it follows them to other
 * devices), and it can always be reopened from the help button.
 */
@Injectable({ providedIn: 'root' })
export class IntroGuideService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  readonly isOpen = signal(false);

  /** Called whenever someone is signed in; opens the guide if they still need it. */
  showIfNeeded(): void {
    const user = this.auth.currentUser;
    if (!user || this.isOpen()) return;
    if ((user.introSeenVersion ?? 0) >= INTRO_GUIDE_VERSION) return;
    if (this.closedThisSession()) return;
    this.isOpen.set(true);
  }

  open(): void { this.isOpen.set(true); }

  /** @param forGood also remember it on the account */
  close(forGood: boolean): void {
    this.isOpen.set(false);
    try { sessionStorage.setItem(this.sessionKey(), '1'); } catch { /* ignore */ }
    if (!forGood || (this.auth.currentUser?.introSeenVersion ?? 0) >= INTRO_GUIDE_VERSION) return;
    this.http.patch(`${API_BASE}/users/me/intro`, { version: INTRO_GUIDE_VERSION }).subscribe({
      next: () => this.auth.updateCurrentUser({ introSeenVersion: INTRO_GUIDE_VERSION }),
      error: () => undefined,
    });
  }

  private closedThisSession(): boolean {
    try { return sessionStorage.getItem(this.sessionKey()) === '1'; } catch { return false; }
  }

  /** Per person, so someone else signing in on the same tab still gets their guide. */
  private sessionKey(): string {
    return SESSION_KEY + ':' + (this.auth.currentUser?.id ?? '');
  }
}
