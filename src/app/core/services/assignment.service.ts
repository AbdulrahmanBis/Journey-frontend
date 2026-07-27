import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  LearnerJourney,
  LearnerJourneyItem,
  LearnerJourneyView,
  LearnerSummary,
  Note,
  SeniorSummary,
  User,
} from '../models/models';
import { Status } from '../models/enums';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class AssignmentService {
  private http = inject(HttpClient);

  // ----------------------------- Reads --------------------------------

  // GET /api/learner-journeys?learnerId=x → LearnerJourneyView[]
  getLearnerJourneyViews(learnerId: string): Observable<LearnerJourneyView[]> {
    return this.http.get<LearnerJourneyView[]>(`${API_BASE}/learner-journeys`, { params: { learnerId } });
  }

  // GET /api/learner-journeys/:id → LearnerJourneyView (full composed view with items)
  getLearnerJourneyView(id: string): Observable<LearnerJourneyView> {
    return this.http.get<LearnerJourneyView>(`${API_BASE}/learner-journeys/${id}`);
  }

  // GET /api/dashboard/senior/:id → LearnerSummary[]
  getSeniorOverview(seniorId: string): Observable<LearnerSummary[]> {
    return this.http.get<LearnerSummary[]>(`${API_BASE}/dashboard/senior/${seniorId}`);
  }

  // GET /api/dashboard/manager → SeniorSummary[]
  getManagerOverview(): Observable<SeniorSummary[]> {
    return this.http.get<SeniorSummary[]>(`${API_BASE}/dashboard/manager`);
  }

  // ----------------------------- Mutations -----------------------------

  // POST /api/learner-journeys  body: { journeyId, learnerId }
  assignJourney(journeyId: string, learnerId: string, assignedBy: User): Observable<LearnerJourney> {
    return this.http.post<LearnerJourney>(`${API_BASE}/learner-journeys`, {
      journeyId,
      learnerId,
      assignedById: assignedBy.id,
      assignedByName: assignedBy.name,
    });
  }

  // PATCH /api/learner-journeys/:id/status  body: { status }
  updateJourneyStatus(learnerJourneyId: string, status: Status): Observable<LearnerJourney> {
    return this.http.patch<LearnerJourney>(`${API_BASE}/learner-journeys/${learnerJourneyId}/status`, { status });
  }

  // PATCH /api/learner-journey-items/:id/status  body: { status, timeSpentHours? }
  updateItemStatus(
    learnerJourneyItemId: string,
    status: Status,
    actor: User,
    timeSpentHours?: number,
  ): Observable<LearnerJourneyItem> {
    return this.http.patch<LearnerJourneyItem>(
      `${API_BASE}/learner-journey-items/${learnerJourneyItemId}/status`,
      { status, timeSpentHours, actorId: actor.id },
    );
  }

  // POST /api/learner-journey-items/:id/notes  body: { message, actorId }
  addNote(learnerJourneyItemId: string, message: string, actor: User): Observable<Note> {
    return this.http.post<Note>(
      `${API_BASE}/learner-journey-items/${learnerJourneyItemId}/notes`,
      { message, actorId: actor.id, actorName: actor.name, actorRole: actor.role },
    );
  }
}
