import { useState } from 'react';
import { CalendarPlus, Calendar, LogIn, LogOut, MessageCircle, PlusCircle, Moon, Wallet } from 'lucide-react';
import type { WorkEntry, PaymentType } from '@/lib/database-types';
import { calculateWorkedMinutes, formatDA, formatMinutesToHours, getTodayDateString } from '@/utils/calculations';

interface EntryFormProps {
  hourlyRate: number;
  paymentType: PaymentType;
  rateReadOnly: boolean;
  onAdd: (entry: Omit<WorkEntry, 'id' | 'user_id' | 'created_at'>) => void;
  onError: (msg: string) => void;
}

export default function EntryForm({ hourlyRate, paymentType, rateReadOnly, onAdd, onError }: EntryFormProps) {
  const [date, setDate] = useState(getTodayDateString());
  const [checkIn, setCheckIn] = useState('08:00');
  const [checkOut, setCheckOut] = useState('17:00');
  const [note, setNote] = useState('');

  const { netMinutes, isNightShift } = calculateWorkedMinutes(checkIn, checkOut, 0);
  const decimalHours = netMinutes / 60;
  const isMonthly = paymentType === 'monthly';
  const estimatedEarnings = isMonthly ? 0 : decimalHours * hourlyRate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = calculateWorkedMinutes(checkIn, checkOut, 0);
    if (result.netMinutes <= 0) {
      onError('La durée de travail doit être supérieure à 0 minute!');
      return;
    }
    onAdd({
      entry_date: date,
      check_in: checkIn,
      check_out: checkOut,
      break_mins: 0,
      net_minutes: result.netMinutes,
      is_night_shift: result.isNightShift,
      note: note.trim(),
    });
    setNote('');
  };

  return (
    <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      <div className="bg-slate-800 text-white px-5 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <CalendarPlus className="text-emerald-400 w-5 h-5" />
          <h3 className="font-bold text-base">Marquer une journée</h3>
        </div>
        <span className="text-xs font-arabic bg-slate-700 text-emerald-300 px-2.5 py-1 rounded-lg">تسجيل نهار جديد</span>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 flex justify-between">
            <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Date du jour</span>
            <span className="font-arabic text-slate-500">التاريخ</span>
          </label>
          <input
            type="date"
            value={date}
            required
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 flex justify-between">
              <span className="flex items-center"><LogIn className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Entrée</span>
              <span className="font-arabic text-slate-500">الدخلة</span>
            </label>
            <input
              type="time"
              value={checkIn}
              required
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 flex justify-between">
              <span className="flex items-center"><LogOut className="w-3.5 h-3.5 mr-1 text-rose-500" /> Sortie</span>
              <span className="font-arabic text-slate-500">الخرجة</span>
            </label>
            <input
              type="time"
              value={checkOut}
              required
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 flex justify-between">
            <span className="flex items-center"><MessageCircle className="w-3.5 h-3.5 mr-1 text-slate-400" /> Remarque (Optionnel)</span>
            <span className="font-arabic text-slate-500">ملاحظة</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Chantier Alger, Heures sup..."
            className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-2">
          <div className="flex justify-between items-center text-xs text-emerald-800 font-medium">
            <span>Aperçu du jour (حساب النهار):</span>
            {isNightShift && (
              <span className="text-[11px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold flex items-center">
                <Moon className="w-3 h-3 mr-1" />Service de nuit
              </span>
            )}
          </div>
          <div className="flex justify-between items-baseline pt-1 border-t border-emerald-200/60">
            <div>
              <span className="text-xs text-slate-500 block">Heures nettes:</span>
              <span className="text-lg font-extrabold text-slate-800">{formatMinutesToHours(netMinutes)}</span>
            </div>
            <div className="text-right">
              {isMonthly ? (
                <>
                  <span className="text-xs text-slate-500 block">Paiement:</span>
                  <span className="text-lg font-extrabold text-sky-600 flex items-center gap-1 justify-end">
                    <Wallet className="w-4 h-4" /> Mensuel
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-500 block">Gain estimé:</span>
                  <span className="text-lg font-extrabold text-emerald-700">{formatDA(estimatedEarnings)} DA</span>
                </>
              )}
            </div>
          </div>
          {rateReadOnly && (
            <p className="text-[11px] text-slate-400 border-t border-emerald-200/60 pt-2">
              {isMonthly ? (
                <>Salaire fixé par l'admin: <strong className="text-slate-600">{formatDA(hourlyRate)} DA/mois</strong></>
              ) : (
                <>Tarif fixé par l'admin: <strong className="text-slate-600">{formatDA(hourlyRate)} DA/h</strong></>
              )}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Enregistrer la journée (سجّل النهار)</span>
        </button>
      </form>
    </div>
  );
}
