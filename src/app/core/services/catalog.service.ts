import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CatalogDetail, CatalogPage } from '../models/models';
import { CatalogTypeCode } from '../models/enums';
import { API_BASE } from './api.config';

export type CatalogSort = 'relevance' | 'title' | 'newest' | 'popular';

export interface CatalogQuery {
  q?: string | null;
  /** CatalogTypeCode */
  type?: number | null;
  tag?: string | null;
  /** LearningStatusCode — learners only */
  status?: number | null;
  sort?: CatalogSort | null;
}

/** Filtering, facet counts and ranking happen on the server, per signed-in user. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private http = inject(HttpClient);

  browse(query: CatalogQuery): Observable<CatalogPage> {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined && value !== '') params[key] = String(value);
    }
    return this.http.get<CatalogPage>(`${API_BASE}/catalog`, { params });
  }

  detail(type: CatalogTypeCode, id: string): Observable<CatalogDetail> {
    const segment = type === CatalogTypeCode.Package ? 'packages' : 'journeys';
    return this.http.get<CatalogDetail>(`${API_BASE}/catalog/${segment}/${id}`);
  }

  /** Learners only. For a package, `learnerJourneyId` is its first journey. */
  enroll(type: number, id: string): Observable<{ learnerJourneyId?: string; packageAssignmentId?: string }> {
    return this.http.post<{ learnerJourneyId?: string; packageAssignmentId?: string }>(
      `${API_BASE}/catalog/enroll`, { type, id });
  }
}
