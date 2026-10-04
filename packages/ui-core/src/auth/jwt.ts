export interface JwtPayload {
  sub: string;
  preferred_username: string;
  email?: string;
  name?: string;
  role: string | string[];
  exp: number;
  iat: number;
}

/** Seconds of margin so a token about to expire is already treated as expired. */
const EXPIRY_MARGIN_SECONDS = 30;

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** UTF-8 aware base64url decoder with no dependency on `atob`/`Buffer`/`TextDecoder` (not on every JS runtime). */
function decodeBase64Url(input: string): string {
  const clean = input.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = BASE64_ALPHABET.indexOf(char);
    if (value < 0) throw new Error('Invalid base64url');
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  // Bytes -> percent-encoding -> decodeURIComponent turns UTF-8 bytes into a string.
  return decodeURIComponent(bytes.map((byte) => `%${byte.toString(16).padStart(2, '0')}`).join(''));
}

/** Reads a JWT's claims. It does not verify the signature: that is the backend's job. */
export const JwtHelper = {
  decode(token: string): JwtPayload | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      return JSON.parse(decodeBase64Url(payload)) as JwtPayload;
    } catch {
      return null;
    }
  },

  isExpired(token: string, now: number = Date.now()): boolean {
    const payload = JwtHelper.decode(token);
    if (!payload) return true;
    return now >= (payload.exp - EXPIRY_MARGIN_SECONDS) * 1000;
  },

  /** Seconds left before the token expires (0 if it is invalid). */
  expiresIn(token: string, now: number = Date.now()): number {
    const payload = JwtHelper.decode(token);
    if (!payload) return 0;
    return payload.exp - Math.floor(now / 1000);
  },

  getRoles(token: string): string[] {
    const payload = JwtHelper.decode(token);
    if (!payload) return [];
    return Array.isArray(payload.role) ? payload.role : [payload.role];
  },
};
