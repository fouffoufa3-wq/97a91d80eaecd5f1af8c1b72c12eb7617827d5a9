import { useCallback, useState } from 'react';
import { ShieldCheck, Clock, LogOut } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { computeEntryEarnings, formatMinutesToHours } from '@/utils/calculations';
import AuthScreen from '@/components/AuthScreen';
import AppHeader from '@/components/AppHeader';
import WorkerDashboard from '@/components/WorkerDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import ClearModal from '@/components/ClearModal';
import Toast from '@/components/Toast';
import type { WorkEntry, WorkEntryWithProfile } from '@/lib/database-types';

export default function App() {
  const { session, profile, loading, signOut } = useAuth();
  const { toast, showToast } = useToast();
  const [clearOpen, setClearOpen] = useState(false);

  const handleExport = useCallback(async () => {
    const { data, error } = await supabase
      .from('work_entries')
      .select(profile?.role === 'admin' ? '*, profiles:profiles(full_name, email)' : '*')
      .order('entry_date', { ascending: false });
    if (error || !data || data.length === 0) {
      showToast('Aucune donnée à exporter !', 'error');
      return;
    }

    const { data: settings } = await supabase
      .from('app_settings')
      .select('hourly_rate')
      .eq('id', 1)
      .maybeSingle();
    const rate = settings?.hourly_rate ?? 250;

    const rows = data as unknown as (WorkEntry | WorkEntryWithProfile)[];
    const header = 'Ouvrier,Type,Date,Heure Entree,Heure Sortie,Pause (Min),Heures Travaillees,Heures Decimales,Tarif (DA),Gain du Jour (DA),Remarque\n';
    const csvRows = rows.map((e) => {
      const we = e as WorkEntry;
      const wpe = e as WorkEntryWithProfile;
      const worker = wpe.profiles?.full_name || wpe.profiles?.email || 'N/A';
      const pt = wpe.profiles?.payment_type ?? 'hourly';
      const cr = wpe.profiles?.custom_rate ?? null;
      const effRate = pt === 'monthly' ? (cr ?? 0) : (cr ?? rate);
      const decHours = (we.net_minutes / 60).toFixed(2);
      const gain = computeEntryEarnings(we.net_minutes, pt, cr, rate).toFixed(2);
      const cleanNote = (we.note || '').replace(/,/g, ' ');
      return [
        profile?.role === 'admin' ? worker : 'Moi',
        pt === 'monthly' ? 'Mensuel' : 'Heure',
        we.entry_date,
        we.check_in,
        we.check_out,
        we.break_mins,
        formatMinutesToHours(we.net_minutes),
        decHours,
        effRate,
        gain,
        cleanNote,
      ].join(',');
    }).join('\n');

    const csv = 'data:text/csv;charset=utf-8,\uFEFF' + header + csvRows;
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `pointage_khadmati_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Fichier CSV téléchargé !', 'success');
  }, [profile, showToast]);

  const handleClearConfirm = useCallback(async () => {
    let error: unknown = null;
    if (profile?.role === 'admin') {
      ({ error } = await supabase.from('work_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
    } else if (session?.user) {
      ({ error } = await supabase.from('work_entries').delete().eq('user_id', session.user.id));
    }
    if (error) {
      showToast('Erreur lors de la suppression', 'error');
    } else {
      showToast("Historique effacé.", 'info');
    }
    setClearOpen(false);
    setTimeout(() => window.location.reload(), 500);
  }, [profile, session, showToast]);

  if (loading) {
    return (
      <LoadingSpinner label="Connexion en cours..." />
    );
  }

  if (!session || !profile) {
    return (
      <>
        <AuthScreen />
        <Toast toast={toast} />
      </>
    );
  }

  const isAdmin = profile.role === 'admin';

  if (!isAdmin && !profile.approved) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-emerald-700 to-teal-800 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-slate-800 text-white px-6 py-8 text-center">
              <div className="bg-amber-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
              <h1 className="text-xl font-bold">En attente d'approbation</h1>
              <p className="text-xs font-arabic text-amber-300 mt-1">حسابك ما زال ما تقبلوش الأدمن</p>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-sm text-slate-600">
                Votre compte a été créé avec succès. Un administrateur doit approuver votre accès avant que vous puissiez utiliser l'application.
              </p>
              <p className="text-xs font-arabic text-slate-500">
                حسابك تخلق بنجاح. الأدمن لازم يقبلك باش تقدر تدخل للتطبيق. ارجع من بعد ولا اتصل بالمسؤول.
              </p>
              <button
                onClick={signOut}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-2 mx-auto"
              >
                <LogOut className="w-4 h-4" /> Se déconnecter (خرج)
              </button>
            </div>
          </div>
        </div>
        <Toast toast={toast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-slate-800 antialiased flex flex-col">
      <AppHeader
        profile={profile}
        isAdmin={isAdmin}
        onExport={handleExport}
        onOpenClear={() => setClearOpen(true)}
        onSignOut={signOut}
        showClear
      />

      {isAdmin ? (
        <AdminDashboard adminId={profile.id} />
      ) : (
        <WorkerDashboard
          userId={profile.id}
          profile={profile}
          onExport={handleExport}
        />
      )}

      <footer className="bg-white border-t border-slate-200/80 py-4 px-4 text-center text-xs text-slate-500 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Données synchronisées en ligne — accessibles depuis n'importe quel appareil.
          </p>
          <p className="font-arabic text-slate-600">مخدوم خصيصاً للعمال والحرفيين في الجزائر 🇩🇿</p>
        </div>
      </footer>

      <ClearModal open={clearOpen} onCancel={() => setClearOpen(false)} onConfirm={handleClearConfirm} />
      <Toast toast={toast} />
    </div>
  );
}
