import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Certificate } from '../models/models';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class CertificateService {
  private http = inject(HttpClient);

  /** Newest first. Omit learnerId for the caller's own; staff may pass a learner they can see. */
  list(learnerId?: string): Observable<Certificate[]> {
    let params = new HttpParams();
    if (learnerId) params = params.set('learnerId', learnerId);
    return this.http.get<Certificate[]>(`${API_BASE}/certificates`, { params });
  }

  get(id: string): Observable<Certificate> {
    return this.http.get<Certificate>(`${API_BASE}/certificates/${id}`);
  }
}
