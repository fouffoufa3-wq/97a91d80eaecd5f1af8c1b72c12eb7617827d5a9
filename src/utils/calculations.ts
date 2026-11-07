import type { PaymentType } from '@/lib/database-types';

export interface CalcResult {
  netMinutes: number;
  isNightShift: boolean;
}

export function getEffectiveRate(paymentType: PaymentType, customRate: number | null, defaultHourlyRate: number): number {
  if (paymentType === 'monthly') return customRate ?? 0;
  return customRate ?? defaultHourlyRate;
}

export function computeEntryEarnings(netMinutes: number, paymentType: PaymentType, customRate: number | null, defaultHourlyRate: number): number {
  if (paymentType === 'monthly') return 0;
  const rate = customRate ?? defaultHourlyRate;
  return (netMinutes / 60) * rate;
}

export function calculateWorkedMinutes(
  checkIn: string,
  checkOut: string,
  breakMins: number | string
): CalcResult {
  if (!checkIn || !checkOut) return { netMinutes: 0, isNightShift: false };

  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);

  let startMinutes = inH * 60 + inM;
  let endMinutes = outH * 60 + outM;
  let isNightShift = false;

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
    isNightShift = true;
  }

  const grossMinutes = endMinutes - startMinutes;
  const pause = typeof breakMins === 'string' ? parseInt(breakMins, 10) || 0 : breakMins;
  const netMinutes = Math.max(0, grossMinutes - pause);

  return { netMinutes, isNightShift };
}

export function formatMinutesToHours(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  const paddedMins = String(minutes).padStart(2, '0');
  return `${hours}h ${paddedMins}m`;
}

export function formatClockMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = Math.floor(totalMinutes % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatDA(amount: number): string {
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateReadable(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  };
  return dateObj.toLocaleDateString('fr-FR', options);
}

export function getTodayDateString(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export interface DayMark {
  mark_date: string;
  kind: 'absence_full' | 'absence_half' | 'night';
}

export interface PaySuspension {
  from: string | null;
  to: string | null;
}

export function isDateSuspended(date: string, suspension: PaySuspension): boolean {
  if (!suspension.from || !suspension.to) return false;
  return date >= suspension.from && date <= suspension.to;
}

export function getDaysInMonth(month: string): number {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(year, monthIndex, 0).getDate();
}

export function listMonthsBetween(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  let year = Number(startMonth.slice(0, 4));
  let month = Number(startMonth.slice(5, 7));
  const endYear = Number(endMonth.slice(0, 4));
  const endMonthIndex = Number(endMonth.slice(5, 7));
  while (year < endYear || (year === endYear && month <= endMonthIndex)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

export interface MonthlyPayResult {
  dailyRate: number;
  accruedDays: number;
  absenceDays: number;
  absenceDeduction: number;
  nightCount: number;
  nightBonus: number;
  total: number;
}

export function computeMonthlyPay(
  salary: number,
  nightRate: number | null,
  marks: DayMark[],
  suspension: PaySuspension,
  month: string,
  today: string
): MonthlyPayResult {
  const daysInMonth = getDaysInMonth(month);
  const dailyRate = salary / daysInMonth;
  const kindByDate = new Map(marks.map((m) => [m.mark_date, m.kind]));

  let accruedDays = 0;
  let absenceDays = 0;
  let nightCount = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    if (date > today) break;
    if (isDateSuspended(date, suspension)) continue;
    accruedDays += 1;
    const kind = kindByDate.get(date);
    if (kind === 'absence_full') absenceDays += 1;
    else if (kind === 'absence_half') absenceDays += 0.5;
    else if (kind === 'night') nightCount += 1;
  }

  const absenceDeduction = absenceDays * dailyRate;
  const nightBonus = (nightRate ?? 0) * nightCount;
  const total = Math.max(0, accruedDays * dailyRate - absenceDeduction + nightBonus);
  return { dailyRate, accruedDays, absenceDays, absenceDeduction, nightCount, nightBonus, total };
}

export function computeWorkEntryPay(
  entry: { entry_date: string; net_minutes: number; is_night_shift: boolean },
  paymentType: PaymentType,
  customRate: number | null,
  defaultHourlyRate: number,
  nightRate: number | null,
  suspension: PaySuspension
): number {
  if (isDateSuspended(entry.entry_date, suspension)) return 0;
  if (entry.is_night_shift && nightRate !== null) return nightRate;
  return computeEntryEarnings(entry.net_minutes, paymentType, customRate, defaultHourlyRate);
}

export interface EarningsInput {
  paymentType: PaymentType;
  customRate: number | null;
  nightRate: number | null;
  createdAt: string;
  suspension: PaySuspension;
  marks: DayMark[];
  entries: { entry_date: string; net_minutes: number; is_night_shift: boolean }[];
  defaultHourlyRate: number;
  today: string;
}

export function computeAllTimeEarnings(input: EarningsInput): number {
  const { paymentType, customRate, nightRate, suspension, marks, today } = input;
  if (paymentType === 'monthly') {
    return listMonthsBetween(input.createdAt.slice(0, 7), today.slice(0, 7)).reduce(
      (sum, month) => sum + computeMonthlyPay(customRate ?? 0, nightRate, marks, suspension, month, today).total,
      0
    );
  }
  return input.entries.reduce(
    (sum, e) => sum + computeWorkEntryPay(e, paymentType, customRate, input.defaultHourlyRate, nightRate, suspension),
    0
  );
}
