import { CalendarX, CalendarMinus, ListChecks, Moon, ShieldCheck, Wallet, HandCoins } from 'lucide-react';
import type { Payment, Profile, WorkerDayMark } from '@/lib/database-types';
import { formatDA, formatDateReadable, type MonthlyPayResult } from '@/utils/calculations';
import MonthlyMarkForm from '@/components/MonthlyMarkForm';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { MonthNavigator } from '@/components/ui/MonthNavigator';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { WorkerPaymentsCard } from '@/components/worker/WorkerPaymentsCard';
import { PaySuspensionNotice } from '@/components/worker/PaySuspensionNotice';

type MarkKind = WorkerDayMark['kind'];

const KIND_LABELS: Record<MarkKind, string> = {
  absence_full: 'Absence (journée)',
  absence_half: 'Absence (demi-journée)',
  night: 'Travail de nuit',
};

interface MonthlyWorkerViewProps {
  profile: Profile;
  month: string;
  onMonthChange: (month: string) => void;
  marks: WorkerDayMark[];
  pay: MonthlyPayResult;
  totalEarned: number;
  totalPaid: number;
  payments: Payment[];
  onMark: (date: string, kind: MarkKind, note: string) => void;
  onDeleteMark: (id: string) => void;
}

export default function MonthlyWorkerView({
  profile,
  month,
  onMonthChange,
  marks,
  pay,
  totalEarned,
  totalPaid,
  payments,
  onMark,
  onDeleteMark,
}: MonthlyWorkerViewProps) {
  const salary = profile.custom_rate ?? 0;
  const monthMarks = marks
    .filter((m) => m.mark_date.startsWith(month))
    .sort((a, b) => b.mark_date.localeCompare(a.mark_date));
  const balanceDue = totalEarned - totalPaid;

  return (
    <div className="max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
      <PaySuspensionNotice profile={profile} month={month} />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Wallet}
          label="Salaire Mensuel"
          arabicLabel="الشهرية"
          value={formatDA(salary)}
          unit="DA"
          iconColor="text-amber-400/40"
          iconBg="bg-amber-50"
          accentColor="text-amber-600"
          accentBg="bg-amber-50"
          footer={<span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-amber-500" /> Fixé par l'admin</span>}
        />
        <SummaryCard
          icon={CalendarMinus}
          label="Jours d'absence"
          arabicLabel="أيام الغياب"
          value={pay.absenceDays}
          unit="jours"
          iconColor="text-rose-400/40"
          iconBg="bg-rose-50"
          accentColor="text-rose-600"
          accentBg="bg-rose-50"
          footer={<>Déduction: <span className="font-semibold text-rose-700">{formatDA(pay.absenceDeduction)} DA</span></>}
        />
        <SummaryCard
          icon={Moon}
          label="Nuits travaillées"
          arabicLabel="الليالي"
          value={pay.nightCount}
          unit="nuits"
          iconColor="text-indigo-400/40"
          iconBg="bg-indigo-50"
          accentColor="text-indigo-600"
          accentBg="bg-indigo-50"
          footer={<>Prime: <span className="font-semibold text-indigo-700">{formatDA(pay.nightBonus)} DA</span></>}
        />
        <SummaryCard
          icon={HandCoins}
          label="Salaire du Mois"
          arabicLabel="مجموع الدراهم"
          value={formatDA(pay.total)}
          unit="DA"
          variant="gradient"
          footer={<>Par jour: <span className="font-semibold">{formatDA(pay.dailyRate)} DA</span></>}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <MonthlyMarkForm onMark={onMark} />

        <div className="lg:col-span-8">
          <SectionCard
            icon={ListChecks}
            title="Mes jours marqués"
            arabicLabel="أيام الغياب"
            actions={<MonthNavigator value={month} onChange={onMonthChange} dark />}
          >
            {monthMarks.length === 0 ? (
              <EmptyState icon={CalendarX} title="Aucun jour marqué ce mois" arabicText="ما كاين حتى غياب ولا ليلة مسجلة هاد الشهر." />
            ) : (
              <ul className="divide-y divide-slate-200/70">
                {monthMarks.map((mark) => (
                  <li key={mark.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div>
                      <div className="font-bold text-slate-800 capitalize text-sm">{formatDateReadable(mark.mark_date)}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{KIND_LABELS[mark.kind]}</div>
                      {mark.note && <div className="text-xs text-slate-600 mt-1 italic">{mark.note}</div>}
                    </div>
                    <DeleteButton onDelete={() => onDeleteMark(mark.id)} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <WorkerPaymentsCard totalEarned={totalEarned} totalPaid={totalPaid} balanceDue={balanceDue} payments={payments} />
    </div>
  );
}
