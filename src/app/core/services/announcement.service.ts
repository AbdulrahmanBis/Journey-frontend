import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Announcement } from '../models/models';
import { API_BASE } from './api.config';

export interface AnnouncementPayload {
  title: string;
  body: string;
  /** Everyone in the company (HR and Admin only). */
  orgWide: boolean;
  /** When not org-wide; a Manager's announcement always goes to their own department. */
  departmentIds: string[];
  showUntil: string | null;
  /** On edit: notify the audience again. */
  notifyAgain?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  private http = inject(HttpClient);

  /** The announcements page (Manager, HR, Admin). `departmentId` narrows it for HR and Admin. */
  list(departmentId?: string | null): Observable<Announcement[]> {
    let params = new HttpParams();
    if (departmentId) params = params.set('departmentId', departmentId);
    return this.http.get<Announcement[]>(`${API_BASE}/announcements`, { params });
  }

  /** What belongs at the top of the caller's dashboard. */
  active(): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${API_BASE}/announcements/active`);
  }

  get(id: string): Observable<Announcement> {
    return this.http.get<Announcement>(`${API_BASE}/announcements/${id}`);
  }

  create(payload: AnnouncementPayload): Observable<Announcement> {
    return this.http.post<Announcement>(`${API_BASE}/announcements`, payload);
  }

  update(id: string, payload: AnnouncementPayload): Observable<Announcement> {
    return this.http.put<Announcement>(`${API_BASE}/announcements/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/announcements/${id}`);
  }

  /** Removes it from the caller's dashboard only. */
  dismiss(id: string): Observable<void> {
    return this.http.post<void>(`${API_BASE}/announcements/${id}/dismiss`, {});
  }
}
