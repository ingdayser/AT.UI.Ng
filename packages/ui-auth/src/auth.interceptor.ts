import type { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthStore } from './auth.store.ts';
import { AUTH_CONFIG, resolveAuthConfig } from './config.ts';

function withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Adds the bearer token to API calls only. Access tokens are short lived, so a 401 triggers one
 * refresh and one retry; if the refresh is refused the session ends and the user goes to login
 * carrying the `returnUrl`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);
  const config = resolveAuthConfig(inject(AUTH_CONFIG));
  const url = req.url.toLowerCase();
  const isApiCall = config.apiBaseUrls === null || config.apiBaseUrls.some((base) => req.url.startsWith(base));
  const isPublic = config.publicPaths.some((path) => url.includes(path.toLowerCase()));
  const token = auth.accessToken();

  if (!isApiCall || isPublic || !token) return next(req);

  const router = inject(Router);
  return next(withToken(req, token)).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) return throwError(() => error);
      return from(auth.refresh().then(() => true, () => false)).pipe(
        switchMap((refreshed) => {
          if (refreshed) return next(withToken(req, auth.accessToken() ?? ''));
          void router.navigate([config.loginPath], { queryParams: { returnUrl: router.url } });
          return throwError(() => error);
        }),
      );
    }),
  );
};
