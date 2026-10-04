import type { AccountInfo, RefreshResponse, SignInResponse } from '@at/ui-core';

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

/** What the app keeps after a sign in or a refresh. Persisted in the app's `AuthStorage`. */
export interface AuthSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  /** ISO date. The access token is short lived (about 2 minutes). */
  readonly accessTokenExpiry: string;
  readonly refreshTokenExpiry: string;
  readonly account: AccountInfo;
}

/** The part of a session that a refresh replaces. */
export type RefreshedTokens = Pick<AuthSession, 'accessToken' | 'refreshToken' | 'accessTokenExpiry'>;

export function toSession(result: SignInResponse): AuthSession {
  if (!result.securityToken || !result.refreshToken) throw new Error('Authentication failed');
  return {
    accessToken: result.securityToken,
    refreshToken: result.refreshToken,
    accessTokenExpiry: result.expiryDate,
    refreshTokenExpiry: result.refreshTokenExpiry,
    account: result.accountInfo,
  };
}

export function toRefreshedTokens(result: RefreshResponse): RefreshedTokens {
  if (!result.accessToken || !result.refreshToken) throw new Error('Token refresh failed');
  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessTokenExpiry: result.accessTokenExpiry,
  };
}

export function isAuthSession(value: unknown): value is AuthSession {
  const candidate = value as Partial<AuthSession> | null;
  return (
    typeof candidate?.accessToken === 'string' &&
    typeof candidate.refreshToken === 'string' &&
    typeof candidate.account?.username === 'string'
  );
}
