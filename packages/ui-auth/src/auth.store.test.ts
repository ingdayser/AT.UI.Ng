import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { AuthStore } from './auth.store.ts';
import { MEMBER_URL, MemoryStorage, SESSION, SESSION_KEY, ok, setup, signInResult, storedSession, tick } from './testing/helpers.ts';

describe('AuthStore', () => {
  it('is anonymous after restore when nothing is stored', async () => {
    setup();
    const store = TestBed.inject(AuthStore);
    expect(store.status()).toBe('unknown');
    await store.restore();
    expect(store.status()).toBe('anonymous');
  });

  it('restores a persisted session', async () => {
    setup({ storage: storedSession() });
    const store = TestBed.inject(AuthStore);
    await store.restore();
    expect(store.isAuthenticated()).toBe(true);
    expect(store.accessToken()).toBe('access-1');
    expect(store.displayName()).toBe('Ada Lovelace');
  });

  it('ignores corrupt or old-format stored data', async () => {
    for (const raw of ['{not json', JSON.stringify({ accessToken: 'a', refreshToken: 'b' })]) {
      TestBed.resetTestingModule();
      const storage = new MemoryStorage();
      storage.setItem(SESSION_KEY, raw);
      setup({ storage });
      const store = TestBed.inject(AuthStore);
      await store.restore();
      expect(store.status()).toBe('anonymous');
    }
  });

  it('works with an async storage', async () => {
    const storage = {
      getItem: async (key: string) => (key === SESSION_KEY ? JSON.stringify(SESSION) : null),
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };
    setup({ storage: storage as unknown as MemoryStorage });
    const store = TestBed.inject(AuthStore);
    await store.restore();
    expect(store.isAuthenticated()).toBe(true);
  });

  it('signs in and persists the session', async () => {
    const { http, storage } = setup();
    const store = TestBed.inject(AuthStore);
    const done = store.signIn('ada', 'secret');
    const req = http.expectOne(`${MEMBER_URL}/SignIn`);
    expect(req.request.body).toEqual({ username: 'ada', password: 'secret' });
    req.flush(ok(signInResult));
    await done;

    expect(store.isAuthenticated()).toBe(true);
    expect(store.account()?.username).toBe('ada');
    expect(JSON.parse(storage.getItem(SESSION_KEY) ?? 'null').accessToken).toBe('access-1');
  });

  it('rejects wrong credentials and stays anonymous', async () => {
    const { http } = setup();
    const store = TestBed.inject(AuthStore);
    await store.restore();
    const done = store.signIn('ada', 'wrong');
    http.expectOne(`${MEMBER_URL}/SignIn`).flush({}, { status: 400, statusText: 'Bad Request' });
    await expect(done).rejects.toBeTruthy();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('refresh replaces the tokens and keeps the account and refresh expiry', async () => {
    const { http, storage } = setup({ storage: storedSession() });
    const store = TestBed.inject(AuthStore);
    await store.restore();
    const done = store.refresh();
    const req = http.expectOne(`${MEMBER_URL}/refresh`);
    expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
    req.flush(ok({ accessToken: 'access-2', refreshToken: 'refresh-2', accessTokenExpiry: '2026-01-01T00:04:00Z' }));
    await done;

    expect(store.accessToken()).toBe('access-2');
    expect(store.refreshToken()).toBe('refresh-2');
    expect(store.displayName()).toBe('Ada Lovelace');
    expect(JSON.parse(storage.getItem(SESSION_KEY) ?? 'null').refreshTokenExpiry).toBe(SESSION.refreshTokenExpiry);
  });

  it('parallel refreshes share one request', async () => {
    const { http } = setup({ storage: storedSession() });
    const store = TestBed.inject(AuthStore);
    await store.restore();
    const first = store.refresh();
    const second = store.refresh();
    expect(second).toBe(first);
    http.expectOne(`${MEMBER_URL}/refresh`).flush(ok({ accessToken: 'a2', refreshToken: 'r2', accessTokenExpiry: 'x' }));
    await first;
  });

  it('refresh without a session ends it and rejects', async () => {
    setup();
    const store = TestBed.inject(AuthStore);
    await store.restore();
    await expect(store.refresh()).rejects.toBeTruthy();
    expect(store.status()).toBe('anonymous');
  });

  it('a refused refresh ends the session and clears storage', async () => {
    const { http, storage } = setup({ storage: storedSession() });
    const store = TestBed.inject(AuthStore);
    await store.restore();
    const done = store.refresh();
    http.expectOne(`${MEMBER_URL}/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
    await expect(done).rejects.toBeTruthy();
    expect(store.isAuthenticated()).toBe(false);
    expect(storage.getItem(SESSION_KEY)).toBeNull();
  });

  it('signs out locally even if revoke fails', async () => {
    const { http, storage } = setup({ storage: storedSession() });
    const store = TestBed.inject(AuthStore);
    await store.restore();
    const done = store.signOut();
    await tick();
    expect(store.isAuthenticated()).toBe(false);
    expect(storage.getItem(SESSION_KEY)).toBeNull();
    const req = http.expectOne(`${MEMBER_URL}/revoke`);
    expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
    req.flush({}, { status: 500, statusText: 'x' });
    await done;
  });
});
