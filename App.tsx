import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  Users,
  Map as MapIcon,
  UserRound,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Landmark,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ServerCrash,
  FileCheck,
  FileText,
  WifiOff,
  Wrench
} from 'lucide-react';
import {
  ViewState,
  Project,
  Client,
  RuralProperty,
  Professional,
  ProjectStatus,
  WorkflowStepId,
  SigefCertification,
  Service,
  BudgetItemTemplate,
  Registry,
  FinancialTransaction,
  Appointment,
  CreditCard,
  CreditCardExpense,
  Account,
  TransactionType
} from './types';
import { WORKFLOW_STEPS_DEFINITION, CAR_WORKFLOW_STEPS_DEFINITION } from './constants';
import { supabase, checkSupabaseConnection } from './lib/supabase';
import Dashboard from './components/Dashboard';
import ProjectManagement from './components/ProjectManagement';
import ProjectWorkflow from './components/ProjectWorkflow';
import ClientList from './components/ClientList';
import PropertyList from './components/PropertyList';
import ProfessionalList from './components/ProfessionalList';
import RegistryList from './components/RegistryList';
import ServiceList from './components/ServiceList';
import BudgetItemTemplateList from './components/BudgetItemTemplateList';
import SigefCertificationList from './components/SigefCertificationList';
import FinancialModule from './components/FinancialModule';
import CalendarView from './components/CalendarView';
import FinancialReport from './components/FinancialReport';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import AppRouter from './components/AppRouter';
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';

import { useAuth } from './contexts/AuthContext';
import ProfileSettings from './components/ProfileSettings';
import ProtectedRoute from './components/ProtectedRoute';
import { logAudit } from './lib/audit';
import { computeNextProjectNumber } from './utils';
import ProgressBar from './components/ProgressBar';

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info' | 'whatsapp' | 'alert';
  id: number;
}

