import type { RefreshRequest, RefreshResponse, SignInRequest, SignInResponse } from '@at/ui-core';
import { BaseHttpService } from '@at/ui-http';
import { type Observable, map } from 'rxjs';
import { type AuthSession, type RefreshedTokens, toRefreshedTokens, toSession } from './models.ts';

/** Client for the member endpoints of the Auth API. Create it inside an injection context. */
export class AuthApi extends BaseHttpService {
  protected readonly baseUrl: string;

  constructor(memberApiUrl: string) {
    super();
    this.baseUrl = memberApiUrl;
  }

  signIn(request: SignInRequest): Observable<AuthSession> {
    return this.post<SignInRequest, SignInResponse>('SignIn', request).pipe(map(toSession));
  }

  refresh(request: RefreshRequest): Observable<RefreshedTokens> {
    return this.post<RefreshRequest, RefreshResponse>('refresh', request).pipe(map(toRefreshedTokens));
  }

  revoke(request: RefreshRequest): Observable<unknown> {
    return this.post<RefreshRequest, unknown>('revoke', request, { allowEmpty: true });
  }
}
