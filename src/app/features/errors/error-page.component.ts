import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { ErrorPageKind } from '../../core/services/api-error';

/**
 * The page for an address that leads nowhere: an unknown route, or a record that is missing, out of reach or
 * failed to load (see openErrorPage). The address bar keeps what the person opened, so they can check it,
 * go back, or retry.
 */
@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [AsyncPipe, NgIf, RouterLink, TranslatePipe],
  template: `
    <section class="error-page d-flex flex-column align-items-center text-center mx-auto py-5 gap-3">
      <span class="error-code" aria-hidden="true">{{ kind === 'not-found' ? '404' : kind === 'forbidden' ? '403' : '!' }}</span>
      <h1 class="h3 mb-0">{{ 'ERRORS.' + key + '.TITLE' | translate }}</h1>
      <p class="text-body-secondary mb-0">{{ 'ERRORS.' + key + '.HINT' | translate }}</p>
      <p class="small text-body-tertiary mb-0" *ngIf="message" dir="auto">{{ message }}</p>
      <div class="d-flex flex-wrap justify-content-center gap-2 mt-2">
        <ng-container *ngIf="auth.currentUser$ | async; else signIn">
          <button type="button" class="btn btn-outline-secondary" (click)="back()">{{ 'COMMON.BACK' | translate }}</button>
          <button type="button" class="btn btn-outline-secondary" *ngIf="kind === 'error'" (click)="retry()">{{ 'ERRORS.RETRY' | translate }}</button>
          <a class="btn btn-primary" routerLink="/dashboard">{{ 'ERRORS.HOME' | translate }}</a>
        </ng-container>
        <ng-template #signIn>
          <a class="btn btn-primary" routerLink="/login">{{ 'AUTH.SIGN_IN' | translate }}</a>
        </ng-template>
      </div>
    </section>
  `,
  styles: [
    `
      .error-page { max-inline-size: 32rem; }
      .error-code {
        font-size: 4.5rem;
        font-weight: 700;
        line-height: 1;
        color: var(--bs-primary);
        opacity: 0.35;
      }
    `,
  ],
})
export class ErrorPageComponent implements OnInit {
  auth = inject(AuthService);
  private location = inject(Location);
  // skipLocationChange keeps the state off browser history, so it is only available while navigating.
  private state = (inject(Router).getCurrentNavigation()?.extras.state ?? {}) as { kind?: ErrorPageKind; message?: string | null };

  kind: ErrorPageKind = 'not-found';
  message: string | null = null;

  get key(): string {
    return this.kind === 'not-found' ? 'NOT_FOUND' : this.kind === 'forbidden' ? 'FORBIDDEN' : 'FAILED';
  }

  ngOnInit(): void {
    if (this.state.kind) this.kind = this.state.kind;
    this.message = this.state.message ?? null;
  }

  back(): void {
    this.location.back();
  }

  retry(): void {
    window.location.reload();
  }
}
