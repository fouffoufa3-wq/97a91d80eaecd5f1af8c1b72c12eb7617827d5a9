import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListChecks, UserCog, BarChart3, Banknote, Calendar, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { WorkEntryWithProfile, AppSettings, Profile, WorkerDayMark } from '@/lib/database-types';
import { computeAllTimeEarnings, computeEntryEarnings, formatDA, formatMinutesToHours, getTodayDateString } from '@/utils/calculations';
import { useToast } from '@/hooks/useToast';
import StatsView from '@/components/StatsView';
import PaymentsView from '@/components/PaymentsView';
import { AdminSummaryCards } from '@/components/admin/AdminSummaryCards';
import { EntriesTable } from '@/components/admin/EntriesTable';
import { WorkersManager } from '@/components/admin/WorkersManager';
import { MonthlyWorkerStats } from '@/components/admin/MonthlyWorkerStats';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MonthNavigator } from '@/components/ui/MonthNavigator';

interface AdminDashboardProps {
  adminId: string;
}

export default function AdminDashboard({ adminId }: AdminDashboardProps) {
  const [entries, setEntries] = useState<WorkEntryWithProfile[]>([]);
  const [marks, setMarks] = useState<WorkerDayMark[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState('');
  const [workerFilter, setWorkerFilter] = useState('');
  const [rateInput, setRateInput] = useState('250');
  const [view, setView] = useState<'entries' | 'workers' | 'stats' | 'monthly' | 'payments'>('entries');
  const { showToast } = useToast();

  const fetchEntries = useCallback(async () => {
    const { data, error } = await supabase
      .from('work_entries')
      .select('*, profiles:profiles(full_name, email, payment_type, custom_rate)')
      .order('entry_date', { ascending: false });
    if (error) {
      showToast('Erreur lors du chargement', 'error');
      return;
    }
    setEntries((data as WorkEntryWithProfile[]) || []);
  }, [showToast]);

  const fetchMarks = useCallback(async () => {
    const { data, error } = await supabase
      .from('worker_day_marks')
      .select('*')
      .order('mark_date', { ascending: false });
    if (error) {
      showToast('Erreur lors du chargement des jours marqués', 'error');
      return;
    }
    setMarks((data as WorkerDayMark[]) || []);
  }, [showToast]);

  const fetchProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) return;
    setAllProfiles((data as Profile[]) || []);
  }, []);

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) return;
    const s = data as AppSettings | null;
    setSettings(s);
    if (s) setRateInput(String(s.hourly_rate));
  }, []);

  useEffect(() => {
    Promise.all([fetchEntries(), fetchProfiles(), fetchSettings(), fetchMarks()]).finally(() => setLoading(false));
  }, [fetchEntries, fetchProfiles, fetchSettings, fetchMarks]);

  const defaultHourlyRate = settings?.hourly_rate ?? 250;

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from('work_entries').delete().eq('id', id);
    if (error) {
      showToast('Erreur lors de la suppression', 'error');
      return;
    }
    showToast('Journée supprimée', 'info');
    fetchEntries();
  }, [showToast, fetchEntries]);

  const pendingCount = allProfiles.filter((p) => p.role === 'worker' && !p.approved).length;

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (monthFilter && !e.entry_date.startsWith(monthFilter)) return false;
      if (workerFilter && e.user_id !== workerFilter) return false;
      return true;
    });
  }, [entries, monthFilter, workerFilter]);

  const totalMinutes = entries.reduce((sum, e) => sum + e.net_minutes, 0);
  const totalDays = entries.length;
  const today = getTodayDateString();
  const totalEarnings = allProfiles
    .filter((p) => p.role === 'worker')
    .reduce((sum, p) => sum + computeAllTimeEarnings({
      paymentType: p.payment_type,
      customRate: p.custom_rate,
      nightRate: p.night_rate,
      createdAt: p.created_at,
      suspension: { from: p.pay_suspended_from, to: p.pay_suspended_to },
      marks: marks.filter((m) => m.worker_id === p.id),
      entries: entries.filter((e) => e.user_id === p.id),
      defaultHourlyRate,
      today,
    }), 0);

  let filteredMinutes = 0;
  const filteredEarnings = filteredEntries.reduce((sum, e) => {
    filteredMinutes += e.net_minutes;
    const pt = e.profiles?.payment_type ?? 'hourly';
    const cr = e.profiles?.custom_rate ?? null;
    return sum + computeEntryEarnings(e.net_minutes, pt, cr, defaultHourlyRate);
  }, 0);

  if (loading) {
    return <LoadingSpinner label="Chargement du tableau de bord..." />;
  }

  const tabs = [
    { key: 'entries' as const, label: 'Entrées', arabicLabel: 'السوايع', icon: ListChecks, badge: pendingCount },
    { key: 'workers' as const, label: 'Utilisateurs', arabicLabel: 'المستخدمين', icon: UserCog, badge: pendingCount },
    { key: 'stats' as const, label: 'Statistiques', arabicLabel: 'إحصائيات', icon: BarChart3 },
    { key: 'monthly' as const, label: 'Mensuel', arabicLabel: 'الشهرية', icon: CalendarDays },
    { key: 'payments' as const, label: 'Paiements', arabicLabel: 'الخلاص', icon: Banknote },
  ];

  return (
    <div className="max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
      <AdminSummaryCards
        settings={settings}
        rateInput={rateInput}
        setRateInput={setRateInput}
        totalDays={totalDays}
        totalMinutes={totalMinutes}
        totalEarnings={totalEarnings}
        userCount={allProfiles.length}
      />

      {/* Tab navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = view === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              {tab.label}
              <span className={`text-[10px] font-arabic ${isActive ? 'text-emerald-300' : 'text-slate-400'}`}>{tab.arabicLabel}</span>
              {'badge' in tab && tab.badge ? (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{tab.badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {view === 'entries' ? (
        <>
          <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                value={workerFilter}
                onChange={(e) => setWorkerFilter(e.target.value)}
                className="text-sm text-slate-700 rounded-lg px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Tous les ouvriers</option>
                {allProfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                ))}
              </select>
            </div>
            <div className="ml-auto">
              <MonthNavigator value={monthFilter} onChange={setMonthFilter} />
            </div>
          </div>
          <EntriesTable
            entries={filteredEntries}
            defaultHourlyRate={defaultHourlyRate}
            onDelete={handleDelete}
          />
          {filteredEntries.length > 0 && (
            <div className="bg-slate-50 px-5 py-3 rounded-xl border border-slate-200 flex flex-wrap justify-between items-center text-xs text-slate-600 gap-2">
              <span>Affichage de {filteredEntries.length} jour(s)</span>
              <div className="flex items-center gap-4 font-semibold">
                <span>Total: <strong className="text-slate-800">{formatMinutesToHours(filteredMinutes)}</strong></span>
                <span>|</span>
                <span>Gains (heure): <strong className="text-emerald-700 text-sm">{formatDA(filteredEarnings)} DA</strong></span>
              </div>
            </div>
          )}
        </>
      ) : view === 'workers' ? (
        <WorkersManager
          profiles={allProfiles}
          adminId={adminId}
          defaultHourlyRate={defaultHourlyRate}
          onProfilesChanged={fetchProfiles}
          onEntriesChanged={fetchEntries}
        />
      ) : view === 'stats' ? (
        <StatsView entries={entries} profiles={allProfiles} defaultHourlyRate={defaultHourlyRate} />
      ) : view === 'monthly' ? (
        <MonthlyWorkerStats profiles={allProfiles} marks={marks} entries={entries} defaultHourlyRate={defaultHourlyRate} />
      ) : (
        <PaymentsView entries={entries} marks={marks} profiles={allProfiles} defaultHourlyRate={defaultHourlyRate} />
      )}
    </div>
  );
}
