import { Banknote } from 'lucide-react';
import type { Payment } from '@/lib/database-types';
import { formatDA, formatDateReadable } from '@/utils/calculations';

interface WorkerPaymentsCardProps {
  totalEarned: number;
  totalPaid: number;
  balanceDue: number;
  payments: Payment[];
}

export function WorkerPaymentsCard({ totalEarned, totalPaid, balanceDue, payments }: WorkerPaymentsCardProps) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <Banknote className="text-emerald-600 w-5 h-5" />
        <h3 className="font-bold text-base text-slate-800">Mes Paiements</h3>
        <span className="text-xs font-arabic bg-slate-100 text-emerald-700 px-2.5 py-1 rounded-lg">الخلاصات</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Total Gagné</span>
          <span className="block text-xs font-arabic text-emerald-700 mt-0.5">لي تستاهلو</span>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">{formatDA(totalEarned)} DA</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Total Versé</span>
          <span className="block text-xs font-arabic text-blue-700 mt-0.5">لي خلصت</span>
          <p className="text-xl font-extrabold text-blue-700 mt-1">{formatDA(totalPaid)} DA</p>
        </div>
        <div className={`rounded-xl p-4 border ${balanceDue > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
          <span className={`text-xs font-semibold uppercase tracking-wider ${balanceDue > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
            {balanceDue > 0 ? 'Reste à recevoir' : 'Tout est payé'}
          </span>
          <span className={`block text-xs font-arabic mt-0.5 ${balanceDue > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            {balanceDue > 0 ? 'مزال ليا' : 'تخلص كامل'}
          </span>
          <p className={`text-xl font-extrabold mt-1 ${balanceDue > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
            {formatDA(Math.abs(balanceDue))} DA
          </p>
        </div>
      </div>
      {payments.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Derniers paiements</p>
          <div className="space-y-2">
            {payments.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                <span className="font-semibold text-slate-700 capitalize">{formatDateReadable(p.payment_date)}</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg">{formatDA(Number(p.amount))} DA</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
