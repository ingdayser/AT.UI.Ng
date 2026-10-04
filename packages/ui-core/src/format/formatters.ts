export interface FormatOptions {
  /** BCP 47 locale. Default `es-CO`. */
  readonly locale?: string;
  /** ISO 4217 currency. Default `COP`. */
  readonly currency?: string;
  /** IANA time zone every date is shown in. Default `America/Bogota`. */
  readonly timeZone?: string;
  /** Decimals shown in money. Default 0 (the business rule is to round to whole pesos). */
  readonly currencyFractionDigits?: number;
}

export interface Formatters {
  formatCurrency(amount: number): string;
  formatDate(value: string | Date | null | undefined): string;
  formatDateTime(value: string | Date | null | undefined): string;
}

const EMPTY = '—';

function parseDate(value: string | Date): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${String(value)}`);
  return date;
}

/** Builds the formatters for one locale / currency / time zone. */
export function createFormatters(options: FormatOptions = {}): Formatters {
  const locale = options.locale ?? 'es-CO';
  const timeZone = options.timeZone ?? 'America/Bogota';
  const digits = options.currencyFractionDigits ?? 0;

  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: options.currency ?? 'COP',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone });
  // formatToParts, not format(): es-CO renders the meridiem as "p. m." and we want "PM".
  const dayTime = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone,
  });

  return {
    /** "$ 1.500.000". Throws on null / NaN: showing a wrong amount is worse than failing. */
    formatCurrency(amount) {
      if (amount == null || Number.isNaN(amount)) throw new Error('Cannot format a null or non-numeric amount');
      const factor = 10 ** digits;
      return money.format(Math.round(amount * factor) / factor);
    },

    /** "15 de mayo de 2026". "—" when empty. Throws on an invalid date. */
    formatDate(value) {
      if (!value) return EMPTY;
      return day.format(parseDate(value));
    },

    /** "01/junio/2026 08:35 PM". "—" when empty. Throws on an invalid date. */
    formatDateTime(value) {
      if (!value) return EMPTY;
      const parts = dayTime.formatToParts(parseDate(value));
      const get = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? '';
      const meridiem = get('dayPeriod').toUpperCase().replace(/[.\s]/g, '');
      return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')} ${meridiem}`;
    },
  };
}

/** Default formatters (es-CO, COP, America/Bogota). */
export const { formatCurrency, formatDate, formatDateTime } = createFormatters();

/**
 * Today as `yyyy-MM-dd` in the device's local time. `new Date().toISOString()` converts to UTC:
 * in Colombia (UTC-5), between 19:00 and midnight it already lands on the next day.
 */
export function todayLocalIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
