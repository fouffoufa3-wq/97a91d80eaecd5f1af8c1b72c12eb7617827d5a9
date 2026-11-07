import { PauseCircle } from 'lucide-react';
import type { Profile } from '@/lib/database-types';
import { formatDateReadable } from '@/utils/calculations';

interface PaySuspensionNoticeProps {
  profile: Profile;
  month: string;
}

export function PaySuspensionNotice({ profile, month }: PaySuspensionNoticeProps) {
  const { pay_suspended_from: from, pay_suspended_to: to } = profile;
  if (!from || !to) return null;
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;
  if (from > monthEnd || to < monthStart) return null;

  return (
    <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-5 py-3.5 text-sm font-semibold">
      <PauseCircle className="w-5 h-5 shrink-0" />
      <span>Paiement suspendu du {formatDateReadable(from)} au {formatDateReadable(to)}</span>
    </div>
  );
}
