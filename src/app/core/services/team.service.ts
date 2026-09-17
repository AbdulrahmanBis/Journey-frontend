import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LearnerSnapshot, TeamOverview } from '../models/models';
import { API_BASE } from './api.config';

/** The team dashboard. Scope is decided on the server: a Senior's learners, a Manager's department, everyone for HR/Admin. */
@Injectable({ providedIn: 'root' })
export class TeamService {
  private http = inject(HttpClient);

  /** @param departmentId HR/Admin only. @param seniorId narrows to one senior's learners (not for Seniors). */
  overview(departmentId?: string | null, seniorId?: string | null): Observable<TeamOverview> {
    const params: Record<string, string> = {};
    if (departmentId) params['departmentId'] = departmentId;
    if (seniorId) params['seniorId'] = seniorId;
    return this.http.get<TeamOverview>(`${API_BASE}/team`, { params });
  }

  learner(learnerId: string): Observable<LearnerSnapshot> {
    return this.http.get<LearnerSnapshot>(`${API_BASE}/team/learners/${learnerId}`);
  }
}
