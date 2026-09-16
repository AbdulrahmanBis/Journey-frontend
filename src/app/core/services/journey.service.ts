import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Journey, JourneyItem } from '../models/models';
import { TechTag } from '../models/enums';
import { API_BASE } from './api.config';

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

export interface JourneyPayload {
  title: string;
  description: string;
  techTag: TechTag;
  items: {
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
