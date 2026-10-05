import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PASSWORD_RECOVERY_API } from './password-recovery.api.ts';
import { MEMBER_URL, ok, setup } from './testing/helpers.ts';

describe('PasswordRecoveryApi', () => {
  it('runs the three steps against the member endpoints', () => {
    const { http } = setup();
    const api = TestBed.inject(PASSWORD_RECOVERY_API);
    let token: string | undefined;
    let sent: unknown = 'unset';

    api.forgotPassword('ada@mail.co').subscribe((v) => (sent = v));
    const forgot = http.expectOne(`${MEMBER_URL}/forgot-password`);
    expect(forgot.request.body).toEqual({ email: 'ada@mail.co' });
    forgot.flush(ok(null));
    expect(sent).toBeNull();

    api.verifyOtp('ada@mail.co', '123456').subscribe((v) => (token = v.resetSessionToken));
    const verify = http.expectOne(`${MEMBER_URL}/verify-otp`);
    expect(verify.request.body).toEqual({ email: 'ada@mail.co', code: '123456' });
    verify.flush(ok({ resetSessionToken: 'session-1' }));
    expect(token).toBe('session-1');

    api.resetPassword('ada@mail.co', 'session-1', 'nueva123').subscribe();
    const reset = http.expectOne(`${MEMBER_URL}/reset-password-otp`);
    expect(reset.request.body).toEqual({ email: 'ada@mail.co', resetSessionToken: 'session-1', newPassword: 'nueva123' });
    reset.flush(ok(null));
  });

  it('asks for another code', () => {
    const { http } = setup();
    TestBed.inject(PASSWORD_RECOVERY_API).resendOtp('ada@mail.co').subscribe();
    const req = http.expectOne(`${MEMBER_URL}/resend-otp`);
    expect(req.request.body).toEqual({ email: 'ada@mail.co' });
    req.flush(ok(null));
  });

  it('fails when the code is wrong', () => {
    const { http } = setup();
    let failed = false;
    TestBed.inject(PASSWORD_RECOVERY_API).verifyOtp('ada@mail.co', '000000').subscribe({ error: () => (failed = true) });
    http.expectOne(`${MEMBER_URL}/verify-otp`).flush({}, { status: 400, statusText: 'Bad Request' });
    expect(failed).toBe(true);
  });
});
