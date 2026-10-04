import { describe, expect, it } from 'vitest';
import { createFormatters, formatCurrency, formatDate, formatDateTime, todayLocalIsoDate } from './formatters.ts';

const nbsp = (text: string): string => text.replace(/\u00a0/g, ' ');

describe('formatters (es-CO, COP, America/Bogota)', () => {
  it('formats whole pesos, rounding', () => {
    expect(nbsp(formatCurrency(1500000.6))).toBe('$ 1.500.001');
  });

  it('throws on a null or NaN amount', () => {
    expect(() => formatCurrency(NaN)).toThrow();
    expect(() => formatCurrency(null as unknown as number)).toThrow();
  });

  it('can show decimals', () => {
    expect(nbsp(createFormatters({ currencyFractionDigits: 2 }).formatCurrency(2939204.62))).toBe('$ 2.939.204,62');
  });

  it('formats a date in the Bogota time zone, not UTC', () => {
    // 2026-05-16T02:00:00Z is still the 15th at 21:00 in Colombia.
    expect(formatDate('2026-05-16T02:00:00Z')).toBe('15 de mayo de 2026');
  });

  it('formats date and time with an upper-case meridiem', () => {
    expect(formatDateTime('2026-06-02T01:35:00Z')).toBe('01/junio/2026 08:35 PM');
  });

  it('returns a dash for empty values and throws on invalid ones', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDateTime('')).toBe('—');
    expect(() => formatDate('not a date')).toThrow();
  });
});

describe('todayLocalIsoDate', () => {
  it('uses local components, not UTC', () => {
    expect(todayLocalIsoDate(new Date(2026, 4, 5, 23, 30))).toBe('2026-05-05');
  });
});
