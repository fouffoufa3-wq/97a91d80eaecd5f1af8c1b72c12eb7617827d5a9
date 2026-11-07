import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import type { ToastState } from '@/hooks/useToast';

interface ToastProps {
  toast: ToastState;
}

export default function Toast({ toast }: ToastProps) {
  if (!toast.visible) return null;

  const Icon = toast.type === 'error' ? AlertCircle : toast.type === 'info' ? Info : CheckCircle2;
  const color = toast.type === 'error' ? 'text-rose-400' : toast.type === 'info' ? 'text-blue-400' : 'text-emerald-400';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 transition-all duration-300">
      <Icon className={`w-5 h-5 ${color}`} />
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  );
}
