import { InjectionToken } from '@angular/core';

/**
 * Where the session is kept. Each app provides its own: the keychain / keystore on a phone,
 * `localStorage` or a cookie on the web. Sync or async, both work.
 */
export interface AuthStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

export const AUTH_STORAGE = new InjectionToken<AuthStorage>('AUTH_STORAGE');

export interface AuthConfig {
  /** Base URL of the member endpoints, e.g. `https://host/api/v1.0/member`. */
  readonly memberApiUrl: string;
  /** Where anonymous users are sent. Default `/login`. */
  readonly loginPath?: string;
  /** Where authenticated users land when there is no `returnUrl`. Default `/home`. */
  readonly homePath?: string;
  /** Key the session is stored under. Default `at.auth.session`. */
  readonly storageKey?: string;
  /** Only requests whose URL starts with one of these get the bearer token. Default: all. */
  readonly apiBaseUrls?: readonly string[];
  /** Paths that never carry a token and never trigger a refresh. Default: sign in, refresh, forgot-password. */
  readonly publicPaths?: readonly string[];
}

export const AUTH_CONFIG = new InjectionToken<AuthConfig>('AUTH_CONFIG');

export const DEFAULT_PUBLIC_PATHS = [
  '/member/signin',
  '/member/refresh',
  '/member/forgot-password',
  '/member/resend-otp',
  '/member/verify-otp',
  '/member/reset-password-otp',
] as const;

export interface ResolvedAuthConfig {
  readonly memberApiUrl: string;
  readonly loginPath: string;
  readonly homePath: string;
  readonly storageKey: string;
  readonly apiBaseUrls: readonly string[] | null;
  readonly publicPaths: readonly string[];
}

export function resolveAuthConfig(config: AuthConfig): ResolvedAuthConfig {
  return {
    memberApiUrl: config.memberApiUrl,
    loginPath: config.loginPath ?? '/login',
    homePath: config.homePath ?? '/home',
    storageKey: config.storageKey ?? 'at.auth.session',
    apiBaseUrls: config.apiBaseUrls ?? null,
    publicPaths: config.publicPaths ?? DEFAULT_PUBLIC_PATHS,
  };
}
