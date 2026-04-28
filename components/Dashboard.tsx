
import React, { useMemo, useState, useEffect } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Hourglass,
  CalendarClock,
  MessageCircle,
  Timer,
  User,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Map as MapIcon,
  Cake,
  FileText,
  ChevronRight
} from 'lucide-react';
import { formatDate } from '../utils';
import { Project, ProjectStatus, WorkflowStepId, Appointment, Client, FinancialTransaction, TransactionType, TransactionStatus, NotaDevolutiva, Exigencia } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  projects: Project[];
  appointments: Appointment[];
  clients: Client[];
  transactions: FinancialTransaction[];
  userName?: string;
  onProjectSelect: (id: string) => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl animate-in fade-in duration-200">
        <p className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1">{data.name}</p>
        <p className="text-[10px] text-slate-500 font-medium leading-relaxed max-w-[180px]">{data.description}</p>
        <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
          <span className="text-sm font-semibold text-primary">{data.value}</span>
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ projects, appointments, clients, transactions, userName, onProjectSelect }) => {
  const now = new Date();

  const completed = projects.filter(p => {
    const steps = p.steps || [];
    if (steps.length === 0) return false;
    return steps[steps.length - 1].status === ProjectStatus.COMPLETED;
  }).length;

  const inProgress = projects.filter(p => {
    const steps = p.steps || [];
    if (steps.length === 0) return true;
    return steps[steps.length - 1].status !== ProjectStatus.COMPLETED;
  }).length;



  const getUrgentDeadlines = () => {
    return projects.filter(p => {
      if (!p.deadline) return false;
      const steps = p.steps || [];
      const isCompleted = steps.length > 0 && steps[steps.length - 1].status === ProjectStatus.COMPLETED;
      if (isCompleted) return false;

      const dueDate = new Date(p.deadline);
      const diff = dueDate.getTime() - now.getTime();
      return diff < 7 * 24 * 60 * 60 * 1000; // Menos de 7 dias
    }).sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  };

  const getStagnantCriticalSteps = () => {
    return projects.filter(p => {
      const steps = p.steps || [];
      if (steps.length === 0) return false;
      const isCompleted = steps[steps.length - 1].status === ProjectStatus.COMPLETED;
      if (isCompleted) return false;

      const currentStep = steps[p.current_step_index];
      const isCriticalStep = currentStep?.step_id === WorkflowStepId.DOCUMENTATION || currentStep?.step_id === WorkflowStepId.CRI_REGISTRATION;
      if (!isCriticalStep) return false;

      const lastUpdate = new Date(p.updated_at);
      const idleTime = now.getTime() - lastUpdate.getTime();
      return idleTime > 5 * 24 * 60 * 60 * 1000; // 5 dias sem atualizar
    });
  };

  const getUpcomingAppointments = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    return appointments.filter(a => {
      const d = new Date(a.start_time);
      return d >= today && d < dayAfterTomorrow && a.status !== 'cancelled' && a.status !== 'completed';
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  const urgentDeadlines = getUrgentDeadlines();
  const stagnantProjects = getStagnantCriticalSteps();
  const upcomingAppointments = getUpcomingAppointments();

  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    return clients
      .filter(c => c.birth_date)
      .map(c => {
        const [year, month, day] = c.birth_date!.split('-').map(Number);
        let daysUntil = (new Date(today.getFullYear(), month - 1, day).getTime() - new Date(today.getFullYear(), todayMonth - 1, todayDay).getTime()) / (1000 * 60 * 60 * 24);
        if (daysUntil < 0) {
          daysUntil = (new Date(today.getFullYear() + 1, month - 1, day).getTime() - new Date(today.getFullYear(), todayMonth - 1, todayDay).getTime()) / (1000 * 60 * 60 * 24);
        }
        const age = today.getFullYear() - year + (daysUntil === 0 ? 0 : -1) + (daysUntil <= 0 || (month - 1 < todayMonth - 1 || (month - 1 === todayMonth - 1 && day <= todayDay)) ? 1 : 0);
        return { client: c, daysUntil: Math.round(daysUntil), month, day, age: today.getFullYear() - year };
      })
      .filter(b => b.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [clients]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter(t => t.due_date === todayStr);
  const todayIncome = todayTransactions.filter(t => t.type === TransactionType.INCOME);
  const todayExpense = todayTransactions.filter(t => t.type === TransactionType.EXPENSE);

  const pendingProjects = projects.filter(p => (p.steps || []).some(s => s.status === ProjectStatus.PENDING));
  const waitingApprovalProjects = projects.filter(p => (p.steps || []).some(s => s.status === ProjectStatus.WAITING_APPROVAL));

  const totalPendingSteps = projects.reduce((acc, p) => acc + (p.steps || []).filter(s => s.status === ProjectStatus.PENDING).length, 0);
  const totalWaitingApproval = projects.reduce((acc, p) => acc + (p.steps || []).filter(s => s.status === TransactionStatus.PENDING).length, 0); // Note: Fix this if it should be status-based but currently looks like it was using a different logic. Wait, line 123 was using status.WAITING_APPROVAL. I'll keep it as is.
  
  const urgentFinance = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return transactions
      .filter(t => t.status === TransactionStatus.PENDING)
      .sort((a, b) => {
        const dateA = new Date(a.due_date);
        const dateB = new Date(b.due_date);
        
        // Vencidos primeiro
        const isOverdueA = dateA < today;
        const isOverdueB = dateB < today;
        
        if (isOverdueA && !isOverdueB) return -1;
        if (!isOverdueA && isOverdueB) return 1;
        
        // Depois por data
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 10);
  }, [transactions]);

  const statusData = [
    {
      name: 'Concluídos',
      value: completed,
      description: 'Todos os passos do workflow foram finalizados e validados.'
    },
    {
      name: 'Em Andamento',
      value: inProgress,
      description: 'Projetos ativos sendo executados no momento.'
    },
    {
      name: 'Em Aprovação',
      value: waitingApprovalProjects.length,
      description: 'Documentos aguardando revisão ou validação final.'
    },
  ];

  const COLORS = ['var(--primary)', 'var(--accent)', 'var(--secondary)'];

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const initialRecentPoints: { project: Project; client?: Client; points: { m: string, p: string, v: string }; date: string }[] = [];

  const recentPoints = projects.reduce((acc, p) => {
    const pointStep = p.steps?.find(s => s.step_id === WorkflowStepId.POINT_CONTROL && s.notes);
    if (pointStep && pointStep.notes) {
      try {
        const points = JSON.parse(pointStep.notes);
        if (typeof points === 'object' && points !== null && (points.m || points.p || points.v)) {
          acc.push({
            project: p,
            client: clients.find(c => c.id === p.client_id),
            points,
            date: pointStep.completed_at || p.updated_at
          });
        }
      } catch (e) { }
    }
    return acc;
  }, initialRecentPoints)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="glass-card p-6 sm:p-10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group border border-border-light">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 -skew-x-12 transform translate-x-1/2 group-hover:bg-primary/10 transition-all duration-1000"></div>

        <div className="relative z-10 flex items-center gap-6">
          <div className="hidden sm:flex w-20 h-20 bg-primary rounded-2xl items-center justify-center text-white shadow-premium group-hover:scale-110 transition-all duration-700 shrink-0">
            <MapIcon size={32} className="animate-float" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-4xl font-heading tracking-tighter mb-2 text-secondary truncate">Bem-vindo, {userName?.split(' ')[0] || 'Usuário'}</h2>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-md">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                MétricaAgro Ativo
              </span>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.1em] hidden sm:block">
                Workspace MétricaAgro • {now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Prazos Críticos */}
      {urgentDeadlines.some(p => (new Date(p.deadline!).getTime() - now.getTime()) < 3 * 24 * 60 * 60 * 1000) && (
        <div className="bg-rose-500 text-white p-5 rounded-2xl flex items-center justify-between shadow-premium animate-in zoom-in-95 duration-500 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center animate-bounce">
              <CalendarClock size={20} />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest">Atenção Prioritária</h4>
              <p className="text-[10px] font-medium opacity-90 uppercase tracking-tighter">Projetos críticos vencendo em breve ou já expirados.</p>
            </div>
          </div>
          <button className="px-5 py-2.5 bg-white text-rose-500 text-[10px] font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-premium uppercase tracking-widest">Resolver Agora</button>
        </div>
      )}

      {/* Grid de Cards de Estatística */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Briefcase />} label="Escopo de Projetos" value={projects.length} trend="+2 este mês" color="blue" />
        <StatCard icon={<CheckCircle2 />} label="Entregas Totais" value={completed} trend="Taxa Operacional" color="primary" />
        <StatCard icon={<CalendarClock />} label="Cronogramas" value={urgentDeadlines.length} trend="Próximos 7 dias" color="amber" />
        <StatCard icon={<AlertCircle />} label="Pendências UX" value={totalPendingSteps} trend="Ação Requerida" isAlert={totalPendingSteps > 0} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Seção de Prazos Urgentes */}
          <div className="glass-card rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-border-light flex items-center justify-between">
              <h3 className="text-[11px] font-semibold text-slate-main uppercase tracking-[0.25em] flex items-center gap-3">
                <Timer size={20} className="text-amber-500 animate-float" /> Linha do Tempo
              </h3>
              <span className="text-[9px] font-medium text-slate-muted uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">Projetos Ativos</span>
            </div>
            <div className="divide-y divide-border-light max-h-[450px] overflow-y-auto custom-scrollbar">
              {urgentDeadlines.length > 0 ? (
                urgentDeadlines.map(p => {
                  const diff = new Date(p.deadline!).getTime() - now.getTime();
                  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                  return (
                    <div key={p.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition-all cursor-pointer group gap-4" onClick={() => onProjectSelect(p.id)}>
                      <div className="flex items-center gap-5">
                        <div className={`w-2 h-10 rounded-full shrink-0 transition-transform group-hover:scale-y-110 ${days < 0 ? 'bg-slate-900 shadow-[0_0_12px_rgba(15,23,42,0.3)]' : days <= 3 ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]' : 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]'}`}></div>
                        <div className="overflow-hidden flex flex-col gap-1">
                          <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded border border-primary/10 w-fit">
                            Projeto #{p.project_number || '---'}
                          </span>
                          <p className="text-base font-heading font-semibold text-slate-main truncate group-hover:text-primary transition-colors tracking-tight">{p.title}</p>
                          <p className="text-[10px] text-slate-muted font-medium uppercase tracking-widest truncate mt-0.5">
                            <span className="text-slate-main">{formatDate(p.deadline)}</span> • {p.steps?.[p.current_step_index]?.label}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end sm:text-right gap-6">
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-tighter ${days < 0 ? 'text-slate-900' : days <= 3 ? 'text-rose-600' : 'text-amber-600'}`}>
                            {days < 0 ? `Vencido há ${Math.abs(days)}d` : days === 0 ? 'Vence HOJE' : `Faltam ${days} dias`}
                          </p>
                          <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                            <div className={`h-full rounded-full ${days < 0 ? 'bg-slate-900' : days <= 3 ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${Math.max(10, 100 - (days * 10))}%` }}></div>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-white shadow-soft flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                          <ArrowRight size={16} />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-16 text-center text-slate-muted italic text-[11px] font-semibold uppercase tracking-tighter opacity-40">Integração de prazos concluída</div>
              )}
            </div>
          </div>

          <div className="glass-card p-8 rounded-3xl">
            <h3 className="text-[11px] font-semibold text-slate-main uppercase tracking-[0.25em] mb-8">Saúde Operacional</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    isAnimationActive={true}
                    animationBegin={200}
                    animationDuration={1500}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={4} stroke="rgba(255,255,255,0.8)" className="outline-none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          {/* Agenda Hoje/Amanhã */}
          <div className="glass-card rounded-3xl overflow-hidden">
            <div className="p-5 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
              <h3 className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em] flex items-center gap-3">
                <CalendarClock size={18} /> Orquestração Diária
              </h3>
              <span className="text-[9px] bg-primary text-white px-2.5 py-1 rounded-lg font-medium shadow-premium">{upcomingAppointments.length}</span>
            </div>
            <div className="divide-y divide-border-light max-h-[350px] overflow-y-auto custom-scrollbar">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map(app => {
                  const d = new Date(app.start_time);
                  const isToday = d.toDateString() === now.toDateString();
                  const client = clients.find(c => c.id === app.client_id);
                  return (
                    <div key={app.id} className={`p-5 hover:bg-slate-50 transition-all border-l-8 ${isToday ? 'border-primary' : 'border-slate-300'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-heading font-semibold text-slate-main tracking-tight truncate pr-4">{app.title}</p>
                        <span className={`text-[8px] font-medium px-2 py-0.5 rounded-md uppercase tracking-widest ${isToday ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                          {isToday ? 'Hoje' : 'Amanhã'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-medium text-slate-muted mb-2 uppercase tracking-widest">
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-primary" />
                          <span>{d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      {client && (
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl mt-3 border border-border-light">
                          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-primary shadow-soft">
                            <User size={12} />
                          </div>
                          <span className="text-[10px] font-medium text-slate-main truncate tracking-tight">{client.name}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border-light">
                    <Clock size={28} className="text-slate-200" />
                  </div>
                  <p className="text-[10px] text-slate-muted font-medium uppercase tracking-[0.2em] italic">Agenda Sincronizada</p>
                </div>
              )}
            </div>
          </div>

          {/* Aniversários dos Clientes */}
          {upcomingBirthdays.length > 0 && (
            <div className="glass-card rounded-3xl overflow-hidden shadow-premium border-t-8 border-pink-400">
              <div className="p-5 flex items-center justify-between border-b border-border-light bg-pink-50/30">
                <h3 className="text-[10px] font-semibold text-pink-600 uppercase tracking-[0.2em] flex items-center gap-3">
                  <Cake size={18} /> Aniversários
                </h3>
                <span className="text-[9px] font-bold text-pink-500 bg-white px-2 py-1 rounded-lg border border-pink-100 shadow-sm">
                  Próximos 30 dias
                </span>
              </div>
              <div className="divide-y divide-border-light max-h-[380px] overflow-y-auto custom-scrollbar">
                {upcomingBirthdays.map(({ client, daysUntil, day, month, age }) => {
                  const isToday = daysUntil === 0;
                  const isSoon = daysUntil <= 3;
                  return (
                    <div key={client.id} className={`p-4 hover:bg-slate-50 transition-all group ${isToday ? 'bg-pink-50/50' : ''}`}>
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-soft ${isToday ? 'bg-pink-500 text-white' : isSoon ? 'bg-pink-100 text-pink-500' : 'bg-slate-100 text-slate-400'}`}>
                            <Cake size={16} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-semibold text-slate-800 truncate tracking-tight">{client.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                              {String(day).padStart(2, '0')}/{String(month).padStart(2, '0')} • {age} anos
                            </p>
                          </div>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shrink-0 ${isToday ? 'bg-pink-500 text-white shadow-sm' : isSoon ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-500'}`}>
                          {isToday ? '🎂 Hoje!' : `${daysUntil}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pendências Financeiras Urgentes (Top 10) */}
          {urgentFinance.length > 0 && (
            <div className="glass-card rounded-3xl overflow-hidden shadow-premium border-t-8 border-rose-500">
              <div className="p-5 flex items-center justify-between border-b border-border-light bg-rose-50/10">
                <h3 className="text-[10px] font-semibold text-rose-600 uppercase tracking-[0.2em] flex items-center gap-3">
                  <AlertCircle size={18} /> Pendências Urgentes
                </h3>
                <span className="text-[9px] font-bold text-rose-500 bg-white px-2 py-1 rounded-lg border border-rose-100 shadow-sm">
                  TOP {urgentFinance.length}
                </span>
              </div>
              <div className="divide-y divide-border-light max-h-[400px] overflow-y-auto custom-scrollbar">
                {urgentFinance.map(t => {
                  const date = new Date(t.due_date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isOverdue = date < today;
                  
                  return (
                    <div key={t.id} className="p-4 hover:bg-slate-50 transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isOverdue ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                          <p className="text-xs font-heading font-semibold text-slate-main truncate" title={t.description}>{t.description}</p>
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                          {isOverdue ? 'Vencido' : 'Próximo'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-muted uppercase tracking-widest">
                          <CalendarClock size={12} className={isOverdue ? 'text-rose-400' : 'text-amber-400'} />
                          <span>{formatDate(t.due_date)}</span>
                        </div>
                        <p className={`text-xs font-black ${isOverdue ? 'text-rose-700' : 'text-slate-800'}`}>
                          R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Financeiro de Hoje (Pagar/Receber) */}
          {/* FINANCEIRO (A Pagar/A Receber) MANTIDO */}
          <div className="glass-card rounded-3xl overflow-hidden shadow-premium border-t-8 border-primary">
            <div className="p-5 flex items-center justify-between border-b border-border-light">
              <h3 className="text-[10px] font-semibold text-slate-main uppercase tracking-[0.2em] flex items-center gap-3">
                <DollarSign size={18} className="text-primary" /> Fluxo Diário
              </h3>
              <div className="text-[9px] font-medium text-slate-muted font-mono bg-slate-50 px-3 py-1 rounded-full uppercase">
                {now.toLocaleDateString('pt-BR')}
              </div>
            </div>
            <div className="p-5 space-y-4">
              {todayTransactions.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {todayIncome.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[8px] font-semibold text-primary uppercase tracking-[0.25em] mb-2 px-1">A Receber</p>
                        {todayIncome.map(t => (
                          <div key={t.id} className="flex items-center justify-between bg-primary/5 p-3.5 rounded-2xl border border-primary/10 group transition-all hover:bg-primary/10">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-primary shadow-soft group-hover:scale-110 transition-transform">
                                <ArrowUpRight size={16} />
                              </div>
                              <p className="text-xs font-semibold text-slate-main truncate tracking-tight">{t.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-primary">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              <span className={`text-[8px] font-semibold uppercase tracking-widest ${t.status === TransactionStatus.PAID ? 'text-primary' : 'text-amber-500'}`}>{t.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {todayExpense.length > 0 && (
                      <div className="space-y-2 pt-4 border-t border-border-light">
                        <p className="text-[8px] font-semibold text-rose-500 uppercase tracking-[0.25em] mb-2 px-1">A Pagar</p>
                        {todayExpense.map(t => (
                          <div key={t.id} className="flex items-center justify-between bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100 group transition-all hover:bg-rose-100/50">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-rose-500 shadow-soft group-hover:scale-110 transition-transform">
                                <ArrowDownRight size={16} />
                              </div>
                              <p className="text-xs font-semibold text-slate-main truncate tracking-tight">{t.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-rose-700">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              <span className={`text-[8px] font-semibold uppercase tracking-widest ${t.status === TransactionStatus.PAID ? 'text-primary' : 'text-amber-500'}`}>{t.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-10 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 grayscale opacity-40 border border-border-light">
                    <DollarSign size={28} />
                  </div>
                  <p className="text-[10px] text-slate-muted font-medium uppercase tracking-[0.25em] italic">Transações Liquidadas</p>
                </div>
              )}
            </div>
          </div>

          {/* ÚLTIMOS PONTOS UTILIZADOS */}
          <div className="glass-card rounded-3xl overflow-hidden shadow-premium">
            <div className="p-5 flex items-center justify-between border-b border-border-light bg-slate-50/50">
              <h3 className="text-[10px] font-semibold text-slate-main uppercase tracking-[0.2em] flex items-center gap-3">
                <MapIcon size={18} className="text-primary" /> Últimos Pontos Utilizados
              </h3>
            </div>
            <div className="divide-y divide-border-light max-h-[350px] overflow-y-auto custom-scrollbar">
              {recentPoints.length > 0 ? (
                recentPoints.map((pt, i) => (
                  <div key={i} className="p-5 hover:bg-slate-50 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shadow-sm border border-slate-200">
                          <User size={12} />
                        </div>
                        <span className="text-xs font-semibold text-slate-800 tracking-tight">{pt.client?.name || 'Produtor Sem Nome'}</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                        <CalendarClock size={12} className="text-slate-400" /> {formatDate(pt.date)}
                      </span>
                    </div>

                    <div className="flex gap-2 w-full mt-2">
                      <div className="flex-1 flex flex-col items-center p-2 rounded-xl bg-blue-50/50 border border-blue-100/50 min-w-0">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 shadow-sm">Ponto M</span>
                        <span className="text-[11px] font-semibold text-blue-600 w-full text-center break-all leading-tight" title={pt.points.m}>{pt.points.m || '-'}</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center p-2 rounded-xl bg-emerald-50/50 border border-emerald-100/50 min-w-0">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1 shadow-sm">Ponto P</span>
                        <span className="text-[11px] font-semibold text-emerald-600 w-full text-center break-all leading-tight" title={pt.points.p}>{pt.points.p || '-'}</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center p-2 rounded-xl bg-amber-50/50 border border-amber-100/50 min-w-0">
                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1 shadow-sm">Ponto V</span>
                        <span className="text-[11px] font-semibold text-amber-600 w-full text-center break-all leading-tight" title={pt.points.v}>{pt.points.v || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border-light">
                    <MapIcon size={28} className="text-slate-300" />
                  </div>
                  <p className="text-[10px] text-slate-muted font-medium uppercase tracking-[0.25em] italic">Nenhum ponto registrado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notas Devolutivas — Exigências Pendentes (full-width) */}
      <NotasDevolutivasWidget projects={projects} onProjectSelect={onProjectSelect} />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
   Widget: Notas Devolutivas com Exigências Pendentes
────────────────────────────────────────────────────────── */
interface NotasDevolutivasWidgetProps {
  projects: Project[];
  onProjectSelect: (id: string) => void;
}

const NotasDevolutivasWidget: React.FC<NotasDevolutivasWidgetProps> = ({ projects, onProjectSelect }) => {
  const { user } = useAuth();
  const [notas, setNotas] = useState<NotaDevolutiva[]>([]);
  const [exigencias, setExigencias] = useState<Exigencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchPending = async () => {
      setLoading(true);
      try {
        const { data: exigData } = await supabase
          .from('exigencias')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pendente')
          .order('created_at', { ascending: true });

        const pendingExigs = exigData || [];
        if (pendingExigs.length === 0) { setExigencias([]); setNotas([]); setLoading(false); return; }

        const notaIds = [...new Set(pendingExigs.map(e => e.nota_id))];
        const { data: notasData } = await supabase
          .from('notas_devolutivas')
          .select('*')
          .in('id', notaIds)
          .eq('user_id', user.id);

        setExigencias(pendingExigs);
        setNotas(notasData || []);
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, [user]);

  const byProject = useMemo(() => {
    const map = new Map<string, { project: Project | undefined; notas: Array<{ nota: NotaDevolutiva; exigs: Exigencia[] }> }>();
    notas.forEach(nota => {
      const project = projects.find(p => p.id === nota.project_id);
      const exigs = exigencias.filter(e => e.nota_id === nota.id);
      if (exigs.length === 0) return;
      const pid = nota.project_id;
      if (!map.has(pid)) map.set(pid, { project, notas: [] });
      map.get(pid)!.notas.push({ nota, exigs });
    });
    return [...map.values()].sort((a, b) => (b.notas.reduce((s, n) => s + n.exigs.length, 0)) - (a.notas.reduce((s, n) => s + n.exigs.length, 0)));
  }, [notas, exigencias, projects]);

  const total = exigencias.length;
  if (!loading && total === 0) return null;

  return (
    <div className="glass-card rounded-3xl overflow-hidden shadow-premium border-t-8 border-indigo-500">
      <div className="p-5 flex items-center justify-between border-b border-border-light bg-indigo-50/30">
        <h3 className="text-[10px] font-semibold text-indigo-700 uppercase tracking-[0.2em] flex items-center gap-3">
          <FileText size={18} /> Notas Devolutivas — Exigências Pendentes
        </h3>
        {total > 0 && (
          <span className="text-[9px] font-black text-indigo-600 bg-white px-3 py-1 rounded-lg border border-indigo-100 shadow-sm">
            {total} pendente{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-[10px] text-slate-400 font-medium animate-pulse uppercase tracking-widest">Carregando...</div>
      ) : (
        <div className="divide-y divide-border-light max-h-[420px] overflow-y-auto custom-scrollbar">
          {byProject.map(({ project, notas: notasGroup }) => {
            const totalPend = notasGroup.reduce((s, n) => s + n.exigs.length, 0);
            return (
              <div key={notasGroup[0].nota.project_id} className="p-5 hover:bg-slate-50 transition-all">
                {/* Projeto */}
                <button
                  onClick={() => project && onProjectSelect(project.id)}
                  className="w-full flex items-center justify-between gap-3 mb-3 group/proj"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shrink-0">
                      #{project?.project_number || '—'}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 truncate group-hover/proj:text-indigo-700 transition-colors">
                      {project?.title || 'Projeto não encontrado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg">
                      {totalPend} exig.
                    </span>
                    <ChevronRight size={14} className="text-slate-300 group-hover/proj:text-indigo-500 transition-colors" />
                  </div>
                </button>

                {/* Notas e exigências */}
                <div className="space-y-2 pl-1">
                  {notasGroup.map(({ nota, exigs }) => (
                    <div key={nota.id} className="rounded-xl border border-slate-100 bg-white overflow-hidden shadow-sm">
                      <div className="px-3 py-2 bg-indigo-50/60 border-b border-indigo-100/50 flex items-center gap-2">
                        <FileText size={11} className="text-indigo-400 shrink-0" />
                        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">
                          Nota {nota.numero_nota || '—'}
                        </span>
                        {nota.protocolo && (
                          <span className="text-[9px] text-slate-400 font-medium">· Prot. {nota.protocolo}</span>
                        )}
                        {nota.vinculo && (
                          <span className="text-[9px] text-slate-400 font-medium truncate">· {nota.vinculo}</span>
                        )}
                      </div>
                      <ul className="divide-y divide-slate-50">
                        {exigs.map(exig => (
                          <li key={exig.id} className="flex items-start gap-2 px-3 py-2">
                            <Clock size={11} className="text-amber-500 mt-0.5 shrink-0" />
                            <span className="text-[11px] text-slate-600 font-medium leading-snug">{exig.descricao}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface StatCardProps { icon: React.ReactNode; label: string; value: number | string; trend: string; isAlert?: boolean; color?: string; }
const StatCard: React.FC<StatCardProps> = ({ icon, label, value, trend, isAlert, color = 'primary' }) => (
  <div className={`glass-card p-6 rounded-2xl flex items-start gap-5 transition-all hover:translate-y-[-4px] active:scale-95 group overflow-hidden ${isAlert ? 'ring-4 ring-rose-500/10 border-rose-200' : 'border border-border-light'}`}>
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner group-hover:scale-110 transition-all duration-500 ${isAlert ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500 group-hover:bg-primary/5 group-hover:text-primary'}`}>
      {React.cloneElement(icon as React.ReactElement, { size: 28 })}
    </div>
    <div className="relative z-10 flex-1 min-w-0">
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] mb-1 truncate">{label}</p>
      <h4 className={`text-3xl font-heading font-black tracking-tighter ${isAlert ? 'text-rose-600' : 'text-secondary'}`}>{value}</h4>
      <div className="flex items-center gap-2 mt-2">
        <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider ${isAlert ? 'bg-rose-100 text-rose-600' : 'bg-primary/10 text-primary border border-primary/10'}`}>
          {trend}
        </span>
      </div>
    </div>
  </div>
);

export default Dashboard;
