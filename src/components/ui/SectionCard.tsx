import type { LucideIcon } from 'lucide-react';

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  arabicLabel?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ icon: Icon, title, arabicLabel, actions, children, className = '' }: SectionCardProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col ${className}`}>
      <div className="bg-slate-800 text-white px-5 py-4 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2.5">
          <Icon className="text-emerald-400 w-5 h-5" />
          <h3 className="font-bold text-base">{title}</h3>
          {arabicLabel && (
            <span className="text-xs font-arabic bg-slate-700 text-emerald-300 px-2.5 py-1 rounded-lg">{arabicLabel}</span>
          )}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
