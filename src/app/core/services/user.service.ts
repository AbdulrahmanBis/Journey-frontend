import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/models';
import { RoleCode } from '../models/enums';
import { API_BASE } from './api.config';

/** Fields accepted when updating a user — `role` is the numeric code. */
export interface UserPayload {
  name?: string;
  email?: string;
  password?: string;
  role?: number;
  departmentId?: string;
  seniorId?: string;
  /** seniorId cannot be cleared by sending null (null means "unchanged"); set this instead. */
  clearSenior?: boolean;
}

export interface NewUser {
  name: string;
  email: string;
  password: string;
  role: number;
  departmentId: string;
  seniorId?: string;
}

/**
 * Every list call is limited server-side to the people the caller may see: a Senior their own
 * learners, a Manager their department, HR and Admin everyone. The filters only narrow that.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  /** @param departmentId HR and Admin only; ignored for a Manager, who always gets their own. */
  getUsers(departmentId?: string | null): Observable<User[]> {
    return this.http.get<User[]>(`${API_BASE}/users`, { params: departmentId ? { departmentId } : {} });
  }

  getById(id: string): Observable<User> {
    return this.http.get<User>(`${API_BASE}/users/${id}`);
  }

  getSeniors(departmentId?: string | null): Observable<User[]> {
    return this.http.get<User[]>(`${API_BASE}/users`, {
      params: { role: String(RoleCode.Senior), ...(departmentId ? { departmentId } : {}) },
    });
  }

  getLearners(departmentId?: string | null): Observable<User[]> {
    return this.http.get<User[]>(`${API_BASE}/users`, {
      params: { role: String(RoleCode.Learner), ...(departmentId ? { departmentId } : {}) },
    });
  }

  getLearnersBySenior(seniorId: string): Observable<User[]> {
    return this.http.get<User[]>(`${API_BASE}/users`, {
      params: { role: String(RoleCode.Learner), seniorId },
    });
  }

  createUser(data: NewUser): Observable<User> {
    return this.http.post<User>(`${API_BASE}/users`, data);
  }

  updateUser(id: string, changes: UserPayload): Observable<User> {
    return this.http.put<User>(`${API_BASE}/users/${id}`, changes);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/users/${id}`);
  }

  assignLearnerToSenior(learnerId: string, seniorId: string): Observable<User> {
    return this.http.patch<User>(`${API_BASE}/users/${learnerId}`, { seniorId });
  }
}
