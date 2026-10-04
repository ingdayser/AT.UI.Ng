import { describe, expect, it } from 'vitest';
import { JwtHelper } from './jwt.ts';

function token(payload: object): string {
  const encode = (value: object): string =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`;
}

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);
const nowSeconds = NOW / 1000;

describe('JwtHelper', () => {
  it('decodes the payload, including non-ASCII names', () => {
    const decoded = JwtHelper.decode(token({ sub: '1', name: 'José Peña', role: 'Admin', exp: 1, iat: 1 }));
    expect(decoded?.name).toBe('José Peña');
  });

  it('returns null for garbage', () => {
    expect(JwtHelper.decode('not-a-token')).toBeNull();
    expect(JwtHelper.decode('a.%%%.c')).toBeNull();
  });

  it('treats an invalid token as expired', () => {
    expect(JwtHelper.isExpired('nope')).toBe(true);
    expect(JwtHelper.expiresIn('nope')).toBe(0);
  });

  it('expires 30 seconds early', () => {
    const t = token({ sub: '1', role: 'A', exp: nowSeconds + 31, iat: 0 });
    expect(JwtHelper.isExpired(t, NOW)).toBe(false);
    expect(JwtHelper.isExpired(t, NOW + 2000)).toBe(true);
  });

  it('reports the seconds left', () => {
    expect(JwtHelper.expiresIn(token({ sub: '1', role: 'A', exp: nowSeconds + 120, iat: 0 }), NOW)).toBe(120);
  });

  it('normalizes roles to an array', () => {
    expect(JwtHelper.getRoles(token({ sub: '1', role: 'Admin', exp: 1, iat: 1 }))).toEqual(['Admin']);
    expect(JwtHelper.getRoles(token({ sub: '1', role: ['A', 'B'], exp: 1, iat: 1 }))).toEqual(['A', 'B']);
    expect(JwtHelper.getRoles('nope')).toEqual([]);
  });
});