const App: React.FC = () => {
  const { user, profile, loading: authLoading, logout, role, isPasswordRecovery } = useAuth();
  console.log("App Render: State Check", {
    hasUser: !!user,
    userEmail: user?.email,
    authLoading,
    role
  });
  console.log("App: Current role for AppRouter:", role);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isConnectionError, setIsConnectionError] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [actionProgress, setActionProgress] = useState(0);
  const [showLanding, setShowLanding] = useState(true);

  const simulateProgress = useCallback((duration = 800) => {
    setActionProgress(10);
    const interval = setInterval(() => {
      setActionProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, duration / 10);
    return () => {
      clearInterval(interval);
      setActionProgress(100);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setShowLanding(true);
    }
  }, [user]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<RuralProperty[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [registries, setRegistries] = useState<Registry[]>([]);
  const [sigefCertifications, setSigefCertifications] = useState<SigefCertification[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [budgetItemTemplates, setBudgetItemTemplates] = useState<BudgetItemTemplate[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [creditCardExpenses, setCreditCardExpenses] = useState<CreditCardExpense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  // Initialize sidebar based on window width if available, otherwise default to true (desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [dbError, setDbError] = useState<string | null>(null);

  const userIdRef = useRef<string | null>(null);

  const extractErrorMessage = (err: any): string => {
    if (!err) return 'Erro desconhecido';
    if (typeof err === 'string') return err;
    const message = err.message || err.error_description || String(err);
    if (message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('network error') || message.toLowerCase().includes('load failed')) {
      return 'Erro de Conexão: O servidor Supabase não respondeu. Provavelmente o projeto foi pausado.';
    }
    return message;
  };

  const showNotification = useCallback((message: any, type: 'success' | 'error' | 'info' | 'whatsapp' | 'alert' = 'success') => {
    const id = Date.now();
    const cleanMessage = extractErrorMessage(message);
    setNotifications(prev => [...prev, { message: cleanMessage, type, id }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 8000);
  }, []);

  const fetchInitialData = useCallback(async (uid: string) => {
    console.log("App: Starting fetchInitialData for", uid);
    const endProgress = simulateProgress();
    // Only set loading=true on initial load to avoid unmounting components
    if (initialLoad) setLoading(true);
    setDbError(null);
    setIsConnectionError(false);
    userIdRef.current = uid;
    let appointmentsData: Appointment[] = [];

    // Safety timeout to prevent permanent hang
    const safetyTimeout = setTimeout(() => {
      console.warn("App: fetchInitialData safety timeout reached");
      setLoading(false);
      endProgress();
    }, 15000);

    try {
      console.log("App: Fetching initial data...");

      // Removed blocking connection check to speed up load time. 
      // Network errors will be caught by the catch block below.

      const [{ data: pData, error: pError }, { data: cData, error: cError }] = await Promise.all([
        supabase.from('projects').select('*, steps:project_steps(*)').eq('user_id', uid).order('updated_at', { ascending: false }),
        supabase.from('clients').select('*').eq('user_id', uid).order('name')
      ]);

      if (pError) throw pError;
      if (cError) {
        setDbError(extractErrorMessage(cError));
      }

      setProjects(pData?.map(p => ({ ...p, steps: Array.isArray(p.steps) ? [...p.steps].sort((a: any, b: any) => a.step_id - b.step_id) : [] })) || []);
      setClients(cData || []);

      // Liberar o carregamento inicial assim que os dados críticos (projetos e clientes) estiverem prontos
      setLoading(false);
      setInitialLoad(false);
      endProgress();
      clearTimeout(safetyTimeout);

      // Carregar o restante dos dados em segundo plano (background) para não travar o login
      const fetchSecondaryData = async () => {
        try {
          const [
            financialTransactionsResponse,
            propertiesResponse,
            professionalsResponse,
            registriesResponse,
            servicesResponse,
            budgetItemTemplatesResponse,
            sigefCertificationsResponse,
            appointmentsResponse,
            creditCardsResponse,
            creditCardExpensesResponse,
            accountsResponse
          ] = await Promise.all([
            supabase.from('financial_transactions').select('*').eq('user_id', uid).order('due_date', { ascending: false }),
            supabase.from('properties').select('*').eq('user_id', uid),
            supabase.from('professionals').select('*').eq('user_id', uid),
            supabase.from('registries').select('*').eq('user_id', uid),
            supabase.from('services').select('*').eq('user_id', uid),
            supabase.from('budget_templates').select('*').eq('user_id', uid),
            supabase.from('sigef_certifications').select('*').eq('user_id', uid),
            supabase.from('appointments').select('*').eq('user_id', uid),
            supabase.from('credit_cards').select('*').eq('user_id', uid),
            supabase.from('credit_card_expenses').select('*').eq('user_id', uid),
            supabase.from('accounts').select('*').eq('user_id', uid)
          ]);

          setTransactions(financialTransactionsResponse.data || []);
          setProperties(propertiesResponse.data || []);
          setProfessionals(professionalsResponse.data || []);
          setRegistries(registriesResponse.data || []);
          setServices(servicesResponse.data || []);
          setBudgetItemTemplates(budgetItemTemplatesResponse.data || []);
          setSigefCertifications(sigefCertificationsResponse.data || []);
          const appointmentsData = appointmentsResponse.data || [];
          setAppointments(appointmentsData);
          setCreditCards(creditCardsResponse.data || []);
          setCreditCardExpenses(creditCardExpensesResponse.data || []);
          setAccounts(accountsResponse.data || []);

          // Notificações de compromissos
          const hasNotifiedRef = (window as any)._hasNotifiedToday;
          if (!hasNotifiedRef && appointmentsData.length > 0) {
            const today = new Date().toDateString();
            const todayApps = appointmentsData.filter(a => new Date(a.start_time).toDateString() === today && a.status !== 'cancelled' && a.status !== 'completed');
            if (todayApps.length > 0) {
              showNotification(`Você tem ${todayApps.length} ${todayApps.length === 1 ? 'compromisso agendado' : 'compromissos agendados'} para hoje!`, 'alert');
              (window as any)._hasNotifiedToday = true;
            }
          }
        } catch (err) {
          console.error("App: Error fetching background data:", err);
        }
      };

      fetchSecondaryData();

    } catch (err: any) {
      console.error("App: fetchInitialData error:", err);
      const msg = extractErrorMessage(err);
      if (msg.includes('Erro de Conexão')) {
        setIsConnectionError(true);
      } else {
        setDbError(msg);
      }
      setLoading(false);
      setInitialLoad(false);
      endProgress();
      clearTimeout(safetyTimeout);
    }
  }, [simulateProgress, showNotification]);

  useEffect(() => {
    if (user) {
      fetchInitialData(user.id);
    } else {
      setLoading(false);
    }
  }, [user, fetchInitialData]);

  // Mobile detection and responsive behavior
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  const updateProjectStep = async (stepDbId: string, projectId: string, newStatus: ProjectStatus, notes?: string, document_number?: string) => {
    const endProgress = simulateProgress();
    const uid = userIdRef.current;
    if (!uid) return;

    try {
      const updateData: any = {
        status: newStatus,
        notes,
        completed_at: newStatus === ProjectStatus.COMPLETED ? new Date().toISOString() : null
      };
      if (document_number) updateData.document_number = document_number;

      // Audit Log for Approval
      if (newStatus === ProjectStatus.COMPLETED) {
        logAudit('Aprovação de Fluxo', 'project_steps', stepDbId, null, updateData);
      }

      const { error: stepError } = await supabase.from('project_steps').update(updateData).eq('id', stepDbId);
      if (stepError) throw stepError;

      const project = projects.find(p => p.id === projectId);
      if (project) {
        const updatedSteps = project.steps?.map(s =>
          s.id === stepDbId ? { ...s, status: newStatus } : s
        ) || [];

        const firstIncompleteIndex = updatedSteps.findIndex(s => s.status !== ProjectStatus.COMPLETED);
        const newFrontierIndex = firstIncompleteIndex === -1
          ? WORKFLOW_STEPS_DEFINITION.length - 1
          : firstIncompleteIndex;

        if (newFrontierIndex !== project.current_step_index) {
          await supabase.from('projects').update({
            current_step_index: newFrontierIndex,
            updated_at: new Date().toISOString()
          }).eq('id', projectId).eq('user_id', uid);
        } else {
          await supabase.from('projects').update({
            updated_at: new Date().toISOString()
          }).eq('id', projectId).eq('user_id', uid);
        }

        if (newStatus === ProjectStatus.COMPLETED) {
          showNotification("Etapa concluída!", "success");
        } else if (newStatus === ProjectStatus.WAITING_APPROVAL) {
          showNotification("Solicitação de aprovação enviada!", "info");
        }
      }

      await fetchInitialData(uid);
    } catch (err: any) {
      showNotification(`Falha ao atualizar: ${extractErrorMessage(err)}`, 'error');
    } finally {
      endProgress();
    }
  };

  const handleUpsert = async (table: string, data: any, fetchFn: (uid: string) => Promise<any>, id?: string) => {
    const endProgress = simulateProgress();
    const uid = userIdRef.current;
    if (!uid) { showNotification("Sessão expirada. Faça login novamente.", "error"); endProgress(); return; }

    // RBAC check for financial changes
    if ((table === 'financial_transactions' || table === 'credit_cards' || table === 'credit_card_expenses') && role !== 'admin' && id) {
      showNotification("Apenas administradores podem alterar dados financeiros existentes.", "error");
      return;
    }

    try {
      const { steps, created_at, updated_at, id: dataId, ...rawData } = data;

      // Convert empty strings to null for UUID fields (ending with _id)
      const sanitizedData = { ...rawData };
      Object.keys(sanitizedData).forEach(key => {
        if (key.endsWith('_id') && sanitizedData[key] === '') {
          sanitizedData[key] = null;
        }
      });

      let cleanData = sanitizedData;

      if (table === 'accounts') {
        cleanData = {
          ...rawData,
          initial_balance: parseFloat(rawData.initial_balance)
        };
      }

      // Special handling for TRANSFER type financial transactions
      if (table === 'financial_transactions' && rawData.type === TransactionType.TRANSFER) {
        if (id) {
          showNotification("Atualização de transferências não suportada diretamente. Exclua e recrie.", "error");
          endProgress();
          return;
        }

        const { from_account_id, to_account_id, amount, description, due_date, status, ...restOfData } = rawData;

        // Create the expense transaction (debit from from_account_id)
        const expensePayload = {
          ...restOfData,
          user_id: uid,
          type: TransactionType.EXPENSE,
          amount: parseFloat(String(amount)),
          description: `Transferência enviada para ${to_account_id}: ${description}`,
          account: from_account_id,
          due_date: due_date,
          status: status,
          category: 'Transferência Enviada'
        };
        const { error: expenseError } = await supabase.from('financial_transactions').insert(expensePayload);
        if (expenseError) throw expenseError;

        // Create the income transaction (credit to to_account_id)
        const incomePayload = {
          ...restOfData,
          user_id: uid,
          type: TransactionType.INCOME,
          amount: parseFloat(String(amount)),
          description: `Transferência recebida de ${from_account_id}: ${description}`,
          account: to_account_id,
          due_date: due_date,
          status: status,
          category: 'Transferência Recebida'
        };
        const { error: incomeError } = await supabase.from('financial_transactions').insert(incomePayload);
        if (incomeError) throw incomeError;

        showNotification("Transferência realizada com sucesso!", "success");
        fetchInitialData(uid);
        endProgress();
        return;
      }

      const payload = { ...cleanData, user_id: uid };
      if (id) {
        // Audit log for financial changes
        if (table === 'financial_transactions' || table === 'credit_cards' || table === 'credit_card_expenses') {
          logAudit('Alteração Financeira', table, id, null, payload);
        }

        const { error } = await supabase.from(table).update(payload).eq('id', id).eq('user_id', uid);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(payload);
        if (error) throw error;
      }
      showNotification("Dados salvos com sucesso!");
      fetchInitialData(uid);
    } catch (err: any) {
      if (err?.code === '42703') {
        showNotification("Erro de Banco: Novos campos detectados. Por favor, execute o SQL no painel Supabase para habilitar novos campos (Data da Certificação, ART, etc.).", "alert");
      } else {
        showNotification(`Falha ao salvar: ${extractErrorMessage(err)}`, 'error');
      }
    } finally {
      endProgress();
    }
  };

  const handleDelete = async (table: string, id: string) => {
    const endProgress = simulateProgress();
    const uid = userIdRef.current;
    if (!uid) { endProgress(); return; }

    // RBAC check for deletion
    // Temporarily disabled for project deletion debugging
    if (table !== 'projects' && role !== 'admin') {
      showNotification("Apenas administradores podem excluir registros.", "error");
      return;
    }

    try {
      // Audit Log for deletion
      logAudit('Exclusão de Registro', table, id);

      if (table === 'projects') {
        // Manual cleanup of dependencies for better robustness
        // Even with CASCADE DELETE migration, this helps ensures frontend consistency
        await supabase.from('project_steps').delete().eq('project_id', id).eq('user_id', uid);
        await supabase.from('appointments').delete().eq('project_id', id).eq('user_id', uid);
        await supabase.from('financial_transactions').delete().eq('project_id', id).eq('user_id', uid);
        await supabase.from('credit_card_expenses').delete().eq('project_id', id).eq('user_id', uid);
      }

      const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', uid);
      if (error) throw error;
      showNotification("Removido com sucesso.");
      fetchInitialData(uid);
    } catch (err: any) {
      showNotification(`Falha ao excluir: ${extractErrorMessage(err)}`, 'error');
    } finally {
      endProgress();
    }
  };

  if (isConnectionError) return (
    <div className="h-screen w-full flex items-center justify-center bg-bg-main p-6">
      <div className="glass-card p-10 rounded-[2.5rem] max-w-md w-full text-center animate-in zoom-in-95 duration-700">
        <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-premium animate-float">
          <WifiOff size={44} />
        </div>
        <h2 className="text-3xl font-heading font-black text-slate-main mb-4 tracking-tighter">Erro de Conexão</h2>
        <p className="text-slate-muted font-medium leading-relaxed mb-10 text-sm">
          Não conseguimos estabelecer uma ligação com o banco de dados.
          <span className="block mt-2 text-rose-500 font-bold">Verifique sua conexão ou se o projeto no Supabase está ativo.</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-main rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-all duration-300">Supabase</a>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-premium hover:bg-primary-dark transition-all duration-300 active:scale-95"
          >
            <RefreshCw size={14} className="animate-spin-slow" /> Tentar Agora
          </button>
        </div>
      </div>
    </div>
  );

  // Handle password recovery flow
  if (isPasswordRecovery) {
    return <ProfileSettings onSuccess={() => window.location.href = '/'} />;
  }

  if (authLoading || (user && loading && initialLoad)) return (
    <div className="h-screen w-full flex items-center justify-center bg-bg-main">
      <div className="text-center group">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="relative flex items-center justify-center w-full h-full bg-white rounded-3xl shadow-premium border border-primary/10 transition-transform group-hover:scale-110 duration-500">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        </div>
        <h3 className="text-[10px] text-slate-muted font-semibold uppercase tracking-[0.4em] animate-pulse">Sincronizando MetricaAgro</h3>
        <p className="mt-2 text-[9px] text-primary font-medium uppercase tracking-widest opacity-60">Preparando Workspace</p>
      </div>
    </div>
  );

  if (!user && showLanding) return <LandingPage onEnterApp={() => setShowLanding(false)} />;
  if (!user) return <Auth onLogin={() => { }} onProgress={simulateProgress} />;

  const currentProject = projects.find(p => p.id === selectedProjectId);

  const addProject = async (title: string, clientId: string, propertyId: string, professionalId: string, serviceId: string, registryId: string, deadline?: string, certificationNumber?: string, certificationDate?: string, artNumber?: string): Promise<boolean> => {
    const uid = userIdRef.current;
    if (!uid) return false;
    try {
      const nextNumber = computeNextProjectNumber(projects);
      const payload: any = {
        title,
        client_id: clientId,
        property_id: propertyId,
        professional_id: professionalId,
        service_id: serviceId,
        registry_id: registryId,
        deadline: deadline || null,
        current_step_index: 0,
        user_id: uid,
        project_number: nextNumber
      };

      // Só envia os novos campos se eles forem preenchidos, para evitar erros se as colunas não existirem
      if (certificationNumber) payload.certification_number = certificationNumber;
      if (certificationDate) payload.certification_date = certificationDate;
      if (artNumber) payload.art_number = artNumber;

      const { data, error } = await supabase.from('projects').insert(payload).select().single();

      if (error) {
        // Tratamento específico para coluna inexistente (erro 42703)
        if (error.code === '42703') {
          showNotification("Erro de Banco: Novos campos detectados. Por favor, execute o SQL enviado anteriormente no painel Supabase para habilitar 'Data da Certificação' e 'ART'.", "alert");
          console.error("Erro 42703: Coluna inexistente. Payload enviado:", payload);
          return false;
        }
        throw error;
      }
      if (data) {
        // Filter steps based on service
        const selectedService = services.find(s => s.id === serviceId);
        const isCarGo = selectedService?.name?.toUpperCase().includes('CAR');

        let stepsToCreate = WORKFLOW_STEPS_DEFINITION;
        if (isCarGo) {
          stepsToCreate = CAR_WORKFLOW_STEPS_DEFINITION;
        }

        const steps = stepsToCreate.map((s, i) => ({
          project_id: data.id,
          step_id: s.id,
          label: s.label,
          has_document: s.hasDocument,
          status: i === 0 ? ProjectStatus.IN_PROGRESS : ProjectStatus.NOT_STARTED,
          user_id: uid
        }));

        await supabase.from('project_steps').insert(steps);
        fetchInitialData(uid);
        showNotification('Projeto criado com sucesso!');
        return true;
      }
      return false;
    } catch (err: any) {
      showNotification(`Erro ao criar projeto: ${extractErrorMessage(err)}`, 'error');
      return false;
    }
  };

  const handleSaveAccount = async (account: Partial<Account>, id?: string) => {
    await handleUpsert('accounts', account, fetchInitialData, id);
  };

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        appointments={appointments}
        logout={logout}
        user={user}
        role={role}
        isMobile={isMobile}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Navbar
          currentView={currentView}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          user={user}
          onLogout={logout}
        />

        <main className="flex-1 overflow-hidden flex flex-col pt-4">
          <div className="flex-1 bg-white rounded-tl-[var(--content-radius)] shadow-sm overflow-y-auto custom-scrollbar relative">
            {/* Background branding subtle element */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <MapIcon size={200} />
            </div>

            <div className="px-4 sm:px-10 py-8 relative z-10 min-h-full">
              {dbError && (
                <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50/50 text-rose-700 px-5 py-4 text-[11px] font-medium flex items-center gap-3 animate-in slide-in-from-top-4 duration-500 shadow-premium">
                  <div className="p-1.5 bg-rose-100 rounded-lg">
                    <AlertCircle size={16} />
                  </div>
                  <span className="truncate">{dbError}</span>
                </div>
              )}

              <AppRouter
                currentView={currentView}
                setCurrentView={setCurrentView}
                selectedProjectId={selectedProjectId}
                setSelectedProjectId={setSelectedProjectId}
                projects={projects}
                clients={clients}
                properties={properties}
                professionals={professionals}
                registries={registries}
                sigefCertifications={sigefCertifications}
                services={services}
                budgetItemTemplates={budgetItemTemplates}
                transactions={transactions}
                appointments={appointments}
                creditCards={creditCards}
                creditCardExpenses={creditCardExpenses}
                user={user}
                profile={profile}
                role={role}
                fetchInitialData={fetchInitialData}
                showNotification={showNotification}
                simulateProgress={simulateProgress}
                userIdRef={userIdRef}
                addProject={addProject}
                handleUpsert={handleUpsert}
                handleDelete={handleDelete}
                updateProjectStep={updateProjectStep}
                handleSaveAccount={handleSaveAccount}
                accounts={accounts}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );


};



export default App;
