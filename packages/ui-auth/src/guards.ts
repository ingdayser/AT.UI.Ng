import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store.ts';
import { AUTH_CONFIG, resolveAuthConfig } from './config.ts';
import { safeReturnUrl } from './return-url.ts';

/** Protects a route: anonymous users go to the login page carrying the `returnUrl`. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const config = resolveAuthConfig(inject(AUTH_CONFIG));
  await auth.restore();
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree([config.loginPath], { queryParams: { returnUrl: state.url } });
};

/** Keeps authenticated users away from the login page, sending them to their `returnUrl` or home. */
export const loginGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const config = resolveAuthConfig(inject(AUTH_CONFIG));
  await auth.restore();
  return auth.isAuthenticated()
    ? router.parseUrl(safeReturnUrl(route.queryParamMap.get('returnUrl'), config))
    : true;
};
