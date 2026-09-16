import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/models';
import { RoleCode } from '../models/enums';
import { API_BASE } from './api.config';

/** Fields accepted when creating or updating a user — `role` is the numeric code. */
export interface UserPayload {
  name?: string;
  email?: string;
  password?: string;
  role?: number;
  seniorId?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  // GET /api/users            → all users
  // GET /api/users?role=1003  → seniors

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${API_BASE}/users`);
  }

  getById(id: string): Observable<User> {
    return this.http.get<User>(`${API_BASE}/users/${id}`);
  }

  getSeniors(): Observable<User[]> {
    return this.http.get<User[]>(`${API_BASE}/users`, { params: { role: String(RoleCode.Senior) } });
  }

  getLearners(): Observable<User[]> {
    return this.http.get<User[]>(`${API_BASE}/users`, { params: { role: String(RoleCode.Learner) } });
  }

  getLearnersBySenior(seniorId: string): Observable<User[]> {
    return this.http.get<User[]>(`${API_BASE}/users`, {
      params: { role: String(RoleCode.Learner), seniorId },
    });
  }

  // POST /api/users
  createUser(data: { name: string; email: string; password: string; role: number; seniorId?: string }): Observable<User> {
    return this.http.post<User>(`${API_BASE}/users`, data);
  }

  // PUT /api/users/:id
  updateUser(id: string, changes: UserPayload): Observable<User> {
    return this.http.put<User>(`${API_BASE}/users/${id}`, changes);
  }

  // DELETE /api/users/:id
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/users/${id}`);
  }

  assignLearnerToSenior(learnerId: string, seniorId: string): Observable<User> {
    return this.http.patch<User>(`${API_BASE}/users/${learnerId}`, { seniorId });
  }
}
