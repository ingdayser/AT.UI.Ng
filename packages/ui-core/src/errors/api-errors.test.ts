import { describe, expect, it } from 'vitest';
import { ApiResponseFailure } from '../api/api-response.ts';
import {
  NO_CONNECTION_MESSAGE,
  SERVER_ERROR_MESSAGE,
  extractApiMessages,
  isNetworkError,
  resolveApiErrorMessage,
  serverErrorDescription,
} from './api-errors.ts';

const httpError = (status: number, description?: string) => ({
  status,
  error: description === undefined ? null : { error: { code: 'X', description, trace: null } },
});

describe('api errors', () => {
  it('splits the backend description into lines', () => {
    expect(extractApiMessages(httpError(400, 'Uno\r\n\nDos\n'))).toEqual(['Uno', 'Dos']);
  });

  it('reads the description from an envelope failure too', () => {
    const failure = new ApiResponseFailure('m', { code: 'E', description: ' Detalle ', trace: null });
    expect(serverErrorDescription(failure)).toBe('Detalle');
  });

  it('ignores anything else', () => {
    expect(extractApiMessages(new Error('x'))).toEqual([]);
    expect(extractApiMessages(null)).toEqual([]);
  });

  it('prefers the server message', () => {
    expect(resolveApiErrorMessage(httpError(400, 'Cliente duplicado'), 'fallback')).toBe('Cliente duplicado');
  });

  it('explains a missing connection', () => {
    expect(isNetworkError(httpError(0))).toBe(true);
    expect(resolveApiErrorMessage(httpError(0), 'fallback')).toBe(NO_CONNECTION_MESSAGE);
  });

  it('explains a server error without detail', () => {
    expect(resolveApiErrorMessage(httpError(503), 'fallback')).toBe(SERVER_ERROR_MESSAGE);
  });

  it('falls back otherwise', () => {
    expect(resolveApiErrorMessage(httpError(404), 'No existe')).toBe('No existe');
    expect(resolveApiErrorMessage(new Error('x'), 'No existe')).toBe('No existe');
  });
});
