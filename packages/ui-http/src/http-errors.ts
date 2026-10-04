import { HttpErrorResponse, HttpResponse, type HttpInterceptorFn } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import { type ApiResponse, isNetworkError, serverErrorDescription } from '@at/ui-core';
import { tap } from 'rxjs';

/** What went wrong, so the app can decide how (and whether) to show it. */
export type HttpErrorKind = 'network' | 'server' | 'session' | 'client' | 'envelope';

export interface HttpErrorNotice {
  readonly kind: HttpErrorKind;
  /** Ready to show: the server's own text when it sent one, else a generic one in Spanish. */
  readonly message: string;
  readonly status: number;
  readonly url: string;
  readonly error: unknown;
}

export interface HttpErrorConfig {
  /** Housekeeping calls the user did not ask for (refresh, revoke): their failure is handled elsewhere. */
  readonly silentPaths?: readonly string[];
  /** Calls where a 401 means "wrong credentials" rather than "session expired". */
  readonly publicPaths?: readonly string[];
  /** Decide per notice. Default: every failure. The web SPA, for instance, only shows network and server ones. */
  readonly shouldNotify?: (notice: HttpErrorNotice) => boolean;
}

/** Provide how the app shows an HTTP failure (a modal, a toast, a native alert...). */
export const HTTP_ERROR_NOTIFIER = new InjectionToken<(notice: HttpErrorNotice) => void>('HTTP_ERROR_NOTIFIER');
export const HTTP_ERROR_CONFIG = new InjectionToken<HttpErrorConfig>('HTTP_ERROR_CONFIG', {
  factory: () => ({}),
});

export const GENERIC_ERROR_MESSAGE = 'No se pudo completar la solicitud. Intenta de nuevo.';
const NETWORK_MESSAGE = 'No se pudo conectar con el servidor. Revisa tu conexión.';
const SESSION_MESSAGE = 'Tu sesión ha expirado. Inicia sesión de nuevo.';
const SERVER_MESSAGE = 'El servidor tuvo un problema. Intenta de nuevo más tarde.';

const matches = (url: string, paths: readonly string[] | undefined): boolean =>
  (paths ?? []).some((path) => url.toLowerCase().includes(path.toLowerCase()));

/** Classifies a failed HTTP call and picks the text to show. */
export function describeHttpError(error: HttpErrorResponse, url: string, config: HttpErrorConfig = {}): HttpErrorNotice {
  const base = { status: error.status, url, error };
  if (isNetworkError(error)) return { ...base, kind: 'network', message: NETWORK_MESSAGE };

  const description = serverErrorDescription(error);
  const kind = error.status >= 500 ? 'server' : error.status === 401 && !matches(url, config.publicPaths) ? 'session' : 'client';
  if (description) return { ...base, kind, message: description };
  if (kind === 'session') return { ...base, kind, message: SESSION_MESSAGE };
  if (kind === 'server') return { ...base, kind, message: SERVER_MESSAGE };
  return { ...base, kind, message: GENERIC_ERROR_MESSAGE };
}

/** True for failures nothing on screen can explain better than "the server is not answering". */
export const isInfrastructureNotice = (notice: HttpErrorNotice): boolean =>
  notice.kind === 'network' || notice.kind === 'server';

/**
 * Tells the app when an API call fails, through `HTTP_ERROR_NOTIFIER`. Also covers answers that are
 * HTTP 200 with the failure inside the `ApiResponse` envelope. The error is never swallowed.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(HTTP_ERROR_NOTIFIER);
  const config = inject(HTTP_ERROR_CONFIG);
  const silent = matches(req.url, config.silentPaths);
  const emit = (notice: HttpErrorNotice): void => {
    if (!silent && (config.shouldNotify?.(notice) ?? true)) notify(notice);
  };

  return next(req).pipe(
    tap({
      next: (event) => {
        if (!(event instanceof HttpResponse)) return;
        const failure = (event.body as Partial<ApiResponse<unknown>> | null)?.error;
        if (failure) {
          emit({
            kind: 'envelope',
            message: failure.description?.trim() || GENERIC_ERROR_MESSAGE,
            status: event.status,
            url: req.url,
            error: failure,
          });
        }
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse) emit(describeHttpError(error, req.url, config));
      },
    }),
  );
};
