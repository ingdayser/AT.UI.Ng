import { ApiResponseFailure } from '../api/api-response.ts';

/** Structural match for Angular's `HttpErrorResponse`, so this package needs no Angular. */
export interface HttpErrorLike {
  readonly status: number;
  readonly error?: unknown;
}

export const NO_CONNECTION_MESSAGE = 'No se pudo conectar con el servidor. Verifica tu conexión.';
export const SERVER_ERROR_MESSAGE = 'El servidor no pudo procesar la solicitud. Intenta más tarde.';

function isHttpErrorLike(error: unknown): error is HttpErrorLike {
  return typeof error === 'object' && error !== null && typeof (error as HttpErrorLike).status === 'number';
}

/** Server's `error.description` from a failed call (envelope failure or HTTP error body). */
function serverDescription(error: unknown): string | null {
  if (error instanceof ApiResponseFailure) return error.apiError?.description ?? null;
  if (isHttpErrorLike(error)) {
    const body = error.error as { error?: { description?: string | null } } | null | undefined;
    return body?.error?.description ?? null;
  }
  return null;
}

/** The server's own error text, trimmed, if it sent one. */
export function serverErrorDescription(error: unknown): string | null {
  return serverDescription(error)?.trim() || null;
}

/** Validation messages the backend returned, one per line. Empty when the error carries none. */
export function extractApiMessages(error: unknown): string[] {
  const description = serverDescription(error);
  if (!description) return [];
  return description.split(/\r?\n/).filter((message) => message.trim().length > 0);
}

/** True when the call never got an HTTP answer (offline, wrong host, untrusted certificate...). */
export function isNetworkError(error: unknown): boolean {
  return isHttpErrorLike(error) && error.status === 0;
}

/**
 * A presentable message, always. Unlike `extractApiMessages` it also covers the cases with no
 * body to read: no connection, or a server error without detail.
 *
 * @param fallback text for when the backend answered but with nothing usable.
 */
export function resolveApiErrorMessage(error: unknown, fallback: string): string {
  const [first] = extractApiMessages(error);
  if (first) return first;
  if (isNetworkError(error)) return NO_CONNECTION_MESSAGE;
  if (isHttpErrorLike(error) && error.status >= 500) return SERVER_ERROR_MESSAGE;
  return fallback;
}
