import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Department } from '../models/models';
import { API_BASE } from './api.config';

export interface DepartmentPayload {
  english: string;
  arabic: string;
}

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private http = inject(HttpClient);

  /** Every department, with member counts. Readable by any signed-in user. */
  list(): Observable<Department[]> {
    return this.http.get<Department[]>(`${API_BASE}/departments`);
  }

  /** Admin and HR only. */
  create(payload: DepartmentPayload): Observable<Department> {
    return this.http.post<Department>(`${API_BASE}/departments`, payload);
  }

  rename(id: string, payload: DepartmentPayload): Observable<Department> {
    return this.http.put<Department>(`${API_BASE}/departments/${id}`, payload);
  }

  /** Fails with 409 while the department still has people in it. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/departments/${id}`);
  }
}
