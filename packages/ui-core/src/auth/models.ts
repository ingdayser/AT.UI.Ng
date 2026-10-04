export interface AccountInfo {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface SignInRequest {
  username: string;
  password: string;
}

export interface SignInResponse {
  securityToken: string;
  createdDate: string;
  expiryDate: string;
  refreshToken: string;
  refreshTokenExpiry: string;
  accountInfo: AccountInfo;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResendOtpRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  code: string;
}

export interface VerifyOtpResponse {
  resetSessionToken: string;
}

export interface ResetPasswordWithOtpRequest {
  email: string;
  resetSessionToken: string;
  newPassword: string;
}
