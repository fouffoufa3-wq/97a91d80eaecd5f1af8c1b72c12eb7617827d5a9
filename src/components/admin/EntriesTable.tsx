import { ListChecks, ArrowRight, StickyNote, Moon, CalendarX, Clock, Coffee, Wallet } from 'lucide-react';
import type { WorkEntryWithProfile } from '@/lib/database-types';
import { computeEntryEarnings, formatDA, formatDateReadable, formatMinutesToHours } from '@/utils/calculations';
import { SectionCard } from '@/components/ui/SectionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { DeleteButton } from '@/components/ui/DeleteButton';

interface EntriesTableProps {
  entries: WorkEntryWithProfile[];
  defaultHourlyRate: number;
  onDelete: (id: string) => void;
}

function EntryRow({ entry, defaultHourlyRate, onDelete }: { entry: WorkEntryWithProfile; defaultHourlyRate: number; onDelete: (id: string) => void }) {
  const pt = entry.profiles?.payment_type ?? 'hourly';
  const cr = entry.profiles?.custom_rate ?? null;
  const entryEarnings = computeEntryEarnings(entry.net_minutes, pt, cr, defaultHourlyRate);
  const workerName = entry.profiles?.full_name || entry.profiles?.email || 'Inconnu';

  return (
    <>
      {/* Desktop row */}
      <tr className="hover:bg-slate-50/80 transition hidden sm:table-row">
        <td className="py-3.5 px-4 whitespace-nowrap">
          <span className="font-semibold text-slate-700">{workerName}</span>
        </td>
        <td className="py-3.5 px-4 whitespace-nowrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pt === 'monthly' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {pt === 'monthly' ? 'Mensuel' : 'Heure'}
          </span>
        </td>
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
        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
          {entry.break_mins > 0 ? (
            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-medium">{entry.break_mins} min</span>
          ) : <span className="text-slate-400">-</span>}
        </td>
        <td className="py-3.5 px-4 whitespace-nowrap">
          <span className="font-bold text-slate-800">{formatMinutesToHours(entry.net_minutes)}</span>
          <span className="block text-[11px] text-slate-400">{(entry.net_minutes / 60).toFixed(2)} h</span>
        </td>
        <td className="py-3.5 px-4 whitespace-nowrap text-right">
          {pt === 'monthly' ? (
            <span className="text-xs text-sky-600 font-semibold">Mensuel</span>
          ) : (
            <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
              {formatDA(entryEarnings)} DA
            </span>
          )}
        </td>
        <td className="py-3.5 px-4 whitespace-nowrap text-center">
          <DeleteButton onDelete={() => onDelete(entry.id)} />
        </td>
      </tr>

      {/* Mobile card */}
      <tr className="sm:hidden">
        <td colSpan={8} className="py-3 px-4">
          <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bold text-slate-800 text-sm capitalize">{formatDateReadable(entry.entry_date)}</span>
                <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">{workerName}</span>
              </div>
              <DeleteButton onDelete={() => onDelete(entry.id)} />
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
              {entry.break_mins > 0 && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-medium">
                  <Coffee className="w-3 h-3" /> {entry.break_mins}min
                </span>
              )}
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
              <span className="text-sm font-bold text-slate-800">{formatMinutesToHours(entry.net_minutes)}</span>
              {pt === 'monthly' ? (
                <span className="text-xs text-sky-600 font-semibold flex items-center gap-1"><Wallet className="w-3 h-3" /> Mensuel</span>
              ) : (
                <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                  {formatDA(entryEarnings)} DA
                </span>
              )}
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

export function EntriesTable({ entries, defaultHourlyRate, onDelete }: EntriesTableProps) {
  return (
    <SectionCard icon={ListChecks} title="Toutes les Entrées" arabicLabel="كاع السوايع">
      {entries.length === 0 ? (
        <EmptyState icon={CalendarX} title="Aucune entrée" arabicText="ما كاين حتى نهار مسجل" />
      ) : (
        <div className="overflow-x-auto flex-grow">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-row">
                <th className="py-3.5 px-4">Ouvrier</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Horaires</th>
                <th className="py-3.5 px-4">Pause</th>
                <th className="py-3.5 px-4">Durée</th>
                <th className="py-3.5 px-4 text-right">Gain (DA)</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-sm">
              {entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} defaultHourlyRate={defaultHourlyRate} onDelete={onDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
