import { TriangleAlert } from 'lucide-react';

interface ClearModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ClearModal({ open, onCancel, onConfirm }: ClearModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4 mx-auto">
          <TriangleAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-center text-slate-800">Supprimer tout l'historique ?</h3>
        <p className="text-center text-sm text-slate-600 mt-2">
          Êtes-vous sûr de vouloir effacer toutes les journées enregistrées ? Cette action est irréversible.
        </p>
        <p className="text-center text-xs font-arabic text-rose-600 font-semibold mt-1">
          رايح تمحي كاع السوايع والأيام لي سجلتهم من قبل!
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
          >
            Annuler (لا)
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm shadow-md transition"
          >
            Oui, tout effacer (إيه، أمحي)
          </button>
        </div>
      </div>
    </div>
  );
}
