import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  arabicText?: string;
}

export function EmptyState({ icon: Icon, title, arabicText }: EmptyStateProps) {
  return (
    <div className="py-12 px-4 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-slate-700 font-bold text-base">{title}</h4>
      {arabicText && <p className="text-slate-500 text-xs font-arabic mt-1">{arabicText}</p>}
    </div>
  );
}
