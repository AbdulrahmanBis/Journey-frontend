import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  LearnerJourney,
  LearnerJourneyItem,
  LearnerJourneyView,
  Note,
  User,
} from '../models/models';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class AssignmentService {
  private http = inject(HttpClient);

  // ----------------------------- Reads --------------------------------

  getLearnerJourneyViews(learnerId: string): Observable<LearnerJourneyView[]> {
    return this.http.get<LearnerJourneyView[]>(`${API_BASE}/learner-journeys`, { params: { learnerId } });
  }

  getLearnerJourneyView(id: string): Observable<LearnerJourneyView> {
    return this.http.get<LearnerJourneyView>(`${API_BASE}/learner-journeys/${id}`);
  }

  // ----------------------------- Mutations -----------------------------

  /** `dueDate` (YYYY-MM-DD) is optional; the server defaults it from the journey's target days. */
  assignJourney(journeyId: string, learnerId: string, assignedBy: User, dueDate?: string | null): Observable<LearnerJourney> {
    return this.http.post<LearnerJourney>(`${API_BASE}/learner-journeys`, {
      journeyId,
      learnerId,
      assignedById: assignedBy.id,
      assignedByName: assignedBy.name,
      dueDate: dueDate || null,
    });
  }

  /** Staff only. `null` clears the deadline. */
  updateDueDate(learnerJourneyId: string, dueDate: string | null): Observable<LearnerJourneyView> {
    return this.http.patch<LearnerJourneyView>(`${API_BASE}/learner-journeys/${learnerJourneyId}/due-date`, { dueDate });
  }

  /** `status` is the numeric ItemStatus code. */
  updateJourneyStatus(learnerJourneyId: string, status: number): Observable<LearnerJourney> {
    return this.http.patch<LearnerJourney>(`${API_BASE}/learner-journeys/${learnerJourneyId}/status`, { status });
  }

  /** `status` is the numeric ItemStatus code; hours are required when completing. */
  updateItemStatus(
    learnerJourneyItemId: string,
    status: number,
    actor: User,
    timeSpentHours?: number,
  ): Observable<LearnerJourneyItem> {
    return this.http.patch<LearnerJourneyItem>(
      `${API_BASE}/learner-journey-items/${learnerJourneyItemId}/status`,
      { status, timeSpentHours, actorId: actor.id },
    );
  }

  addNote(learnerJourneyItemId: string, message: string, actor: User): Observable<Note> {
    return this.http.post<Note>(
      `${API_BASE}/learner-journey-items/${learnerJourneyItemId}/notes`,
      { message, actorId: actor.id, actorName: actor.name, actorRole: actor.role.code },
    );
  }
}
