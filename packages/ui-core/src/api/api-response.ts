/** Error block of the envelope every Apoyos Tecnologicos API wraps its answers in. */
export interface ApiResponseError {
  readonly code: string | null;
  readonly description: string | null;
  readonly trace: string | null;
}

/** Envelope of every API answer: `result` on success, `error` on failure (both with HTTP 200). */
export interface ApiResponse<T> {
  readonly responseType: number;
  readonly error: ApiResponseError | null;
  readonly result: T | null;
}

/** Thrown when the server answers but with an `error` (or no `result`) in the envelope. */
export class ApiResponseFailure extends Error {
  constructor(
    message: string,
    readonly apiError: ApiResponseError | null,
  ) {
    super(message);
    this.name = 'ApiResponseFailure';
  }

  get code(): string | null {
    return this.apiError?.code ?? null;
  }
}

export interface UnwrapOptions {
  /** Accept an envelope without `result` (e.g. a delete that returns nothing). */
  readonly allowEmpty?: boolean;
}

const UNKNOWN_ERROR = 'Error desconocido';

/**
 * Returns the envelope's `result`, or throws an `ApiResponseFailure` carrying the server's error.
 * The failure message is the server's `description` when there is one, else `fallbackMessage`.
 */
export function unwrap<T>(
  response: ApiResponse<T>,
  fallbackMessage: string = UNKNOWN_ERROR,
  options: UnwrapOptions = {},
): T {
  const empty = response.result === null || response.result === undefined;
  if (response.error || (empty && !options.allowEmpty)) {
    throw new ApiResponseFailure(response.error?.description?.trim() || fallbackMessage, response.error);
  }
  return response.result as T;
}
