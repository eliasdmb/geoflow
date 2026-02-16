import React, { useState, useEffect } from 'react';
import {
  Map as MapIcon,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Loader2,
  Key,
  WifiOff,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onLogin: () => void;
  onProgress?: (duration?: number) => () => void;
}

type AuthTab = 'login' | 'register' | 'forgot_password';

const Auth: React.FC<AuthProps> = ({ onLogin, onProgress }) => {
  console.log("Auth Component: Mounted");
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isConnectionError, setIsConnectionError] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);

  // Removed risky key check that was accessing private properties
  useEffect(() => {
    // Optional: Add strict mode checks or other harmless initializations here
  }, []);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });

  const extractAuthErrorMessage = (err: any): string => {
    if (!err) return 'Erro desconhecido';
    const message = err.message || err.error_description || String(err);

    if (message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('network error')) {
      setIsConnectionError(true);
      return 'Credenciais inválidas ou erro no servidor.';
    }

    if (message.includes('Invalid login credentials')) {
      return 'E-mail ou senha incorretos.';
    }

    if (message.includes('Rate limit exceeded')) {
      return 'Muitas tentativas. Aguarde um momento.';
    }

    return message;
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setSuccessMessage('Se houver uma conta com este e-mail, você receberá um link de recuperação.');
    } catch (err) {
      setError(extractAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isKeyValid) return;

    // Sanitization
    const sanitizedEmail = formData.email.trim().toLowerCase();
    const sanitizedName = formData.name.trim();

    // Rate Limiting Check
    if (lockoutTime && Date.now() < lockoutTime) {
      const waitTime = Math.ceil((lockoutTime - Date.now()) / 1000);
      setError(`Muitas tentativas. Tente novamente em ${waitTime} segundos.`);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsConnectionError(false);
    setIsLoading(true);
    const endProgress = onProgress ? onProgress() : () => { };

    try {
      if (activeTab === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password: formData.password,
        });

        if (authError) {
          setLoginAttempts(prev => {
            const newCount = prev + 1;
            if (newCount >= 5) {
              setLockoutTime(Date.now() + 60000); // 1 minute lockout
              return 0;
            }
            return newCount;
          });
          throw authError;
        }
        setLoginAttempts(0);
        onLogin();
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        const { error: authError } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password: formData.password,
          options: { data: { name: sanitizedName } }
        });
        if (authError) throw authError;
        setSuccessMessage('Conta criada! Verifique seu e-mail.');
        setActiveTab('login');
        setIsLoading(false);
      }
    } catch (err) {
      setError(extractAuthErrorMessage(err));
      setIsLoading(false);
    } finally {
      endProgress();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-bg-main relative overflow-hidden text-slate-main font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md p-4 relative z-10 animate-in fade-in zoom-in-95 duration-1000">
        <div className="text-center mb-10 group cursor-default">
          <div className="w-20 h-20 bg-secondary text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium transition-transform group-hover:scale-110 group-hover:rotate-3 duration-500">
            <MapIcon size={36} className="text-white animate-float" />
          </div>
          <h1 className="text-5xl font-heading font-black text-secondary tracking-tighter">
            MétricaAgro
          </h1>
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Agro Performance System</p>
            </div>
            <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">v2.5.0 Professional Edition</p>
          </div>
        </div>

        <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white transition-all shadow-premium">
          <div className="flex bg-slate-100 p-1 m-4 rounded-2xl">
            <button
              onClick={() => { setActiveTab('login'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'login' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Login
            </button>
            <button
              onClick={() => { setActiveTab('register'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'register' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Cadastrar
            </button>
          </div>

          <div className="p-8 pt-4 pb-10">
            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                <AlertCircle size={20} className="shrink-0" />
                <span className="text-[11px] font-medium leading-tight">{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 p-4 bg-primary/5 border border-primary/20 text-primary-dark rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                <CheckCircle2 size={20} className="shrink-0" />
                <span className="text-[11px] font-medium leading-tight">{successMessage}</span>
              </div>
            )}

            {isConnectionError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-rose-600">
                  <WifiOff size={16} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest">Conexão Pendente</span>
                </div>
                <p className="text-[10px] text-rose-500 font-medium leading-relaxed">
                  Não foi possível conectar ao banco de dados. Verifique sua conexão ou status do projeto.
                </p>
              </div>
            )}

            {activeTab === 'forgot_password' ? (
              <form onSubmit={handlePasswordReset} className="space-y-4 animate-in slide-in-from-right duration-300">
                <div className="text-center mb-6">
                  <h3 className="text-sm font-semibold text-slate-700">Recuperar Senha</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Informe seu e-mail para receber o link de redefinição.</p>
                </div>

                <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                  <label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">E-mail</label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors">
                      <Mail size={18} />
                    </div>
                    <input required type="email" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-medium" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="exemplo@gmail.com" />
                  </div>
                </div>

                <button
                  disabled={isLoading}
                  type="submit"
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/10 hover:bg-primary-dark transition-all flex items-center justify-center gap-3 mt-6 group/btn"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <span>Enviar Link</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="w-full text-center text-[10px] font-black text-slate-400 hover:text-primary transition-colors mt-4 uppercase tracking-widest"
                >
                  Voltar para Login
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 animate-in slide-in-from-left duration-300">
                {activeTab === 'register' && (
                  <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nome Completo</label>
                    <div className="relative group/input">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors">
                        <User size={18} />
                      </div>
                      <input required className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-medium" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Seu nome" />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">E-mail</label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors">
                      <Mail size={18} />
                    </div>
                    <input required type="email" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-medium" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="exemplo@gmail.com" />
                  </div>
                </div>

                <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                  <div className="flex items-center justify-between ml-2 mr-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Senha</label>
                    {activeTab === 'login' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('forgot_password')}
                        className="text-[9px] font-black text-primary hover:text-primary-dark transition-colors uppercase tracking-wider"
                      >
                        Esqueci a senha
                      </button>
                    )}
                  </div>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors">
                      <Lock size={18} />
                    </div>
                    <input required type="password" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-medium" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
                  </div>
                </div>

                {activeTab === 'register' && (
                  <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Confirmar Senha</label>
                    <div className="relative group/input">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors">
                        <Lock size={18} />
                      </div>
                      <input required type="password" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-medium" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="••••••••" />
                    </div>
                  </div>
                )}

                <button
                  disabled={isLoading}
                  type="submit"
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/10 hover:bg-primary-dark transition-all flex items-center justify-center gap-3 mt-6 group/btn"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <span>{activeTab === 'login' ? 'Entrar no Sistema' : 'Criar minha Conta'}</span>
                      <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em]">
          Powered by Métrica Agro • v2.1.0
        </p>
      </div>
    </div>
  );
};

export default Auth;
