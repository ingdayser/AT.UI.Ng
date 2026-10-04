import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiResponseFailure } from '@at/ui-core';
import { describe, expect, it } from 'vitest';
import { BaseHttpService } from './base-http.service.ts';
import { LoadingStore, loadingInterceptor } from './loading.ts';

class ThingsApi extends BaseHttpService {
  protected override readonly baseUrl = 'https://api.test/things/';
  list(query?: Record<string, unknown>, silent = false) {
    return this.get<string[]>('', query, { silent });
  }
  create(body: object) {
    return this.post<object, { id: number }>('/new', body);
  }
  remove(id: number) {
    return this.delete<null>(`${id}`, { allowEmpty: true });
  }
}

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(withInterceptors([loadingInterceptor])), provideHttpClientTesting()],
  });
  const api = TestBed.runInInjectionContext(() => new ThingsApi());
  return { api, http: TestBed.inject(HttpTestingController), loading: TestBed.inject(LoadingStore) };
}

const envelope = <T>(result: T | null, error: { code: string; description: string; trace: null } | null = null) => ({
  responseType: 1,
  error,
  result,
});

describe('BaseHttpService', () => {
  it('joins base and endpoint, sends query without nulls and unwraps the result', () => {
    const { api, http } = setup();
    let value: string[] | undefined;
    api.list({ q: 'ana', page: 2, skip: null, none: undefined }).subscribe((v) => (value = v));

    const req = http.expectOne((r) => r.url === 'https://api.test/things');
    expect(req.request.params.toString()).toBe('q=ana&page=2');
    expect(req.request.headers.get('Accept')).toBe('application/json');
    req.flush(envelope(['a']));
    expect(value).toEqual(['a']);
  });

  it('posts the body to the endpoint', () => {
    const { api, http } = setup();
    api.create({ name: 'x' }).subscribe();
    const req = http.expectOne('https://api.test/things/new');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'x' });
    req.flush(envelope({ id: 1 }));
  });

  it('throws an ApiResponseFailure that keeps the server error', () => {
    const { api, http } = setup();
    let error: unknown;
    api.create({}).subscribe({ error: (e: unknown) => (error = e) });
    http.expectOne('https://api.test/things/new').flush(envelope(null, { code: 'E7', description: 'Duplicado', trace: null }));
    expect(error).toBeInstanceOf(ApiResponseFailure);
    expect((error as ApiResponseFailure).message).toBe('Duplicado');
    expect((error as ApiResponseFailure).code).toBe('E7');
  });

  it('fails when the result is missing, unless allowEmpty', () => {
    const { api, http } = setup();
    let error: unknown;
    let removed: unknown = 'unset';
    api.create({}).subscribe({ error: (e: unknown) => (error = e) });
    http.expectOne('https://api.test/things/new').flush(envelope(null));
    expect((error as Error).message).toBe('La respuesta del servidor no trae datos.');

    api.remove(5).subscribe((v) => (removed = v));
    http.expectOne('https://api.test/things/5').flush(envelope(null));
    expect(removed).toBeNull();
  });

  it('counts requests in the global loading store, except silent ones', () => {
    const { api, http, loading } = setup();
    api.list().subscribe();
    api.list(undefined, true).subscribe();
    expect(loading.pending()).toBe(1);
    expect(loading.isLoading()).toBe(true);
    http.match(() => true).forEach((r) => r.flush(envelope([])));
    expect(loading.isLoading()).toBe(false);
  });

  it('also honours the X-Skip-Loader header and strips it', () => {
    const { http, loading } = setup();
    TestBed.inject(HttpClient).get('https://api.test/x', { headers: { 'X-Skip-Loader': '1' } }).subscribe();
    const req = http.expectOne('https://api.test/x');
    expect(req.request.headers.has('X-Skip-Loader')).toBe(false);
    expect(loading.pending()).toBe(0);
    req.flush({});
  });

  it('never drops below zero pending requests', () => {
    const { loading } = setup();
    loading.stop();
    expect(loading.pending()).toBe(0);
  });
});
