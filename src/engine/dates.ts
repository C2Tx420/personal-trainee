/**
 * Logical dates as ISO strings `YYYY-MM-DD`, always in Vietnam time.
 *
 * Every date calculation in the engine goes through here to avoid the device timezone:
 * date strings are converted to UTC 00:00 and shifted by whole days.
 */

import { getLocale, t } from '../i18n';

const TIMEZONE = 'Asia/Ho_Chi_Minh';
const MS_PER_DAY = 86_400_000;

export type IsoDate = string;

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: t('Thứ 2'),
  tue: t('Thứ 3'),
  wed: t('Thứ 4'),
  thu: t('Thứ 5'),
  fri: t('Thứ 6'),
  sat: t('Thứ 7'),
  sun: t('Chủ nhật'),
};

function toUtcMs(date: IsoDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

/** Number of days from `from` to `to` (to − from). */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

export function weekdayOf(date: IsoDate): Weekday {
  // getUTCDay: 0 = CN … 6 = T7
  const js = new Date(toUtcMs(date)).getUTCDay();
  return WEEKDAYS[(js + 6) % 7];
}

/** Monday of the week containing `date`. */
export function weekStart(date: IsoDate): IsoDate {
  return addDays(date, -WEEKDAYS.indexOf(weekdayOf(date)));
}

/** Today's date in Vietnam time. */
export function todayVN(now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "27/10" or "27/10/2026"; in English "27 Oct" or "27 Oct 2026". */
export function formatVN(date: IsoDate, withYear = false): string {
  const [y, m, d] = date.split('-');
  if (getLocale() === 'en') return `${Number(d)} ${MONTHS_EN[Number(m) - 1]}${withYear ? ` ${y}` : ''}`;
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}
