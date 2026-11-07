import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MonthNavigatorProps {
  value: string;
  onChange: (v: string) => void;
  dark?: boolean;
}

function shiftMonth(ym: string, delta: number): string {
  if (!ym) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1 + delta).padStart(2, '0')}`;
  }
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function MonthNavigator({ value, onChange, dark = false }: MonthNavigatorProps) {
  const baseBtn = dark
    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
    : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200';

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(shiftMonth(value, -1))}
        className={`p-1.5 rounded-lg transition ${baseBtn}`}
        title="Mois précédent"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`text-xs rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          dark
            ? 'bg-slate-700 text-white border-slate-600'
            : 'bg-white text-slate-700 border-slate-200'
        }`}
      />
      <button
        onClick={() => onChange(shiftMonth(value, 1))}
        className={`p-1.5 rounded-lg transition ${baseBtn}`}
        title="Mois suivant"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      {value && (
        <button
          onClick={() => onChange('')}
          className={`p-1.5 rounded-lg transition ${baseBtn}`}
          title="Tout"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
