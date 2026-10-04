import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, Router, type RouterStateSnapshot, convertToParamMap } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { authGuard, loginGuard } from './guards.ts';
import { safeReturnUrl } from './return-url.ts';
import { setup, storedSession } from './testing/helpers.ts';

const state = (url: string) => ({ url }) as RouterStateSnapshot;
const route = (returnUrl?: string) =>
  ({ queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) }) as ActivatedRouteSnapshot;
const run = <T>(fn: () => T): T => TestBed.runInInjectionContext(fn);

describe('guards', () => {
  it('authGuard lets an authenticated user in', async () => {
    setup({ storage: storedSession() });
    expect(await run(() => authGuard(route(), state('/loans')))).toBe(true);
  });

  it('authGuard sends an anonymous user to login keeping the returnUrl', async () => {
    setup();
    const result = await run(() => authGuard(route(), state('/loans/5')));
    expect(TestBed.inject(Router).serializeUrl(result as never)).toBe('/login?returnUrl=%2Floans%2F5');
  });

  it('loginGuard lets an anonymous user see login', async () => {
    setup();
    expect(await run(() => loginGuard(route(), state('/login')))).toBe(true);
  });

  it('loginGuard sends an authenticated user to the returnUrl or home', async () => {
    setup({ storage: storedSession(), config: { homePath: '/inicio' } });
    const router = TestBed.inject(Router);
    expect(router.serializeUrl((await run(() => loginGuard(route('/loans/5'), state('/login')))) as never)).toBe('/loans/5');
    expect(router.serializeUrl((await run(() => loginGuard(route(), state('/login')))) as never)).toBe('/inicio');
  });
});

describe('safeReturnUrl', () => {
  it('only accepts in-app paths other than login', () => {
    expect(safeReturnUrl('/loans')).toBe('/loans');
    expect(safeReturnUrl('https://evil.test')).toBe('/home');
    expect(safeReturnUrl('//evil.test')).toBe('/home');
    expect(safeReturnUrl('/login?x=1')).toBe('/home');
    expect(safeReturnUrl(null, { homePath: '/h' })).toBe('/h');
  });
});
