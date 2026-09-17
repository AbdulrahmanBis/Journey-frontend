import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JourneyPackage, PackageAssignment, PackageContext } from '../models/models';
import { API_BASE } from './api.config';

export interface PackagePayload {
  title: string;
  description?: string;
  /** Expected duration in days; the default due date when assigned. */
  targetDays?: number | null;
  /** In the order learners should take them. */
  journeyIds: string[];
}

/**
 * Packages are bundles of journeys. Assigning one creates ordinary journey assignments (reusing any
 * the learner already has), so everything about a single journey keeps working unchanged.
 */
@Injectable({ providedIn: 'root' })
export class PackageService {
  private http = inject(HttpClient);

  list(): Observable<JourneyPackage[]> {
    return this.http.get<JourneyPackage[]>(`${API_BASE}/packages`);
  }

  get(id: string): Observable<JourneyPackage> {
    return this.http.get<JourneyPackage>(`${API_BASE}/packages/${id}`);
  }

  create(payload: PackagePayload): Observable<JourneyPackage> {
    return this.http.post<JourneyPackage>(`${API_BASE}/packages`, payload);
  }

  /** Affects future assignments only. */
  update(id: string, payload: PackagePayload): Observable<JourneyPackage> {
    return this.http.put<JourneyPackage>(`${API_BASE}/packages/${id}`, payload);
  }

  /** 409 once the package has ever been assigned. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/packages/${id}`);
  }

  /** `dueDate` (YYYY-MM-DD) is optional; the server defaults it from the package's target days. */
  assign(packageId: string, learnerId: string, dueDate?: string | null): Observable<PackageAssignment> {
    return this.http.post<PackageAssignment>(`${API_BASE}/package-assignments`, { packageId, learnerId, dueDate: dueDate || null });
  }

  assignmentsFor(learnerId: string): Observable<PackageAssignment[]> {
    return this.http.get<PackageAssignment[]>(`${API_BASE}/package-assignments`, { params: { learnerId } });
  }

  /** Manager, HR or Admin. Cancels the unfinished journeys the package created. */
  cancel(assignmentId: string): Observable<PackageAssignment> {
    return this.http.post<PackageAssignment>(`${API_BASE}/package-assignments/${assignmentId}/cancel`, {});
  }

  /** The live packages a learner journey is part of, with the next journey in each. */
  contextFor(learnerJourneyId: string): Observable<PackageContext[]> {
    return this.http.get<PackageContext[]>(`${API_BASE}/learner-journeys/${learnerJourneyId}/packages`);
  }
}
