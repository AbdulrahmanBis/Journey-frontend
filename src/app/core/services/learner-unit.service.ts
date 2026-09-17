import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ItemContent, JourneyOutline, Note, OutlineItem, UnitQuiz } from '../models/models';
import { EnumValue } from '../models/enums';
import { API_BASE } from './api.config';

export interface UnitStatusResult {
  learnerUnitId: string;
  status: EnumValue;
  readyForReview: boolean;
}

export interface QuizAnswerPayload {
  questionId: string;
  selectedOptionIndex?: number;
  boolAnswer?: boolean;
}

/**
 * The unit-based journey log. Items move only through the learner's own calls (open, complete, time);
 * reviewers act on units (status, notes).
 */
@Injectable({ providedIn: 'root' })
export class LearnerUnitService {
  private http = inject(HttpClient);

  outline(learnerJourneyId: string): Observable<JourneyOutline> {
    return this.http.get<JourneyOutline>(`${API_BASE}/learner-journeys/${learnerJourneyId}/outline`);
  }

  item(progressId: string): Observable<ItemContent> {
    return this.http.get<ItemContent>(`${API_BASE}/learner-journey-items/${progressId}`);
  }

  /** Learner only: new → in progress. */
  open(progressId: string): Observable<OutlineItem> {
    return this.http.post<OutlineItem>(`${API_BASE}/learner-journey-items/${progressId}/open`, {});
  }

  /** Learner only: "Next" completes the item. */
  complete(progressId: string): Observable<OutlineItem> {
    return this.http.post<OutlineItem>(`${API_BASE}/learner-journey-items/${progressId}/complete`, {});
  }

  /** Learner only: active reading time while an item is open. */
  addTime(progressId: string, seconds: number): Observable<void> {
    return this.http.post<void>(`${API_BASE}/learner-journey-items/${progressId}/time`, { seconds });
  }

  quiz(learnerUnitId: string): Observable<UnitQuiz> {
    return this.http.get<UnitQuiz>(`${API_BASE}/learner-journey-units/${learnerUnitId}/quiz`);
  }

  submitQuiz(learnerUnitId: string, answers: QuizAnswerPayload[]): Observable<UnitQuiz> {
    return this.http.post<UnitQuiz>(`${API_BASE}/learner-journey-units/${learnerUnitId}/quiz`, { answers });
  }

  /** Learner: send a finished unit (back) for review. */
  submitUnit(learnerUnitId: string): Observable<UnitStatusResult> {
    return this.http.post<UnitStatusResult>(`${API_BASE}/learner-journey-units/${learnerUnitId}/submit`, {});
  }

  /** Reviewer: complete the unit, or send it back. `status` is a StatusCode. */
  setUnitStatus(learnerUnitId: string, status: number): Observable<UnitStatusResult> {
    return this.http.patch<UnitStatusResult>(`${API_BASE}/learner-journey-units/${learnerUnitId}/status`, { status });
  }

  addUnitNote(learnerUnitId: string, message: string): Observable<Note> {
    return this.http.post<Note>(`${API_BASE}/learner-journey-units/${learnerUnitId}/notes`, { message });
  }
}
