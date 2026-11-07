import { Download, Trash2, Clock, LogOut } from 'lucide-react';
import type { Profile } from '@/lib/database-types';

interface AppHeaderProps {
  profile: Profile;
  isAdmin: boolean;
  onExport: () => void;
  onOpenClear: () => void;
  onSignOut: () => void;
  showClear: boolean;
}

export default function AppHeader({ profile, isAdmin, onExport, onOpenClear, onSignOut, showClear }: AppHeaderProps) {
  return (
    <header className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-lg sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
            <Clock className="w-6 h-6 text-emerald-100" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
              <span>Khadmati DZ</span>
              <span className={`text-xs font-normal px-2.5 py-0.5 rounded-full border ${
                isAdmin
                  ? 'bg-amber-500/80 text-white border-amber-400/30'
                  : 'bg-emerald-600/80 text-white border-emerald-400/30'
              }`}>
                {isAdmin ? 'Admin' : profile.payment_type === 'monthly' ? 'Ouvrier (Mensuel)' : 'Ouvrier'}
              </span>
            </h1>
            <p className="text-xs text-emerald-100/80">
              {profile.full_name || profile.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <button
            onClick={onExport}
            className="bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm px-3 py-2 rounded-xl transition flex items-center gap-2 border border-white/15 shadow-sm"
            title="Exporter CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exporter CSV</span>
          </button>
          {showClear && (
            <button
              onClick={onOpenClear}
              className="bg-rose-500/80 hover:bg-rose-600 text-white text-xs sm:text-sm px-3 py-2 rounded-xl transition flex items-center gap-2 shadow-sm"
              title="Tout effacer"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Réinitialiser</span>
            </button>
          )}
          <button
            onClick={onSignOut}
            className="bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm px-3 py-2 rounded-xl transition flex items-center gap-2 border border-white/15 shadow-sm"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}
