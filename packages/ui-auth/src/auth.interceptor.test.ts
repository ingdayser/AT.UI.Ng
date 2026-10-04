import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { authInterceptor } from './auth.interceptor.ts';
import { AuthStore } from './auth.store.ts';
import { MEMBER_URL, ok, setup, storedSession, tick } from './testing/helpers.ts';

const API = 'https://core.test/api/v1.0';

async function ready(config = { apiBaseUrls: [API] }) {
  const ctx = setup({ storage: storedSession(), interceptors: [authInterceptor], config });
  const store = TestBed.inject(AuthStore);
  await store.restore();
  return { ...ctx, store, client: TestBed.inject(HttpClient), router: TestBed.inject(Router) };
}

describe('authInterceptor', () => {
  it('adds the bearer token to API calls', async () => {
    const { http, client } = await ready();
    client.get(`${API}/loans`).subscribe();
    const req = http.expectOne(`${API}/loans`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
    req.flush({});
  });

  it('leaves foreign hosts and public paths alone', async () => {
    const { http, client } = await ready();
    client.get('https://other.test/x').subscribe();
    client.post(`${MEMBER_URL}/SignIn`, {}).subscribe();
    http.match(() => true).forEach((req) => {
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    const { http, client, store } = await ready();
    let body: unknown;
    client.get(`${API}/loans`).subscribe((value) => (body = value));
    http.expectOne(`${API}/loans`).flush({}, { status: 401, statusText: 'Unauthorized' });
    await tick();
    http.expectOne(`${MEMBER_URL}/refresh`).flush(ok({ accessToken: 'access-2', refreshToken: 'refresh-2', accessTokenExpiry: 'x' }));
    await tick();
    const retry = http.expectOne(`${API}/loans`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush({ done: true });
    expect(body).toEqual({ done: true });
    expect(store.accessToken()).toBe('access-2');
  });

  it('goes to login with the returnUrl when the refresh is refused', async () => {
    const { http, client, router, store } = await ready();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    let error: unknown;
    client.get(`${API}/loans`).subscribe({ error: (e: unknown) => (error = e) });
    http.expectOne(`${API}/loans`).flush({}, { status: 401, statusText: 'Unauthorized' });
    await tick();
    http.expectOne(`${MEMBER_URL}/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
    await tick();
    expect(error).toBeTruthy();
    expect(store.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: router.url } });
  });

  it('passes other errors through without refreshing', async () => {
    const { http, client } = await ready();
    let error: unknown;
    client.get(`${API}/loans`).subscribe({ error: (e: unknown) => (error = e) });
    http.expectOne(`${API}/loans`).flush({}, { status: 500, statusText: 'x' });
    expect(error).toBeTruthy();
    http.expectNone(`${MEMBER_URL}/refresh`);
  });
});
