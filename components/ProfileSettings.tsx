import React, { useState, useEffect } from 'react';
import { User, Lock, Loader2, CheckCircle2, AlertCircle, ArrowRight, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProfileSettingsProps {
    onSuccess?: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onSuccess }) => {
    const { user, profile, updateProfile } = useAuth();
    const [name, setName] = useState(profile?.name || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const [profileError, setProfileError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const [profileSuccess, setProfileSuccess] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    useEffect(() => {
        if (profile?.name) setName(profile.name);
    }, [profile]);

    const handleUpdateName = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileError(null);
        setProfileSuccess(false);
        setIsSavingProfile(true);

        try {
            const { success, error } = await updateProfile({ name });
            if (!success) throw error;
            setProfileSuccess(true);
            setTimeout(() => setProfileSuccess(false), 3000);
        } catch (err: any) {
            setProfileError(err.message || 'Erro ao atualizar perfil.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(false);

        if (password !== confirmPassword) {
            setPasswordError('As senhas não coincidem.');
            return;
        }

        if (password.length < 6) {
            setPasswordError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setIsUpdatingPassword(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setPasswordSuccess(true);
            setPassword('');
            setConfirmPassword('');
            if (onSuccess) onSuccess();
            setTimeout(() => setPasswordSuccess(false), 3000);
        } catch (err: any) {
            setPasswordError(err.message || 'Erro ao atualizar senha.');
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-black text-secondary tracking-tighter uppercase">Minha Conta</h2>
                <p className="text-slate-500 font-medium">Gerencie suas informações de perfil e segurança.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Section */}
                <div className="bg-white rounded-[2rem] shadow-premium border border-slate-100/50 p-8 space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                            <User size={24} />
                        </div>
                        <h3 className="text-lg font-black text-secondary uppercase tracking-tight">Dados Pessoais</h3>
                    </div>

                    <form onSubmit={handleUpdateName} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nome Completo</label>
                            <input
                                required
                                type="text"
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all font-bold text-slate-700"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Seu nome"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">E-mail</label>
                            <input
                                disabled
                                type="email"
                                className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl outline-none text-sm text-slate-400 font-medium cursor-not-allowed"
                                value={user?.email || ''}
                            />
                        </div>

                        {profileError && (
                            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center gap-2 text-[11px] font-bold">
                                <AlertCircle size={14} />
                                {profileError}
                            </div>
                        )}

                        {profileSuccess && (
                            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center gap-2 text-[11px] font-bold">
                                <CheckCircle2 size={14} />
                                Nome atualizado com sucesso!
                            </div>
                        )}

                        <button
                            disabled={isSavingProfile}
                            type="submit"
                            className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-3 mt-4"
                        >
                            {isSavingProfile ? <Loader2 size={18} className="animate-spin" /> : (
                                <>
                                    <Save size={18} />
                                    <span>Salvar Alterações</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Password Section */}
                <div className="bg-white rounded-[2rem] shadow-premium border border-slate-100/50 p-8 space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                            <Lock size={24} />
                        </div>
                        <h3 className="text-lg font-black text-secondary uppercase tracking-tight">Segurança</h3>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nova Senha</label>
                            <input
                                required
                                type="password"
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all font-bold text-slate-700"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Confirmar Senha</label>
                            <input
                                required
                                type="password"
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all font-bold text-slate-700"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>

                        {passwordError && (
                            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center gap-2 text-[11px] font-bold">
                                <AlertCircle size={14} />
                                {passwordError}
                            </div>
                        )}

                        {passwordSuccess && (
                            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center gap-2 text-[11px] font-bold">
                                <CheckCircle2 size={14} />
                                Senha atualizada com sucesso!
                            </div>
                        )}

                        <button
                            disabled={isUpdatingPassword}
                            type="submit"
                            className="w-full py-4 bg-secondary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-secondary/20 hover:bg-secondary-dark transition-all flex items-center justify-center gap-3 mt-4"
                        >
                            {isUpdatingPassword ? <Loader2 size={18} className="animate-spin" /> : (
                                <>
                                    <ArrowRight size={18} />
                                    <span>Atualizar Senha</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
