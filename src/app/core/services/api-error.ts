import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

/** One field problem inside ERR-VALIDATION-FAILED. */
export interface ApiFieldError {
  field: string;
  code: string;
  english: string;
  arabic: string;
}

/** The body of every error the API returns (backend: ApiErrorDto / ErrorCode). */
export interface ApiError {
  code: string;
  status: number;
  english: string;
  arabic: string;
  fields?: ApiFieldError[];
  traceId?: string;
}

/** Shown when the request never reached the server, which therefore sent no message of its own. */
const NETWORK = {
  english: 'Cannot reach the server. Check your connection and try again.',
  arabic: 'تعذّر الوصول إلى الخادم. تحقّق من اتصالك وحاول مرة أخرى.',
};

const isArabic = (): boolean => document.documentElement.lang === 'ar';

/** The API error body, when the response carries one. */
export function apiError(err: unknown): ApiError | null {
  const body = err instanceof HttpErrorResponse ? err.error : (err as { error?: unknown })?.error;
  return body && typeof body === 'object' && typeof (body as ApiError).code === 'string' ? (body as ApiError) : null;
}

/**
 * The message to show for a failed request, in the reader's language, or null when there is nothing specific to
 * say (the caller then shows its own fallback). Field problems are listed after the summary; an unexpected
 * server error carries its reference so support can find it in the log.
 */
export function apiErrorMessage(err: unknown): string | null {
  const arabic = isArabic();
  if (err instanceof HttpErrorResponse && err.status === 0) return arabic ? NETWORK.arabic : NETWORK.english;
  const body = apiError(err);
  if (!body) return null;
  let message = arabic ? body.arabic : body.english;
  if (body.fields?.length) {
    const details = body.fields.map((f) => `${f.field}: ${arabic ? f.arabic : f.english}`).join(' · ');
    message = `${message} ${details}`;
  }
  if (body.status >= 500 && body.traceId) {
    message = `${message} (${arabic ? 'المرجع' : 'Ref'}: ${body.traceId})`;
  }
  return message;
}

/** What the error page shows: missing, not allowed, or broken. */
export type ErrorPageKind = 'not-found' | 'forbidden' | 'error';

/**
 * A page whose main record could not be loaded shows the error page in place, keeping the address the person
 * opened, instead of bouncing them somewhere else. A 401 is left alone: the session handler signs them out.
 */
export function openErrorPage(router: Router, err: unknown): void {
  const status = err instanceof HttpErrorResponse ? err.status : 0;
  if (status === 401) return;
  const kind: ErrorPageKind = status === 404 || status === 400 ? 'not-found' : status === 403 ? 'forbidden' : 'error';
  router.navigate(['/not-found'], {
    skipLocationChange: true,
    state: { kind, message: apiErrorMessage(err), traceId: apiError(err)?.traceId },
  });
}
