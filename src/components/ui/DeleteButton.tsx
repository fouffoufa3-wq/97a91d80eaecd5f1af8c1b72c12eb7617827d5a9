import { useState } from 'react';
import { Trash2, X } from 'lucide-react';

interface DeleteButtonProps {
  onDelete: () => void;
  confirmLabel?: string;
}

export function DeleteButton({ onDelete, confirmLabel = 'Confirmer' }: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => { onDelete(); setConfirming(false); }}
          className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold px-2 py-1 rounded-lg transition"
        >
          {confirmLabel}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
