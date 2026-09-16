import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { User } from '../models/models';
import { API_BASE } from './api.config';
import { TokenStore } from './auth.interceptor';

const USER_KEY = 'ioj_user';

interface AuthResponse {
  user: User;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);

  private currentUserSubject = new BehaviorSubject<User | null>(this.restoreUser());
  readonly currentUser$ = this.currentUserSubject.asObservable();

  get currentUser(): User | null { return this.currentUserSubject.value; }
  get isLoggedIn(): boolean { return !!this.currentUser; }

  /** Role checks compare numeric codes — the wire format is `{ code, english, arabic }`. */
  hasRole(...roleCodes: number[]): boolean {
    const code = this.currentUser?.role?.code;
    return code !== undefined && roleCodes.includes(code);
  }

  private restoreUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch { return null; }
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>(`${API_BASE}/auth/login`, { email, password }).pipe(
      tap((res) => this.persist(res)),
      map((res) => res.user),
      catchError((err) => throwError(() =>
        new Error(err?.error?.message ?? this.translate.instant('AUTH.INVALID_CREDENTIALS')))),
    );
  }

  signup(data: { name: string; email: string; password: string }): Observable<User> {
    return this.http.post<AuthResponse>(`${API_BASE}/auth/signup`, data).pipe(
      tap((res) => this.persist(res)),
      map((res) => res.user),
      catchError((err) => throwError(() =>
        new Error(err?.error?.message ?? this.translate.instant('AUTH.COULD_NOT_CREATE')))),
    );
  }

  logout(): void {
    this.currentUserSubject.next(null);
    TokenStore.clear();
    try { localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
  }

  private persist(res: AuthResponse): void {
    TokenStore.set(res.token);
    this.currentUserSubject.next(res.user);
    try { localStorage.setItem(USER_KEY, JSON.stringify(res.user)); } catch { /* ignore */ }
  }
}
