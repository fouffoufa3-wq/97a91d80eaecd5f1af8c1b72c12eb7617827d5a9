import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ label = 'Chargement...', fullScreen = true }: LoadingSpinnerProps) {
  return (
    <div className={`${fullScreen ? 'min-h-screen' : 'py-12'} flex flex-col items-center justify-center gap-3 text-slate-400`}>
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
