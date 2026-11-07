import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Trash2, Plus, CalendarX, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PaymentWithProfile, Profile, WorkEntryWithProfile, WorkerDayMark } from '@/lib/database-types';
import { computeAllTimeEarnings, formatDA, formatDateReadable, getTodayDateString } from '@/utils/calculations';
import { useToast } from '@/hooks/useToast';

interface PaymentsViewProps {
  entries: WorkEntryWithProfile[];
  marks: WorkerDayMark[];
  profiles: Profile[];
  defaultHourlyRate: number;
}

interface WorkerBalance {
  profile: Profile;
  earned: number;
  paid: number;
  balance: number;
}

export default function PaymentsView({ entries, marks, profiles, defaultHourlyRate }: PaymentsViewProps) {
  const [payments, setPayments] = useState<PaymentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formWorker, setFormWorker] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formNote, setFormNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const fetchPayments = useCallback(async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*, profiles:profiles!payments_worker_id_fkey(full_name, email)')
      .order('payment_date', { ascending: false });
    if (error) {
      showToast('Erreur lors du chargement des paiements', 'error');
      return;
    }
    setPayments((data as PaymentWithProfile[]) || []);
  }, [showToast]);

  useEffect(() => {
    fetchPayments().finally(() => setLoading(false));
  }, [fetchPayments]);

  const workers = useMemo(() => profiles.filter((p) => p.role === 'worker'), [profiles]);

  const workerBalances = useMemo<WorkerBalance[]>(() => {
    const today = getTodayDateString();
    return workers.map((profile) => {
      const earned = computeAllTimeEarnings({
        paymentType: profile.payment_type,
        customRate: profile.custom_rate,
        nightRate: profile.night_rate,
        createdAt: profile.created_at,
        suspension: { from: profile.pay_suspended_from, to: profile.pay_suspended_to },
        marks: marks.filter((m) => m.worker_id === profile.id),
        entries: entries.filter((e) => e.user_id === profile.id),
        defaultHourlyRate,
        today,
      });
      const paid = payments
        .filter((p) => p.worker_id === profile.id)
        .reduce((sum, p) => sum + Number(p.amount), 0);
      return { profile, earned, paid, balance: earned - paid };
    });
  }, [workers, entries, marks, payments, defaultHourlyRate]);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalEarnedAll = workerBalances.reduce((sum, wb) => sum + wb.earned, 0);
  const totalBalance = totalEarnedAll - totalPaid;

  const handleAddPayment = useCallback(async () => {
    const amount = parseFloat(formAmount);
    if (!formWorker) {
      showToast('Sélectionnez un ouvrier', 'error');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      showToast('Montant invalide', 'error');
      return;
    }
    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const { error } = await supabase.from('payments').insert({
      worker_id: formWorker,
      amount,
      payment_date: formDate,
      note: formNote,
      recorded_by: sessionData.session?.user?.id ?? null,
    });
    if (error) {
      showToast(error.message, 'error');
      setSaving(false);
      return;
    }
    showToast('Paiement enregistré !', 'success');
    setShowForm(false);
    setFormWorker('');
    setFormAmount('');
    setFormNote('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setSaving(false);
    fetchPayments();
  }, [formWorker, formAmount, formDate, formNote, showToast, fetchPayments]);

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) {
      showToast('Erreur lors de la suppression', 'error');
      return;
    }
    showToast('Paiement supprimé', 'info');
    fetchPayments();
  }, [showToast, fetchPayments]);

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-slate-400">Chargement...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-emerald-400/40" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Gagné</span>
            <span className="block text-xs font-arabic font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 w-fit">مجموع لي يستاهلو</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 mt-2">{formatDA(totalEarnedAll)} <span className="text-sm text-slate-500">DA</span></h2>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
            <Banknote className="w-8 h-8 text-blue-400/40" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Versé</span>
            <span className="block text-xs font-arabic font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mt-1 w-fit">مجموع لي خلصتهم</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 mt-2">{formatDA(totalPaid)} <span className="text-sm text-slate-500">DA</span></h2>
        </div>

        <div className={`p-5 rounded-2xl shadow-sm border flex flex-col justify-between relative overflow-hidden ${totalBalance > 0 ? 'bg-gradient-to-br from-rose-500 to-rose-700 text-white border-rose-600' : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-700'}`}>
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
            <Wallet className="w-8 h-8 text-white/20" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider opacity-90">{totalBalance > 0 ? 'Reste à Payer' : 'Solde Net'}</span>
            <span className="block text-xs font-arabic font-semibold bg-white/15 px-2 py-0.5 rounded-md mt-1 w-fit">مزال ما خلصناه</span>
          </div>
          <h2 className="text-2xl font-extrabold mt-2">{formatDA(Math.abs(totalBalance))} <span className="text-sm opacity-80">DA</span></h2>
        </div>
      </section>

      {/* Per-worker balances */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="bg-slate-800 text-white px-5 py-4 flex items-center gap-2.5">
          <Wallet className="text-emerald-400 w-5 h-5" />
          <h3 className="font-bold text-base">Solde par Ouvrier</h3>
          <span className="text-xs font-arabic bg-slate-700 text-emerald-300 px-2.5 py-1 rounded-lg">حساب كل خدام</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ouvrier</th>
                <th className="py-3.5 px-4 text-right">Gagné</th>
                <th className="py-3.5 px-4 text-right">Versé</th>
                <th className="py-3.5 px-4 text-right">Reste</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-sm">
              {workerBalances.map((wb) => (
                <tr key={wb.profile.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-700">
                    {wb.profile.full_name || wb.profile.email}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-right font-semibold text-emerald-700">
                    {formatDA(wb.earned)} DA
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-right font-semibold text-blue-700">
                    {formatDA(wb.paid)} DA
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <span className={`font-extrabold px-2.5 py-1 rounded-lg ${
                      wb.balance > 0
                        ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    }`}>
                      {formatDA(Math.abs(wb.balance))} DA
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => {
                        setFormWorker(wb.profile.id);
                        setFormAmount(wb.balance > 0 ? String(Math.round(wb.balance)) : '');
                        setFormDate(new Date().toISOString().slice(0, 10));
                        setFormNote('');
                        setShowForm(true);
                      }}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 mx-auto"
                    >
                      <Plus className="w-3 h-3" /> Payer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add payment form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" /> Nouveau Paiement
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-sm">Annuler</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Ouvrier</label>
              <select
                value={formWorker}
                onChange={(e) => setFormWorker(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Choisir --</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>{w.full_name || w.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Montant (DA)</label>
              <input
                type="number"
                value={formAmount}
                min={0}
                step={100}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Note</label>
              <input
                type="text"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="Optionnel"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <button
            onClick={handleAddPayment}
            disabled={saving}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {saving ? 'Enregistrement...' : 'Enregistrer le paiement'}
          </button>
        </div>
      )}

      {/* Payment history */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="bg-slate-800 text-white px-5 py-4 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2.5">
            <Banknote className="text-emerald-400 w-5 h-5" />
            <h3 className="font-bold text-base">Historique des Paiements</h3>
            <span className="text-xs font-arabic bg-slate-700 text-emerald-300 px-2.5 py-1 rounded-lg">سجل الخلاص</span>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Ajouter
            </button>
          )}
        </div>

        {payments.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <CalendarX className="w-7 h-7" />
            </div>
            <h4 className="text-slate-700 font-bold text-base">Aucun paiement enregistré</h4>
            <p className="text-slate-500 text-xs font-arabic mt-1">ما كاين حتى خلاص مسجل</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Ouvrier</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Montant</th>
                  <th className="py-3.5 px-4">Note</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-sm">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-700">
                      {p.profiles?.full_name || p.profiles?.email || 'Inconnu'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-800 capitalize">
                      {formatDateReadable(p.payment_date)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <span className="font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
                        {formatDA(Number(p.amount))} DA
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                      {p.note || <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
