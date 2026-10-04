import { describe, expect, it } from 'vitest';
import { ApiResponseFailure, unwrap, type ApiResponse } from './api-response.ts';

const ok = <T>(result: T | null): ApiResponse<T> => ({ responseType: 1, error: null, result });

describe('unwrap', () => {
  it('returns the result', () => {
    expect(unwrap(ok({ id: 1 }))).toEqual({ id: 1 });
  });

  it('throws the server description when the envelope has an error', () => {
    const response: ApiResponse<string> = {
      responseType: 0,
      error: { code: 'E1', description: ' Saldo insuficiente ', trace: null },
      result: null,
    };
    try {
      unwrap(response, 'fallback');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiResponseFailure);
      expect((error as ApiResponseFailure).message).toBe('Saldo insuficiente');
      expect((error as ApiResponseFailure).code).toBe('E1');
    }
  });

  it('throws the fallback when there is no result and no description', () => {
    expect(() => unwrap(ok(null), 'No llegó la respuesta')).toThrow('No llegó la respuesta');
  });

  it('accepts an empty result when allowEmpty is set', () => {
    expect(unwrap(ok(null), 'x', { allowEmpty: true })).toBeNull();
  });

  it('still throws on an error with allowEmpty', () => {
    const response: ApiResponse<null> = {
      responseType: 0,
      error: { code: null, description: null, trace: null },
      result: null,
    };
    expect(() => unwrap(response, 'boom', { allowEmpty: true })).toThrow('boom');
  });
});
