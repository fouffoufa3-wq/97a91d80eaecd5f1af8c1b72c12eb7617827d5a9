import { useState } from 'react';
import { CalendarPlus, Calendar, CalendarMinus, Moon, PlusCircle } from 'lucide-react';
import type { WorkerDayMark } from '@/lib/database-types';
import { getTodayDateString } from '@/utils/calculations';

type MarkKind = WorkerDayMark['kind'];

interface MonthlyMarkFormProps {
  onMark: (date: string, kind: MarkKind, note: string) => void;
}

const MARK_OPTIONS: { kind: MarkKind; label: string; icon: typeof Calendar; activeClass: string }[] = [
  { kind: 'absence_full', label: 'Absence (journée)', icon: CalendarMinus, activeClass: 'border-rose-300 bg-rose-50 text-rose-700' },
  { kind: 'absence_half', label: 'Absence (demi-journée)', icon: CalendarMinus, activeClass: 'border-amber-300 bg-amber-50 text-amber-700' },
  { kind: 'night', label: 'Travail de nuit', icon: Moon, activeClass: 'border-indigo-300 bg-indigo-50 text-indigo-700' },
];

export default function MonthlyMarkForm({ onMark }: MonthlyMarkFormProps) {
  const [date, setDate] = useState(getTodayDateString());
  const [kind, setKind] = useState<MarkKind>('absence_full');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onMark(date, kind, note.trim());
    setNote('');
  };

  return (
    <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      <div className="bg-slate-800 text-white px-5 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <CalendarPlus className="text-emerald-400 w-5 h-5" />
          <h3 className="font-bold text-base">Marquer un jour</h3>
        </div>
        <span className="text-xs font-arabic bg-slate-700 text-emerald-300 px-2.5 py-1 rounded-lg">تسجيل يوم</span>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 flex justify-between">
            <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Date du jour</span>
            <span className="font-arabic text-slate-500">التاريخ</span>
          </label>
          <input
            type="date"
            value={date}
            required
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="space-y-2">
          {MARK_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = kind === option.kind;
            return (
              <button
                key={option.kind}
                type="button"
                onClick={() => setKind(option.kind)}
                className={`w-full flex items-center gap-2.5 text-sm font-semibold py-2.5 px-3.5 rounded-xl border transition ${
                  active ? option.activeClass : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {option.label}
              </button>
            );
          })}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 flex justify-between">
            <span>Note</span>
            <span className="font-arabic text-slate-500">ملاحظة</span>
          </label>
          <textarea
            value={note}
            maxLength={300}
            rows={2}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: malade, rendez-vous..."
            className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Enregistrer (سجّل)</span>
        </button>
      </form>
    </div>
  );
}
