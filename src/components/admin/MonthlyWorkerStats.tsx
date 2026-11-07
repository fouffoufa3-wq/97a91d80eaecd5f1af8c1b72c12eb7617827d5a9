import { useMemo, useState } from 'react';
import { BarChart3, CalendarX, CalendarMinus } from 'lucide-react';
import type { Profile, WorkEntryWithProfile, WorkerDayMark } from '@/lib/database-types';
import {
  computeMonthlyPay,
  computeWorkEntryPay,
  formatDA,
  formatDateReadable,
  formatMinutesToHours,
  getTodayDateString,
} from '@/utils/calculations';
import { SectionCard } from '@/components/ui/SectionCard';
import { MonthNavigator } from '@/components/ui/MonthNavigator';
import { EmptyState } from '@/components/ui/EmptyState';

interface MonthlyWorkerStatsProps {
  profiles: Profile[];
  marks: WorkerDayMark[];
  entries: WorkEntryWithProfile[];
  defaultHourlyRate: number;
}

const KIND_LABELS: Record<WorkerDayMark['kind'], string> = {
  absence_full: 'Absence (journée)',
  absence_half: 'Absence (demi-journée)',
  night: 'Travail de nuit',
};

export function MonthlyWorkerStats({ profiles, marks, entries, defaultHourlyRate }: MonthlyWorkerStatsProps) {
  const [month, setMonth] = useState(getTodayDateString().slice(0, 7));
  const today = getTodayDateString();
  const workers = useMemo(() => profiles.filter((p) => p.role === 'worker'), [profiles]);
  const nameById = useMemo(() => new Map(workers.map((w) => [w.id, w.full_name || w.email])), [workers]);

  const rows = useMemo(() => workers.map((p) => {
    const suspension = { from: p.pay_suspended_from, to: p.pay_suspended_to };
    if (p.payment_type === 'monthly') {
      const pay = computeMonthlyPay(
        p.custom_rate ?? 0,
        p.night_rate,
        marks.filter((m) => m.worker_id === p.id),
        suspension,
        month,
        today
      );
      return {
        id: p.id,
        name: p.full_name || p.email,
        type: 'Mensuel',
        detail: `${pay.accruedDays} jour(s) comptés`,
        absences: pay.absenceDays,
        nights: pay.nightCount,
        total: pay.total,
      };
    }
    const monthEntries = entries.filter((e) => e.user_id === p.id && e.entry_date.startsWith(month));
    const minutes = monthEntries.reduce((sum, e) => sum + e.net_minutes, 0);
    const total = monthEntries.reduce(
      (sum, e) => sum + computeWorkEntryPay(e, 'hourly', p.custom_rate, defaultHourlyRate, p.night_rate, suspension),
      0
    );
    return {
      id: p.id,
      name: p.full_name || p.email,
      type: 'Heure',
      detail: formatMinutesToHours(minutes),
      absences: null,
      nights: null,
      total,
    };
  }), [workers, marks, entries, month, today, defaultHourlyRate]);

  const monthMarks = useMemo(
    () => marks
      .filter((m) => m.mark_date.startsWith(month) && nameById.has(m.worker_id))
      .sort((a, b) => b.mark_date.localeCompare(a.mark_date)),
    [marks, month, nameById]
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <MonthNavigator value={month} onChange={setMonth} />
      </div>

      <SectionCard icon={BarChart3} title="Récapitulatif par ouvrier" arabicLabel="ملخص كل خدام">
        {rows.length === 0 ? (
          <EmptyState icon={CalendarX} title="Aucun ouvrier" arabicText="ما كاين حتى خدام." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Ouvrier</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Période</th>
                  <th className="py-3.5 px-4 text-right">Absences</th>
                  <th className="py-3.5 px-4 text-right">Nuits</th>
                  <th className="py-3.5 px-4 text-right">Total du mois</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-sm">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-700">{row.name}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">{row.type}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">{row.detail}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-right font-semibold text-rose-700">{row.absences ?? '-'}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-right font-semibold text-indigo-700">{row.nights ?? '-'}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-right font-extrabold text-slate-800">{formatDA(row.total)} DA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard icon={CalendarMinus} title="Jours marqués du mois" arabicLabel="أيام الغياب والليالي">
        {monthMarks.length === 0 ? (
          <EmptyState icon={CalendarX} title="Aucun jour marqué ce mois" arabicText="ما كاين حتى غياب ولا ليلة مسجلة هاد الشهر." />
        ) : (
          <ul className="divide-y divide-slate-200/70">
            {monthMarks.map((mark) => (
              <li key={mark.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-bold text-slate-800 text-sm">{nameById.get(mark.worker_id)}</span>
                  <span className="text-xs text-slate-500 capitalize">{formatDateReadable(mark.mark_date)}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{KIND_LABELS[mark.kind]}</div>
                {mark.note && <div className="text-xs text-slate-600 mt-1 italic">{mark.note}</div>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
