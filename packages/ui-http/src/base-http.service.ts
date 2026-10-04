import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { type ApiResponse, unwrap } from '@at/ui-core';
import { type Observable, map } from 'rxjs';
import { SKIP_GLOBAL_LOADING } from './loading.ts';

export interface RequestOptions {
  /** Extra headers, merged over the defaults. */
  readonly headers?: Record<string, string>;
  /** Do not show the global loading indicator (e.g. a search while typing). */
  readonly silent?: boolean;
  /** The endpoint answers without a `result` (e.g. DELETE): resolve with `null` instead of failing. */
  readonly allowEmpty?: boolean;
}

/**
 * Base for API clients. Each subclass sets `baseUrl`; every call returns the unwrapped `result` of the
 * `ApiResponse` envelope, and a failure inside the envelope throws an `ApiResponseFailure` that keeps
 * the server's error. Subclasses must be created in an injection context (a service, a store).
 */
export abstract class BaseHttpService {
  protected readonly httpClient = inject(HttpClient);
  protected abstract readonly baseUrl: string;

  protected getDefaultHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' });
  }

  protected get<R>(endpoint: string, query?: Record<string, unknown>, options?: RequestOptions): Observable<R> {
    return this.httpClient
      .get<ApiResponse<R>>(this.buildUrl(endpoint), {
        headers: this.buildHeaders(options),
        params: this.buildParams(query),
        context: this.buildContext(options),
      })
      .pipe(map((response) => this.manageResponse(response, options)));
  }

  protected post<T, R>(endpoint: string, body: T, options?: RequestOptions): Observable<R> {
    return this.httpClient
      .post<ApiResponse<R>>(this.buildUrl(endpoint), body, this.bodyOptions(options))
      .pipe(map((response) => this.manageResponse(response, options)));
  }

  protected put<T, R>(endpoint: string, body: T, options?: RequestOptions): Observable<R> {
    return this.httpClient
      .put<ApiResponse<R>>(this.buildUrl(endpoint), body, this.bodyOptions(options))
      .pipe(map((response) => this.manageResponse(response, options)));
  }

  protected patch<T, R>(endpoint: string, body: T, options?: RequestOptions): Observable<R> {
    return this.httpClient
      .patch<ApiResponse<R>>(this.buildUrl(endpoint), body, this.bodyOptions(options))
      .pipe(map((response) => this.manageResponse(response, options)));
  }

  protected delete<R>(endpoint: string, options?: RequestOptions): Observable<R> {
    return this.httpClient
      .delete<ApiResponse<R>>(this.buildUrl(endpoint), this.bodyOptions(options))
      .pipe(map((response) => this.manageResponse(response, options)));
  }

  private bodyOptions(options?: RequestOptions): { headers: HttpHeaders; context: HttpContext } {
    return { headers: this.buildHeaders(options), context: this.buildContext(options) };
  }

  private buildHeaders(options?: RequestOptions): HttpHeaders {
    let headers = this.getDefaultHeaders();
    for (const [key, value] of Object.entries(options?.headers ?? {})) headers = headers.set(key, value);
    return headers;
  }

  private buildContext(options?: RequestOptions): HttpContext {
    return new HttpContext().set(SKIP_GLOBAL_LOADING, options?.silent ?? false);
  }

  private buildUrl(endpoint: string): string {
    const cleanBase = this.baseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    return cleanEndpoint ? `${cleanBase}/${cleanEndpoint}` : cleanBase;
  }

  private buildParams(query?: Record<string, unknown>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== null && value !== undefined) params = params.append(key, String(value));
    }
    return params;
  }

  private manageResponse<R>(response: ApiResponse<R>, options?: RequestOptions): R {
    const fallback = response.error ? 'Error desconocido' : 'La respuesta del servidor no trae datos.';
    return unwrap(response, fallback, { allowEmpty: options?.allowEmpty ?? false });
  }
}
