import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Users, Clock, Calendar, HandCoins, LogOut, Wallet } from 'lucide-react';
import type { WorkEntryWithProfile, Profile } from '@/lib/database-types';
import { computeEntryEarnings, formatClockMinutes, formatDA, formatMinutesToHours, formatDateReadable, getTodayDateString } from '@/utils/calculations';
import { MonthNavigator } from '@/components/ui/MonthNavigator';

interface StatsViewProps {
  entries: WorkEntryWithProfile[];
  profiles: Profile[];
  defaultHourlyRate: number;
}

interface WorkerStat {
  profile: Profile;
  totalMinutes: number;
  totalDays: number;
  totalEarnings: number;
  avgMinutesPerDay: number;
  firstDay: string;
  lastDay: string;
}

interface DayStat {
  date: string;
  minutes: number;
  workers: number;
  earnings: number;
}

export default function StatsView({ entries: allEntries, profiles, defaultHourlyRate }: StatsViewProps) {
  const [month, setMonth] = useState(getTodayDateString().slice(0, 7));
  const entries = useMemo(
    () => (month ? allEntries.filter((e) => e.entry_date.startsWith(month)) : allEntries),
    [allEntries, month]
  );

  const workerStats = useMemo<WorkerStat[]>(() => {
    const workers = profiles.filter((p) => p.role === 'worker');
    return workers.map((w) => {
      const wEntries = entries.filter((e) => e.user_id === w.id);
      const totalMinutes = wEntries.reduce((s, e) => s + e.net_minutes, 0);
      const totalDays = wEntries.length;
      const totalEarnings = wEntries.reduce((s, e) => {
        const pt = e.profiles?.payment_type ?? w.payment_type;
        const cr = e.profiles?.custom_rate ?? w.custom_rate;
        return s + computeEntryEarnings(e.net_minutes, pt, cr, defaultHourlyRate);
      }, 0);
      const sortedDates = wEntries.map((e) => e.entry_date).sort();
      return {
        profile: w,
        totalMinutes,
        totalDays,
        totalEarnings,
        avgMinutesPerDay: totalDays > 0 ? totalMinutes / totalDays : 0,
        firstDay: sortedDates[0] ?? '',
        lastDay: sortedDates[sortedDates.length - 1] ?? '',
      };
    }).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [entries, profiles, defaultHourlyRate]);

  const dailyStats = useMemo<DayStat[]>(() => {
    const byDate = new Map<string, DayStat>();
    entries.forEach((e) => {
      const existing = byDate.get(e.entry_date);
      const pt = e.profiles?.payment_type ?? 'hourly';
      const cr = e.profiles?.custom_rate ?? null;
      const earn = computeEntryEarnings(e.net_minutes, pt, cr, defaultHourlyRate);
      if (existing) {
        existing.minutes += e.net_minutes;
        existing.workers += 1;
        existing.earnings += earn;
      } else {
        byDate.set(e.entry_date, { date: e.entry_date, minutes: e.net_minutes, workers: 1, earnings: earn });
      }
    });
    return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  }, [entries, defaultHourlyRate]);

  const overallStats = useMemo(() => {
    const totalMinutes = entries.reduce((s, e) => s + e.net_minutes, 0);
    const totalDays = entries.length;
    const totalEarnings = entries.reduce((s, e) => {
      const pt = e.profiles?.payment_type ?? 'hourly';
      const cr = e.profiles?.custom_rate ?? null;
      return s + computeEntryEarnings(e.net_minutes, pt, cr, defaultHourlyRate);
    }, 0);
    const uniqueDays = new Set(entries.map((e) => e.entry_date)).size;
    const activeWorkers = new Set(entries.map((e) => e.user_id)).size;
    const avgCheckOutMinutes = totalDays > 0
      ? entries.reduce((s, e) => {
          const [h, m] = e.check_out.split(':').map(Number);
          return s + h * 60 + m;
        }, 0) / totalDays
      : null;
    return {
      totalMinutes,
      totalDays,
      totalEarnings,
      uniqueDays,
      activeWorkers,
      avgPerDay: uniqueDays > 0 ? totalMinutes / uniqueDays : 0,
      avgCheckOutMinutes,
      avgEarningsPerDay: uniqueDays > 0 ? totalEarnings / uniqueDays : 0,
    };
  }, [entries, defaultHourlyRate]);

  const maxDailyMinutes = Math.max(...dailyStats.map((d) => d.minutes), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold text-base text-slate-800">Statistiques du mois</h3>
        <MonthNavigator value={month} onChange={setMonth} />
      </div>

      {/* Overall KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-emerald-50 p-2 rounded-lg"><Clock className="w-4 h-4 text-emerald-600" /></div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Heures</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-800">{formatMinutesToHours(overallStats.totalMinutes)}</p>
          <p className="text-xs text-slate-500 mt-1">{(overallStats.totalMinutes / 60).toFixed(1)}h décimales</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-50 p-2 rounded-lg"><Calendar className="w-4 h-4 text-blue-600" /></div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Jours Uniques</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-800">{overallStats.uniqueDays}</p>
          <p className="text-xs text-slate-500 mt-1">{overallStats.totalDays} entrées totales</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-amber-50 p-2 rounded-lg"><HandCoins className="w-4 h-4 text-amber-600" /></div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Gains</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-800">{formatDA(overallStats.totalEarnings)}</p>
          <p className="text-xs text-slate-500 mt-1">DA (heures uniquement)</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-purple-50 p-2 rounded-lg"><Users className="w-4 h-4 text-purple-600" /></div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Ouvriers Actifs</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-800">{overallStats.activeWorkers}</p>
          <p className="text-xs text-slate-500 mt-1">sur {profiles.filter((p) => p.role === 'worker').length} inscrits</p>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 text-white p-4 rounded-2xl shadow-sm flex items-center gap-3">
          <LogOut className="w-8 h-8 text-rose-300" />
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Moyenne sortie</p>
            <p className="text-xl font-bold">{overallStats.avgCheckOutMinutes === null ? '--:--' : formatClockMinutes(overallStats.avgCheckOutMinutes)}</p>
          </div>
        </div>
        <div className="bg-slate-800 text-white p-4 rounded-2xl shadow-sm flex items-center gap-3">
          <Wallet className="w-8 h-8 text-emerald-300" />
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Moyenne d'argent / jour</p>
            <p className="text-xl font-bold">{formatDA(overallStats.avgEarningsPerDay)} DA</p>
          </div>
        </div>
        <div className="bg-slate-800 text-white p-4 rounded-2xl shadow-sm flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-emerald-300" />
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Moy. / jour</p>
            <p className="text-xl font-bold">{formatMinutesToHours(overallStats.avgPerDay)}</p>
          </div>
        </div>
        <div className="bg-slate-800 text-white p-4 rounded-2xl shadow-sm flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-sky-300" />
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Moy. / entrée</p>
            <p className="text-xl font-bold">{overallStats.totalDays > 0 ? formatMinutesToHours(overallStats.totalMinutes / overallStats.totalDays) : '0h 00m'}</p>
          </div>
        </div>
      </div>

      {/* Daily activity chart (last 14 days) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="bg-slate-800 text-white px-5 py-4 flex items-center gap-2.5">
          <BarChart3 className="text-emerald-400 w-5 h-5" />
          <h3 className="font-bold text-base">Activité des 14 derniers jours</h3>
          <span className="text-xs font-arabic bg-slate-700 text-emerald-300 px-2.5 py-1 rounded-lg">إحصائيات الأيام</span>
        </div>
        {dailyStats.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">Aucune donnée disponible</div>
        ) : (
          <div className="p-5 space-y-2.5">
            {dailyStats.map((d) => (
              <div key={d.date} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-28 shrink-0 capitalize">{formatDateReadable(d.date)}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-7 relative overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all flex items-center justify-end px-2"
                    style={{ width: `${(d.minutes / maxDailyMinutes) * 100}%` }}
                  >
                    <span className="text-[10px] text-white font-bold">{formatMinutesToHours(d.minutes)}</span>
                  </div>
                </div>
                <span className="text-xs text-slate-500 w-20 shrink-0 text-right">{d.workers} ouvrier(s)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-worker detailed stats */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="bg-slate-800 text-white px-5 py-4 flex items-center gap-2.5">
          <Users className="text-emerald-400 w-5 h-5" />
          <h3 className="font-bold text-base">Détail par Ouvrier</h3>
          <span className="text-xs font-arabic bg-slate-700 text-emerald-300 px-2.5 py-1 rounded-lg">تفاصيل كل عامل</span>
        </div>
        {workerStats.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">Aucun ouvrier inscrit</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Ouvrier</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Jours</th>
                  <th className="py-3 px-4">Heures</th>
                  <th className="py-3 px-4">Moy./jour</th>
                  <th className="py-3 px-4">Période</th>
                  <th className="py-3 px-4 text-right">Gains</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-sm">
                {workerStats.map((ws) => {
                  const isMonthly = ws.profile.payment_type === 'monthly';
                  const rate = ws.profile.custom_rate ?? defaultHourlyRate;
                  const displayEarnings = isMonthly ? ws.profile.custom_rate ?? 0 : ws.totalEarnings;
                  return (
                    <tr key={ws.profile.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-700">
                        {ws.profile.full_name || ws.profile.email}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isMonthly ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isMonthly ? 'Mensuel' : 'Heure'}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {isMonthly ? `${formatDA(rate)} DA/m` : `${formatDA(rate)} DA/h`}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-700">{ws.totalDays}</td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-700">{formatMinutesToHours(ws.totalMinutes)}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">{formatMinutesToHours(ws.avgMinutesPerDay)}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500">
                        {ws.firstDay ? `${formatDateReadable(ws.firstDay)} → ${formatDateReadable(ws.lastDay)}` : '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        {isMonthly ? (
                          <span className="text-xs text-sky-600 font-semibold">{formatDA(displayEarnings)} DA/m</span>
                        ) : (
                          <span className="font-extrabold text-emerald-700">{formatDA(displayEarnings)} DA</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
