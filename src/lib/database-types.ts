export type PaymentType = 'hourly' | 'monthly';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'worker';
  created_at: string;
  payment_type: PaymentType;
  custom_rate: number | null;
  night_rate: number | null;
  pay_suspended_from: string | null;
  pay_suspended_to: string | null;
  approved: boolean;
}

export interface WorkerDayMark {
  id: string;
  worker_id: string;
  mark_date: string;
  kind: 'absence_full' | 'absence_half' | 'night';
  note: string;
  created_at: string;
}

export interface WorkEntry {
  id: string;
  user_id: string;
  entry_date: string;
  check_in: string;
  check_out: string;
  break_mins: number;
  net_minutes: number;
  is_night_shift: boolean;
  note: string;
  created_at: string;
}

export interface WorkEntryWithProfile extends WorkEntry {
  profiles: { full_name: string; email: string; payment_type: PaymentType; custom_rate: number | null } | null;
}

export interface AppSettings {
  id: number;
  hourly_rate: number;
  updated_at: string;
}

export interface Payment {
  id: string;
  worker_id: string;
  amount: number;
  payment_date: string;
  note: string;
  recorded_by: string | null;
  created_at: string;
}

export interface PaymentWithProfile extends Payment {
  profiles: { full_name: string; email: string } | null;
}
