import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Clock, HandCoins, Coins, ListChecks, Moon, ArrowRight, StickyNote, CalendarX, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { WorkEntry, AppSettings, Profile, Payment, WorkerDayMark } from '@/lib/database-types';
import {
  computeMonthlyPay,
  computeWorkEntryPay,
  formatDA,
  formatDateReadable,
  formatMinutesToHours,
  getTodayDateString,
  computeAllTimeEarnings,
  type PaySuspension,
} from '@/utils/calculations';
import { useToast } from '@/hooks/useToast';
import EntryForm from '@/components/EntryForm';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MonthNavigator } from '@/components/ui/MonthNavigator';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { WorkerPaymentsCard } from '@/components/worker/WorkerPaymentsCard';
import { PaySuspensionNotice } from '@/components/worker/PaySuspensionNotice';
import MonthlyWorkerView from '@/components/worker/MonthlyWorkerView';

type MarkKind = WorkerDayMark['kind'];

interface WorkerDashboardProps {
  userId: string;
  profile: Profile;
  onExport: (entries: WorkEntry[], hourlyRate: number) => void;
}

export default function WorkerDashboard({ userId, profile, onExport }: WorkerDashboardProps) {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [marks, setMarks] = useState<WorkerDayMark[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(getTodayDateString().slice(0, 7));
  const { showToast } = useToast();

  const fetchEntries = useCallback(async () => {
    const { data, error } = await supabase
      .from('work_entries')
      .select('*')
      .order('entry_date', { ascending: false });
    if (error) {
      showToast('Erreur lors du chargement', 'error');
      return;
    }
    setEntries((data as WorkEntry[]) || []);
  }, [showToast]);

  const fetchMarks = useCallback(async () => {
    const { data, error } = await supabase
      .from('worker_day_marks')
      .select('*')
      .order('mark_date', { ascending: false });
    if (error) {
      showToast('Erreur lors du chargement', 'error');
      return;
    }
    setMarks((data as WorkerDayMark[]) || []);
  }, [showToast]);

  const fetchPayments = useCallback(async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false });
    if (error) return;
    setPayments((data as Payment[]) || []);
  }, []);

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) return;
    setSettings(data as AppSettings | null);
  }, []);

  useEffect(() => {
    Promise.all([fetchEntries(), fetchMarks(), fetchPayments(), fetchSettings()]).finally(() => setLoading(false));
  }, [fetchEntries, fetchMarks, fetchPayments, fetchSettings]);

  const defaultHourlyRate = settings?.hourly_rate ?? 250;
  const paymentType = profile.payment_type;
  const customRate = profile.custom_rate;
  const effectiveRate = customRate ?? defaultHourlyRate;
  const isMonthly = paymentType === 'monthly';
  const today = getTodayDateString();
  const currentMonth = today.slice(0, 7);
  const selectedMonth = monthFilter || currentMonth;
  const suspension: PaySuspension = { from: profile.pay_suspended_from, to: profile.pay_suspended_to };
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const handleAdd = useCallback(async (entry: Omit<WorkEntry, 'id' | 'user_id' | 'created_at'>) => {
    const { error } = await supabase.from('work_entries').insert({
      ...entry,
      user_id: userId,
    });
    if (error) {
      showToast('Erreur lors de l\'enregistrement', 'error');
      return;
    }
    showToast('Journée ajoutée avec succès ! (تم تسجيل النهار)', 'success');
    fetchEntries();
  }, [userId, showToast, fetchEntries]);

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from('work_entries').delete().eq('id', id);
    if (error) {
      showToast('Erreur lors de la suppression', 'error');
      return;
    }
    showToast('Journée supprimée (تم الحذف)', 'info');
    fetchEntries();
  }, [showToast, fetchEntries]);

  const handleMark = useCallback(async (date: string, kind: MarkKind, note: string) => {
    const { error } = await supabase
      .from('worker_day_marks')
      .upsert({ worker_id: userId, mark_date: date, kind, note }, { onConflict: 'worker_id,mark_date' });
    if (error) {
      showToast('Erreur lors de l\'enregistrement', 'error');
      return;
    }
    showToast('Jour enregistré', 'success');
    fetchMarks();
  }, [userId, showToast, fetchMarks]);

  const handleDeleteMark = useCallback(async (id: string) => {
    const { error } = await supabase.from('worker_day_marks').delete().eq('id', id);
    if (error) {
      showToast('Erreur lors de la suppression', 'error');
      return;
    }
    showToast('Jour supprimé', 'info');
    fetchMarks();
  }, [showToast, fetchMarks]);

  const monthlyPay = computeMonthlyPay(customRate ?? 0, profile.night_rate, marks, suspension, selectedMonth, today);

  const allTimeEarned = computeAllTimeEarnings({
    paymentType,
    customRate,
    nightRate: profile.night_rate,
    createdAt: profile.created_at,
    suspension,
    marks,
    entries,
    defaultHourlyRate,
    today,
  });

  const filteredEntries = useMemo(
    () => monthFilter ? entries.filter((e) => e.entry_date.startsWith(monthFilter)) : entries,
    [entries, monthFilter]
  );

  const filteredMinutes = filteredEntries.reduce((sum, e) => sum + e.net_minutes, 0);
  const totalDays = filteredEntries.length;
  const avgMinutes = totalDays > 0 ? filteredMinutes / totalDays : 0;
  const filteredEarnings = filteredEntries.reduce(
    (sum, e) => sum + computeWorkEntryPay(e, paymentType, customRate, defaultHourlyRate, profile.night_rate, suspension),
    0
  );
  const balanceDue = allTimeEarned - totalPaid;

  if (loading) {
    return <LoadingSpinner label="Chargement de votre espace..." />;
  }

  if (isMonthly) {
    return (
      <MonthlyWorkerView
        profile={profile}
        month={selectedMonth}
        onMonthChange={setMonthFilter}
        marks={marks}
        pay={monthlyPay}
        totalEarned={allTimeEarned}
        totalPaid={totalPaid}
        payments={payments}
        onMark={handleMark}
        onDeleteMark={handleDeleteMark}
      />
    );
  }

  return (
    <div className="max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
      <PaySuspensionNotice profile={profile} month={selectedMonth} />

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center">
            <Coins className="w-8 h-8 text-amber-400/40" />
          </div>
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tarif Horaire</span>
              <span className="text-xs font-arabic font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">السومة تاع الساعة</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-800">{formatDA(effectiveRate)}</span>
              <span className="text-sm font-bold text-slate-500">DA / h</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-amber-500" /> Fixé par l'admin
          </p>
        </div>

        <SummaryCard
          icon={CalendarCheck}
          label="Jours Travaillés"
          arabicLabel="أيام الخدمة"
          value={totalDays}
          unit="jours"
          iconColor="text-blue-400/40"
          iconBg="bg-blue-50"
          accentColor="text-blue-600"
          accentBg="bg-blue-50"
          footer={<>Moyenne: <span className="font-semibold text-slate-700">{formatMinutesToHours(avgMinutes)}</span> / jour</>}
        />
        <SummaryCard
          icon={Clock}
          label="Total des Heures"
          arabicLabel="مجموع السوايع"
          value={formatMinutesToHours(filteredMinutes)}
          iconColor="text-purple-400/40"
          iconBg="bg-purple-50"
          accentColor="text-purple-600"
          accentBg="bg-purple-50"
          footer={<>Équivalent: <span className="font-semibold text-purple-700">{(filteredMinutes / 60).toFixed(2)}</span> h</>}
        />
        <SummaryCard
          icon={HandCoins}
          label="Total des Gains"
          arabicLabel="مجموع الدراهم"
          value={formatDA(filteredEarnings)}
          unit="DA"
          variant="gradient"
        />
      </section>

      <WorkerPaymentsCard totalEarned={allTimeEarned} totalPaid={totalPaid} balanceDue={balanceDue} payments={payments} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <EntryForm
          hourlyRate={effectiveRate}
          paymentType={paymentType}
          rateReadOnly
          onAdd={handleAdd}
          onError={(msg) => showToast(msg, 'error')}
        />

        {/* History Table */}
        <div className="lg:col-span-8">
          <SectionCard
            icon={ListChecks}
            title="Mon Historique"
            arabicLabel="سجل الأيام"
            actions={<MonthNavigator value={monthFilter} onChange={setMonthFilter} dark />}
          >
            {filteredEntries.length === 0 ? (
              <EmptyState icon={CalendarX} title="Aucune journée enregistrée" arabicText="مازال ما سجلت حتى نهار تاع خدمة. عمر الفورميلار على اليسار باش تبدا!" />
            ) : (
              <>
                <div className="overflow-x-auto flex-grow">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-row">
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Horaires</th>
                        <th className="py-3.5 px-4">Durée</th>
                        <th className="py-3.5 px-4 text-right">Gain (DA)</th>
                        <th className="py-3.5 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 text-sm">
                      {filteredEntries.map((entry) => (
                        <WorkerEntryRow
                          key={entry.id}
                          entry={entry}
                          earnings={computeWorkEntryPay(entry, paymentType, customRate, defaultHourlyRate, profile.night_rate, suspension)}
                          onDelete={() => handleDelete(entry.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-wrap justify-between items-center text-xs text-slate-600 gap-2">
                  <span>Affichage de {filteredEntries.length} jour(s)</span>
                  <div className="flex items-center gap-4 font-semibold">
                    <span>Total: <strong className="text-slate-800">{formatMinutesToHours(filteredMinutes)}</strong></span>
                    <span>|</span>
                    <span>Gains: <strong className="text-emerald-700 text-sm">{formatDA(filteredEarnings)} DA</strong></span>
                  </div>
                </div>
              </>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function WorkerEntryRow({ entry, earnings, onDelete }: {
  entry: WorkEntry;
  earnings: number;
  onDelete: () => void;
}) {
  return (
    <>
      {/* Desktop row */}
      <tr className="hover:bg-slate-50/80 transition hidden sm:table-row">
        <td className="py-3.5 px-4 whitespace-nowrap">
          <div className="font-bold text-slate-800 capitalize">{formatDateReadable(entry.entry_date)}</div>
          {entry.note && (
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <StickyNote className="w-3 h-3 text-emerald-600" /> {entry.note}
            </div>
          )}
        </td>
        <td className="py-3.5 px-4 whitespace-nowrap">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700">
            <span className="text-emerald-700">{entry.check_in}</span>
            <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
            <span className="text-rose-600">{entry.check_out}</span>
          </div>
          {entry.is_night_shift && (
            <span className="ml-1 text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium inline-flex items-center">
              <Moon className="w-2.5 h-2.5" /> Nuit
            </span>
          )}
        </td>
        <td className="py-3.5 px-4 whitespace-nowrap">
          <span className="font-bold text-slate-800">{formatMinutesToHours(entry.net_minutes)}</span>
          <span className="block text-[11px] text-slate-400">{(entry.net_minutes / 60).toFixed(2)} h</span>
        </td>
        <td className="py-3.5 px-4 whitespace-nowrap text-right">
          <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
            {formatDA(earnings)} DA
          </span>
        </td>
        <td className="py-3.5 px-4 whitespace-nowrap text-center">
          <DeleteButton onDelete={onDelete} />
        </td>
      </tr>

      {/* Mobile card */}
      <tr className="sm:hidden">
        <td colSpan={5} className="py-3 px-4">
          <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100">
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-800 text-sm capitalize">{formatDateReadable(entry.entry_date)}</span>
              <DeleteButton onDelete={onDelete} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg font-semibold text-slate-700 border border-slate-200">
                <Clock className="w-3 h-3 text-emerald-600" />
                {entry.check_in}
                <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                <span className="text-rose-600">{entry.check_out}</span>
              </span>
              {entry.is_night_shift && (
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium inline-flex items-center">
                  <Moon className="w-2.5 h-2.5" /> Nuit
                </span>
              )}
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
              <span className="text-sm font-bold text-slate-800">{formatMinutesToHours(entry.net_minutes)}</span>
              <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                {formatDA(earnings)} DA
              </span>
            </div>
            {entry.note && (
              <div className="text-xs text-slate-500 flex items-center gap-1 pt-1">
                <StickyNote className="w-3 h-3 text-emerald-600" /> {entry.note}
              </div>
            )}
          </div>
        </td>
      </tr>
    </>
  );
}
