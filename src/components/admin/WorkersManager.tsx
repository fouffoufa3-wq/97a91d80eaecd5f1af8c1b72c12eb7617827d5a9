import { useState } from 'react';
import { UserCog, Info, Wallet, KeyRound, Pencil, UserMinus, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile, PaymentType } from '@/lib/database-types';
import { formatDA } from '@/utils/calculations';
import { useToast } from '@/hooks/useToast';
import { SectionCard } from '@/components/ui/SectionCard';

interface WorkersManagerProps {
  profiles: Profile[];
  adminId: string;
  defaultHourlyRate: number;
  onProfilesChanged: () => void;
  onEntriesChanged: () => void;
}

export function WorkersManager({ profiles, adminId, defaultHourlyRate, onProfilesChanged, onEntriesChanged }: WorkersManagerProps) {
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editType, setEditType] = useState<PaymentType>('hourly');
  const [editRate, setEditRate] = useState('');
  const [editNightRate, setEditNightRate] = useState('');
  const [resetPwdFor, setResetPwdFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [renamingFor, setRenamingFor] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [deletingFor, setDeletingFor] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const { showToast } = useToast();

  const handleRoleChange = async (uid: string, newRole: 'admin' | 'worker') => {
    if (uid === adminId) {
      showToast('Vous ne pouvez pas changer votre propre rôle', 'error');
      return;
    }
    const { error } = await supabase.rpc('set_user_role', { target_uid: uid, new_role: newRole });
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Rôle mis à jour !', 'success');
    onProfilesChanged();
  };

  const handleSavePayment = async (uid: string) => {
    const parsed = parseFloat(editRate);
    const rate = isNaN(parsed) || parsed < 0 ? null : parsed;
    const { error } = await supabase.rpc('set_worker_payment', {
      target_uid: uid,
      new_type: editType,
      new_rate: rate,
    });
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    if (editType === 'monthly') {
      const nightParsed = parseFloat(editNightRate);
      const { error: nightError } = await supabase.rpc('set_worker_night_rate', {
        target_uid: uid,
        new_rate: isNaN(nightParsed) || nightParsed < 0 ? null : nightParsed,
      });
      if (nightError) {
        showToast(nightError.message, 'error');
        return;
      }
    }
    showToast('Paramètres de paiement mis à jour !', 'success');
    setEditingPayment(null);
    onProfilesChanged();
    onEntriesChanged();
  };

  const handleApprove = async (uid: string) => {
    const { error } = await supabase.rpc('approve_user', { target_uid: uid });
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Utilisateur approuvé !', 'success');
    onProfilesChanged();
  };

  const handleResetPassword = async (uid: string) => {
    if (newPassword.length < 6) {
      showToast('Le mot de passe doit faire au moins 6 caractères', 'error');
      return;
    }
    setPwdSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-worker-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.session?.access_token}`,
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ targetUid: uid, newPassword }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        showToast(result.error || 'Erreur lors de la réinitialisation', 'error');
        setPwdSaving(false);
        return;
      }
      showToast('Mot de passe modifié avec succès !', 'success');
      setResetPwdFor(null);
      setNewPassword('');
    } catch {
      showToast('Erreur réseau', 'error');
    }
    setPwdSaving(false);
  };

  const handleRename = async (uid: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      showToast('Le nom ne peut pas être vide', 'error');
      return;
    }
    setRenameSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmed })
      .eq('id', uid);
    if (error) {
      showToast('Erreur lors du changement de nom', 'error');
      setRenameSaving(false);
      return;
    }
    showToast('Nom modifié !', 'success');
    setRenamingFor(null);
    setRenameSaving(false);
    onProfilesChanged();
    onEntriesChanged();
  };

  const handleDeleteWorker = async (uid: string) => {
    setDeleteSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-worker`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.session?.access_token}`,
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ targetUid: uid }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        showToast(result.error || 'Erreur lors de la suppression', 'error');
        setDeleteSaving(false);
        return;
      }
      showToast('Ouvrier supprimé avec succès', 'success');
      setDeletingFor(null);
      onProfilesChanged();
      onEntriesChanged();
    } catch {
      showToast('Erreur réseau', 'error');
    }
    setDeleteSaving(false);
  };

  const startEditPayment = (p: Profile) => {
    setEditingPayment(p.id);
    setEditType(p.payment_type);
    setEditRate(p.custom_rate != null ? String(p.custom_rate) : '');
    setEditNightRate(p.night_rate != null ? String(p.night_rate) : '');
  };

  return (
    <SectionCard icon={UserCog} title="Gestion des Utilisateurs" arabicLabel="إدارة المستخدمين">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4">Nom</th>
              <th className="py-3.5 px-4">Email</th>
              <th className="py-3.5 px-4">Rôle</th>
              <th className="py-3.5 px-4">Paiement</th>
              <th className="py-3.5 px-4">Tarif</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 text-sm">
            {profiles.map((p) => {
              const isEditing = editingPayment === p.id;
              return (
                <tr key={p.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-700">
                    {p.full_name || '(sans nom)'}
                    {p.role === 'worker' && !p.approved && (
                      <span className="ml-2 text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">En attente</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">{p.email}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      p.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {p.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {p.role === 'admin' ? (
                      <span className="text-xs text-slate-400">-</span>
                    ) : isEditing ? (
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as PaymentType)}
                        className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="hourly">Heure (بالساعة)</option>
                        <option value="monthly">Mensuel (شهرية)</option>
                      </select>
                    ) : (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        p.payment_type === 'monthly' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {p.payment_type === 'monthly' ? 'Mensuel' : 'Heure'}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {p.role === 'admin' ? (
                      <span className="text-xs text-slate-400">-</span>
                    ) : isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editRate}
                          min={0}
                          step={10}
                          onChange={(e) => setEditRate(e.target.value)}
                          placeholder={editType === 'monthly' ? 'DA/mois' : 'DA/h'}
                          className="w-24 text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="text-[10px] text-slate-400">{editType === 'monthly' ? 'DA/m' : 'DA/h'}</span>
                        {editType === 'monthly' && (
                          <input
                            type="number"
                            value={editNightRate}
                            min={0}
                            step={10}
                            onChange={(e) => setEditNightRate(e.target.value)}
                            placeholder="Prime nuit"
                            className="w-24 text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-700">
                        {p.payment_type === 'monthly'
                          ? p.custom_rate != null ? `${formatDA(p.custom_rate)} DA/mois` : 'Non défini'
                          : p.custom_rate != null ? `${formatDA(p.custom_rate)} DA/h` : `${formatDA(defaultHourlyRate)} DA/h (déf.)`}
                      </span>
                    )}
                    {!isEditing && p.role === 'worker' && p.payment_type === 'monthly' && (
                      <span className="block text-[10px] text-indigo-600 mt-0.5">
                        Nuit: {p.night_rate != null ? `${formatDA(p.night_rate)} DA` : 'Non défini'}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-center">
                    {p.id === adminId ? (
                      <span className="text-xs text-slate-400 flex items-center justify-center gap-1">
                        <Info className="w-3 h-3" /> Vous
                      </span>
                    ) : isEditing ? (
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          onClick={() => handleSavePayment(p.id)}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1.5 rounded-lg transition"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setEditingPayment(null)}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-2.5 py-1.5 rounded-lg transition"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : resetPwdFor === p.id ? (
                      <div className="flex flex-col gap-1.5 items-center">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Nouveau mot de passe"
                          minLength={6}
                          className="w-40 text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleResetPassword(p.id)}
                            disabled={pwdSaving}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                          >
                            {pwdSaving ? '...' : 'OK'}
                          </button>
                          <button
                            onClick={() => { setResetPwdFor(null); setNewPassword(''); }}
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-2.5 py-1.5 rounded-lg transition"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : !p.approved ? (
                      <div className="flex items-center gap-1.5 justify-center">
                        <button
                          onClick={() => handleApprove(p.id)}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                        >
                          <UserCheck className="w-3 h-3" /> Approuver
                        </button>
                      </div>
                    ) : renamingFor === p.id ? (
                      <div className="flex flex-col gap-1.5 items-center">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          placeholder="Nouveau nom"
                          className="w-40 text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRename(p.id)}
                            disabled={renameSaving}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                          >
                            {renameSaving ? '...' : 'OK'}
                          </button>
                          <button
                            onClick={() => { setRenamingFor(null); setRenameValue(''); }}
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-2.5 py-1.5 rounded-lg transition"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : deletingFor === p.id ? (
                      <div className="flex flex-col gap-1.5 items-center">
                        <span className="text-xs text-rose-600 font-semibold text-center">Supprimer cet ouvrier ?</span>
                        <span className="text-[10px] text-slate-500 text-center">Toutes ses données seront effacées</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteWorker(p.id)}
                            disabled={deleteSaving}
                            className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                          >
                            {deleteSaving ? '...' : 'Supprimer'}
                          </button>
                          <button
                            onClick={() => setDeletingFor(null)}
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-2.5 py-1.5 rounded-lg transition"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 justify-center flex-wrap">
                        <button
                          onClick={() => { setRenamingFor(p.id); setRenameValue(p.full_name || ''); }}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" /> Nom
                        </button>
                        <button
                          onClick={() => startEditPayment(p)}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                        >
                          <Wallet className="w-3 h-3" /> Tarif
                        </button>
                        <button
                          onClick={() => { setResetPwdFor(p.id); setNewPassword(''); }}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                        >
                          <KeyRound className="w-3 h-3" /> Mot de passe
                        </button>
                        <button
                          onClick={() => handleRoleChange(p.id, p.role === 'admin' ? 'worker' : 'admin')}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-lg transition"
                        >
                          {p.role === 'admin' ? 'Ouvrier' : 'Admin'}
                        </button>
                        {p.role === 'worker' && (
                          <button
                            onClick={() => setDeletingFor(p.id)}
                            className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                          >
                            <UserMinus className="w-3 h-3" /> Supprimer
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
