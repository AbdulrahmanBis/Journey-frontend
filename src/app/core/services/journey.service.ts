import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Journey, JourneyItem, JourneyPreview, JourneyUnit } from '../models/models';
import { TechTag } from '../models/enums';
import { API_BASE } from './api.config';
import { QuestionDraft } from './exam.service';

/** Attachments are sent as the complete set for an item — anything omitted is deleted. */
export interface AttachmentPayload {
  id?: string;
  kind: number;
  label?: string;
  url?: string;
  storageKey?: string;
  mimeType?: string;
  sizeBytes?: number;
  originalName?: string;
}

export interface UnitPayload {
  /** Present for an existing unit, so learners' progress on it is kept. */
  id?: string;
  title: string;
  description?: string;
  items: { id?: string; title: string; description: string; attachments?: AttachmentPayload[] }[];
  quiz: QuestionDraft[];
}

export interface JourneyPayload {
  title: string;
  description: string;
  techTag: TechTag;
  targetDays?: number | null;
  /** The journey's units, each with its items and quiz. Takes precedence over `items`. */
  units?: UnitPayload[];
  items?: {
    id?: string;
    title: string;
    description: string;
    attachments?: AttachmentPayload[];
  }[];
}

@Injectable({ providedIn: 'root' })
export class JourneyService {
  private http = inject(HttpClient);

  // GET /api/journeys → Journey[]
  getJourneys(): Observable<Journey[]> {
    return this.http.get<Journey[]>(`${API_BASE}/journeys`);
  }

  // GET /api/journeys/:id → Journey
  getJourneyById(id: string): Observable<Journey> {
    return this.http.get<Journey>(`${API_BASE}/journeys/${id}`);
  }

  // GET /api/journeys/:id/items → JourneyItem[]
  /** Units with items and quiz answers, for the journey form (staff). */
  /** The journey as a learner would see it, nothing saved. Learners get the first unit only. */
  getPreview(journeyId: string): Observable<JourneyPreview> {
    return this.http.get<JourneyPreview>(`${API_BASE}/journeys/${journeyId}/preview`);
  }

  getUnitsForJourney(journeyId: string): Observable<JourneyUnit[]> {
    return this.http.get<JourneyUnit[]>(`${API_BASE}/journeys/${journeyId}/units`);
  }

  getItemsForJourney(journeyId: string): Observable<JourneyItem[]> {
    return this.http.get<JourneyItem[]>(`${API_BASE}/journeys/${journeyId}/items`);
  }

  // POST /api/journeys   body: { title, description, techTag, items[] }
  createJourney(payload: JourneyPayload): Observable<Journey> {
    return this.http.post<Journey>(`${API_BASE}/journeys`, payload);
  }

  // PUT /api/journeys/:id   body: { title, description, techTag, items[] }
  updateJourney(id: string, payload: JourneyPayload): Observable<Journey> {
    return this.http.put<Journey>(`${API_BASE}/journeys/${id}`, payload);
  }

  // DELETE /api/journeys/:id
  deleteJourney(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/journeys/${id}`);
  }
}
