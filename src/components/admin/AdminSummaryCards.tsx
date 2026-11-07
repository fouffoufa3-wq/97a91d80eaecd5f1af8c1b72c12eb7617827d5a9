import { Coins, CalendarCheck, Clock, HandCoins, Users } from 'lucide-react';
import type { AppSettings } from '@/lib/database-types';
import { formatDA, formatMinutesToHours } from '@/utils/calculations';
import { useToast } from '@/hooks/useToast';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AdminSummaryCardsProps {
  settings: AppSettings | null;
  rateInput: string;
  setRateInput: (v: string) => void;
  totalDays: number;
  totalMinutes: number;
  totalEarnings: number;
  userCount: number;
}

export function AdminSummaryCards({
  settings, rateInput, setRateInput, totalDays, totalMinutes, totalEarnings, userCount,
}: AdminSummaryCardsProps) {
  const [rateSaving, setRateSaving] = useState(false);
  const { showToast } = useToast();

  const handleRateSave = async () => {
    setRateSaving(true);
    const parsed = parseFloat(rateInput);
    const newRate = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    const { error } = await supabase
      .from('app_settings')
      .update({ hourly_rate: newRate, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (error) {
      showToast('Erreur lors de la mise à jour du tarif', 'error');
      setRateSaving(false);
      return;
    }
    showToast('Tarif par défaut mis à jour !', 'success');
    setRateSaving(false);
  };

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center">
          <Coins className="w-8 h-8 text-amber-400/40" />
        </div>
        <div>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tarif par défaut</span>
            <span className="text-xs font-arabic font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">السومة الافتراضية</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <input
              type="number"
              value={rateInput}
              min={0}
              step={10}
              onChange={(e) => setRateInput(e.target.value)}
              className="w-full text-2xl font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
            <span className="text-sm font-bold text-slate-500 shrink-0">DA/h</span>
          </div>
        </div>
        <button
          onClick={handleRateSave}
          disabled={rateSaving}
          className="mt-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-lg transition disabled:opacity-50"
        >
          {rateSaving ? 'Sauvegarde...' : 'Enregistrer le tarif'}
        </button>
      </div>

      <SummaryCard
        icon={CalendarCheck}
        label="Total Jours"
        arabicLabel="الأيام"
        value={totalDays}
        unit="jours"
        iconColor="text-blue-400/40"
        iconBg="bg-blue-50"
        accentColor="text-blue-600"
        accentBg="bg-blue-50"
        footer={<span className="flex items-center gap-1"><Users className="w-3 h-3" /> {userCount} utilisateur(s)</span>}
      />
      <SummaryCard
        icon={Clock}
        label="Total Heures"
        arabicLabel="مجموع السوايع"
        value={formatMinutesToHours(totalMinutes)}
        iconColor="text-purple-400/40"
        iconBg="bg-purple-50"
        accentColor="text-purple-600"
        accentBg="bg-purple-50"
        footer={<>Équivalent: <span className="font-semibold text-purple-700">{(totalMinutes / 60).toFixed(2)}</span> h</>}
      />
      <SummaryCard
        icon={HandCoins}
        label="Total Gains"
        arabicLabel="مجموع الدراهم"
        value={formatDA(totalEarnings)}
        unit="DA"
        variant="gradient"
      />
    </section>
  );
}
