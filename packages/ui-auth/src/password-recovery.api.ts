import type {
  ForgotPasswordRequest,
  ResendOtpRequest,
  ResetPasswordWithOtpRequest,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '@at/ui-core';
import { BaseHttpService } from '@at/ui-http';
import { InjectionToken, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { AUTH_CONFIG } from './config.ts';

/**
 * Password recovery with a one-time code sent by email (member endpoints of the Auth API):
 * 1. `forgotPassword(email)` sends the code. 2. `verifyOtp(email, code)` returns a `resetSessionToken`.
 * 3. `resetPassword(email, token, newPassword)` sets the new password. `resendOtp` asks for another code.
 *
 * Create it inside an injection context, or use `inject(PASSWORD_RECOVERY_API)`.
 *
 * TODO(contract): `Auth v1.json` describes the four requests but answers each with a bare "200 OK", so the
 * `resetSessionToken` of `verify-otp` is what the web SPA reads, not something the contract states.
 */
export class PasswordRecoveryApi extends BaseHttpService {
  protected readonly baseUrl: string;

  constructor() {
    super();
    this.baseUrl = inject(AUTH_CONFIG).memberApiUrl;
  }

  forgotPassword(email: string): Observable<void> {
    return this.post<ForgotPasswordRequest, void>('forgot-password', { email }, { allowEmpty: true });
  }

  resendOtp(email: string): Observable<void> {
    return this.post<ResendOtpRequest, void>('resend-otp', { email }, { allowEmpty: true });
  }

  verifyOtp(email: string, code: string): Observable<VerifyOtpResponse> {
    return this.post<VerifyOtpRequest, VerifyOtpResponse>('verify-otp', { email, code });
  }

  resetPassword(email: string, resetSessionToken: string, newPassword: string): Observable<void> {
    return this.post<ResetPasswordWithOtpRequest, void>(
      'reset-password-otp',
      { email, resetSessionToken, newPassword },
      { allowEmpty: true },
    );
  }
}

export const PASSWORD_RECOVERY_API = new InjectionToken<PasswordRecoveryApi>('PASSWORD_RECOVERY_API', {
  providedIn: 'root',
  factory: () => new PasswordRecoveryApi(),
});
