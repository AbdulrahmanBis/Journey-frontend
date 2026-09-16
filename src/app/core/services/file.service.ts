import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE } from './api.config';
import { TokenStore } from './auth.interceptor';

export interface UploadedFile {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

/** Either upload progress, or the finished result. */
export type UploadStatus =
  | { state: 'progress'; percent: number }
  | { state: 'done'; file: UploadedFile };

@Injectable({ providedIn: 'root' })
export class FileService {
  private http = inject(HttpClient);

  /**
   * POST /api/files — multipart upload.
   *
   * Reports progress because video files are large enough that a silent wait looks broken.
   */
  upload(file: File): Observable<UploadStatus> {
    const form = new FormData();
    form.append('file', file);

    return this.http
      .post<UploadedFile>(`${API_BASE}/files`, form, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        map((event: HttpEvent<UploadedFile>): UploadStatus => {
          if (event.type === HttpEventType.UploadProgress) {
            const percent = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
            return { state: 'progress', percent };
          }
          if (event.type === HttpEventType.Response) {
            return { state: 'done', file: event.body as UploadedFile };
          }
          return { state: 'progress', percent: 0 };
        }),
      );
  }

  /**
   * Direct URL for an uploaded file.
   *
   * `<img>` and `<video>` cannot send an Authorization header, and routing them through XHR into a
   * blob would break range requests — and with them video seeking — so the token goes in the query
   * string. The backend only accepts `?token=` on this one path.
   */
  mediaUrl(storageKey: string | null | undefined): string {
    if (!storageKey) return '';
    const token = TokenStore.get();
    const base = `${API_BASE}/files/${storageKey}`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  }

  /** Human-readable size for the attachment chip. */
  formatSize(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
  }
}
