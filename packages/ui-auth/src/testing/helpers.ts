import { provideHttpClient, withInterceptors, type HttpInterceptorFn } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AUTH_CONFIG, AUTH_STORAGE, type AuthConfig, type AuthStorage } from '../config.ts';
import type { AuthSession } from '../models.ts';

export const MEMBER_URL = 'https://auth.test/api/v1.0/member';
export const SESSION_KEY = 'at.auth.session';

export class MemoryStorage implements AuthStorage {
  readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
}

export const SESSION: AuthSession = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  accessTokenExpiry: '2026-01-01T00:02:00Z',
  refreshTokenExpiry: '2026-02-01T00:00:00Z',
  account: { id: '7', username: 'ada', firstName: 'Ada', lastName: 'Lovelace', roles: ['Admin'] },
};

export const signInResult = {
  securityToken: 'access-1',
  createdDate: '2026-01-01T00:00:00Z',
  expiryDate: '2026-01-01T00:02:00Z',
  refreshToken: 'refresh-1',
  refreshTokenExpiry: '2026-02-01T00:00:00Z',
  accountInfo: SESSION.account,
};

export const ok = <T>(result: T) => ({ responseType: 1, error: null, result });

export function setup(options: {
  storage?: MemoryStorage;
  config?: Partial<AuthConfig>;
  interceptors?: HttpInterceptorFn[];
  extra?: Provider[];
} = {}) {
  const storage = options.storage ?? new MemoryStorage();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors(options.interceptors ?? [])),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: AUTH_STORAGE, useValue: storage },
      { provide: AUTH_CONFIG, useValue: { memberApiUrl: MEMBER_URL, ...options.config } },
      ...(options.extra ?? []),
    ],
  });
  return { storage, http: TestBed.inject(HttpTestingController) };
}

export function storedSession(): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(SESSION_KEY, JSON.stringify(SESSION));
  return storage;
}

export const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
