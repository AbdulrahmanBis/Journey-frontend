import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'ioj_token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
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
