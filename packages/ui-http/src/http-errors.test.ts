import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import {
  HTTP_ERROR_CONFIG,
  HTTP_ERROR_NOTIFIER,
  type HttpErrorConfig,
  type HttpErrorNotice,
  describeHttpError,
  httpErrorInterceptor,
  isInfrastructureNotice,
} from './http-errors.ts';

function setup(config: HttpErrorConfig = {}) {
  const notices: HttpErrorNotice[] = [];
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([httpErrorInterceptor])),
      provideHttpClientTesting(),
      { provide: HTTP_ERROR_NOTIFIER, useValue: (notice: HttpErrorNotice) => notices.push(notice) },
      { provide: HTTP_ERROR_CONFIG, useValue: config },
    ],
  });
  return { notices, http: TestBed.inject(HttpTestingController), client: TestBed.inject(HttpClient) };
}

const failure = (status: number, description?: string) =>
  new HttpErrorResponse({ status, error: description ? { error: { description } } : null });

describe('describeHttpError', () => {
  it('classifies and words each case', () => {
    expect(describeHttpError(failure(0), '/a')).toMatchObject({ kind: 'network' });
    expect(describeHttpError(failure(400, 'Documento duplicado'), '/a')).toMatchObject({ kind: 'client', message: 'Documento duplicado' });
    expect(describeHttpError(failure(401), '/api/x')).toMatchObject({ kind: 'session' });
    expect(describeHttpError(failure(503), '/a')).toMatchObject({ kind: 'server' });
    expect(describeHttpError(failure(404), '/a').message).toContain('No se pudo completar');
  });

  it('treats a 401 on a public path as a client error (wrong credentials)', () => {
    const notice = describeHttpError(failure(401, 'Credenciales inválidas'), '/member/signin', { publicPaths: ['/member/signin'] });
    expect(notice).toMatchObject({ kind: 'client', message: 'Credenciales inválidas' });
  });

  it('flags only network and server errors as infrastructure', () => {
    expect(isInfrastructureNotice(describeHttpError(failure(0), '/a'))).toBe(true);
    expect(isInfrastructureNotice(describeHttpError(failure(400), '/a'))).toBe(false);
  });
});

describe('httpErrorInterceptor', () => {
  it('notifies on an HTTP error and still rethrows it', () => {
    const { notices, http, client } = setup();
    let error: unknown;
    client.get('/api/x').subscribe({ error: (e: unknown) => (error = e) });
    http.expectOne('/api/x').flush({ error: { description: 'Sin cupo' } }, { status: 422, statusText: 'x' });
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ kind: 'client', message: 'Sin cupo', status: 422 });
    expect(error).toBeInstanceOf(HttpErrorResponse);
  });

  it('notifies a failure inside a 200 envelope', () => {
    const { notices, http, client } = setup();
    client.get('/api/x').subscribe();
    http.expectOne('/api/x').flush({ responseType: 0, error: { code: 'E', description: ' Saldo insuficiente ' }, result: null });
    expect(notices).toEqual([expect.objectContaining({ kind: 'envelope', message: 'Saldo insuficiente' })]);
  });

  it('stays quiet for silent paths and when shouldNotify says no', () => {
    const { notices, http, client } = setup({ silentPaths: ['/member/refresh'], shouldNotify: isInfrastructureNotice });
    client.get('/member/refresh').subscribe({ error: () => undefined });
    http.expectOne('/member/refresh').flush({}, { status: 500, statusText: 'x' });
    client.get('/api/y').subscribe({ error: () => undefined });
    http.expectOne('/api/y').flush({}, { status: 400, statusText: 'x' });
    expect(notices).toHaveLength(0);
  });
});
