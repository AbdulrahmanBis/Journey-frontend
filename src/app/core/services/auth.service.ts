import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { User } from '../models/models';
import { UserRole } from '../models/enums';
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

  private currentUserSubject = new BehaviorSubject<User | null>(this.restoreUser());
  readonly currentUser$ = this.currentUserSubject.asObservable();

  get currentUser(): User | null { return this.currentUserSubject.value; }
  get isLoggedIn(): boolean { return !!this.currentUser; }

  hasRole(...roles: UserRole[]): boolean {
    return !!this.currentUser && roles.includes(this.currentUser.role);
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
      catchError((err) => throwError(() => new Error(err?.error?.message ?? 'Incorrect email or password.'))),
    );
  }

  signup(data: { name: string; email: string; password: string }): Observable<User> {
    return this.http.post<AuthResponse>(`${API_BASE}/auth/signup`, data).pipe(
      tap((res) => this.persist(res)),
      map((res) => res.user),
      catchError((err) => throwError(() => new Error(err?.error?.message ?? 'Could not create account.'))),
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
