import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SessionService } from './session.service';

const TOKEN_KEY = 'ioj_token';

/**
 * Adds the bearer token, and ends the session when the server rejects it (expired, forged, or the account is
 * gone). A failed sign-in also answers 401, so the login call itself is left to the login page.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = TokenStore.get();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  // Resolved only when needed: SessionService needs AuthService, which needs HttpClient — which runs this.
  const injector = inject(Injector);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && token && !req.url.endsWith('/auth/login')) {
        injector.get(SessionService).end('expired');
      }
      return throwError(() => err);
    }),
  );
};

/** Helpers used by AuthService to persist/clear the token without importing the interceptor. */
export const TokenStore = {
  set(token: string): void {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
  },
  clear(): void {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
  get(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
};
