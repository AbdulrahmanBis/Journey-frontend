import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GroupMetrics, LearnerMetrics, OrgMetrics } from '../models/metrics';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private http = inject(HttpClient);

  // GET /api/metrics/learner/:id → LearnerMetrics
  getLearnerMetrics(learnerId: string): Observable<LearnerMetrics> {
    return this.http.get<LearnerMetrics>(`${API_BASE}/metrics/learner/${learnerId}`);
  }

  // GET /api/metrics/senior/:id → GroupMetrics
  // optional ?learnerId= to drill into one learner (returns LearnerMetrics shape)
  getSeniorTeamMetrics(seniorId: string): Observable<GroupMetrics> {
    return this.http.get<GroupMetrics>(`${API_BASE}/metrics/senior/${seniorId}`);
  }

  // GET /api/metrics/org → OrgMetrics
  // optional ?seniorId= to scope to one senior's team (returns GroupMetrics shape)
  getOrgMetrics(): Observable<OrgMetrics> {
    return this.http.get<OrgMetrics>(`${API_BASE}/metrics/org`);
  }

  // GET /api/metrics/senior/:id  — reused for manager "pick a senior" drill-down
  getSeniorScopedMetrics(seniorId: string): Observable<GroupMetrics> {
    return this.http.get<GroupMetrics>(`${API_BASE}/metrics/senior/${seniorId}`);
  }
}
