import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from './auth.api.ts';
import { AUTH_CONFIG, AUTH_STORAGE, resolveAuthConfig } from './config.ts';
import { type AuthSession, type AuthStatus, isAuthSession } from './models.ts';

interface AuthState {
  status: AuthStatus;
  session: AuthSession | null;
}

const initialState: AuthState = { status: 'unknown', session: null };

/**
 * The session of the signed-in member. Needs `AUTH_CONFIG`, `AUTH_STORAGE` and an `HttpClient`.
 * Call `restore()` before reading `isAuthenticated` (the guards do).
 */
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isAuthenticated: computed(() => store.status() === 'authenticated'),
    accessToken: computed(() => store.session()?.accessToken ?? null),
    refreshToken: computed(() => store.session()?.refreshToken ?? null),
    account: computed(() => store.session()?.account ?? null),
  })),
  withComputed((store) => ({
    displayName: computed(() => {
      const account = store.account();
      return account ? `${account.firstName} ${account.lastName}`.trim() : null;
    }),
  })),
  withMethods((store) => {
    const config = resolveAuthConfig(inject(AUTH_CONFIG));
    const storage = inject(AUTH_STORAGE);
    const api = new AuthApi(config.memberApiUrl);
    let restored: Promise<void> | null = null;
    let refreshing: Promise<void> | null = null;

    const readStoredSession = async (): Promise<AuthSession | null> => {
      try {
        const raw = await storage.getItem(config.storageKey);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        return isAuthSession(parsed) ? parsed : null;
      } catch {
        return null;
      }
    };

    const saveSession = async (session: AuthSession): Promise<void> => {
      await storage.setItem(config.storageKey, JSON.stringify(session));
      patchState(store, { session, status: 'authenticated' });
    };

    const clearSession = async (): Promise<void> => {
      patchState(store, { session: null, status: 'anonymous' });
      try {
        await storage.removeItem(config.storageKey);
      } catch {
        // The session is already gone from memory; a stale copy is rejected by the server.
      }
    };

    return {
      /** Loads the persisted session once. Safe to call from several guards at the same time. */
      restore(): Promise<void> {
        restored ??= readStoredSession().then((session) => {
          patchState(store, { session, status: session ? 'authenticated' : 'anonymous' });
        });
        return restored;
      },

      /** Rejects with the HTTP error when the credentials are wrong. */
      async signIn(username: string, password: string): Promise<void> {
        await saveSession(await firstValueFrom(api.signIn({ username, password })));
      },

      /**
       * Exchanges the refresh token for new tokens, keeping the account. Parallel callers share one
       * request. Ends the session and rejects when the refresh token is missing or refused.
       */
      refresh(): Promise<void> {
        refreshing ??= (async () => {
          try {
            const current = store.session();
            if (!current) throw new Error('No session to refresh');
            const tokens = await firstValueFrom(api.refresh({ refreshToken: current.refreshToken }));
            // Refresh does not return the new refresh-token expiry: keep the old one.
            await saveSession({ ...current, ...tokens });
          } catch (error) {
            await clearSession();
            throw error;
          } finally {
            refreshing = null;
          }
        })();
        return refreshing;
      },

      /** Ends the session locally even if the server cannot be reached. */
      async signOut(): Promise<void> {
        const refreshToken = store.refreshToken();
        await clearSession();
        if (refreshToken) {
          await firstValueFrom(api.revoke({ refreshToken })).catch(() => undefined);
        }
      },
    };
  }),
);
