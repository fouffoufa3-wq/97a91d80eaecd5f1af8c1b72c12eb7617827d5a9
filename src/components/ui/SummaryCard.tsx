import type { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  arabicLabel?: string;
  value: string | number;
  unit?: string;
  iconColor?: string;
  iconBg?: string;
  accentColor?: string;
  accentBg?: string;
  footer?: React.ReactNode;
  variant?: 'default' | 'gradient';
}

export function SummaryCard({
  icon: Icon,
  label,
  arabicLabel,
  value,
  unit,
  iconColor = 'text-slate-400/40',
  iconBg = 'bg-slate-50',
  accentColor = 'text-slate-600',
  accentBg = 'bg-slate-100',
  footer,
  variant = 'default',
}: SummaryCardProps) {
  const isGradient = variant === 'gradient';

  return (
    <div className={`p-5 rounded-2xl shadow-sm border flex flex-col justify-between relative overflow-hidden ${
      isGradient
        ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-700'
        : 'bg-white border-slate-200/80'
    }`}>
      <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full flex items-center justify-center ${isGradient ? 'bg-white/10' : iconBg}`}>
        <Icon className={`w-8 h-8 ${isGradient ? 'text-white/20' : iconColor}`} />
      </div>
      <div>
        <div className="flex justify-between items-start">
          <span className={`text-xs font-semibold uppercase tracking-wider ${isGradient ? 'text-emerald-100' : 'text-slate-400'}`}>{label}</span>
          {arabicLabel && (
            <span className={`text-xs font-arabic font-semibold px-2 py-0.5 rounded-md ${isGradient ? 'text-emerald-950 bg-emerald-300' : `${accentColor} ${accentBg}`}`}>
              {arabicLabel}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className={`text-3xl font-extrabold ${isGradient ? 'text-white' : 'text-slate-800'}`}>{value}</span>
          {unit && <span className={`text-sm font-bold ${isGradient ? 'text-emerald-200' : 'text-slate-500'}`}>{unit}</span>}
        </div>
      </div>
      {footer && <div className={`mt-2 text-xs ${isGradient ? 'text-emerald-100' : 'text-slate-500'}`}>{footer}</div>}
    </div>
  );
}
