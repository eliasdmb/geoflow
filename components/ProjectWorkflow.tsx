
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileDown,
  AlertCircle,
  FileCheck,
  ChevronDown,
  Info,
  Home,
  ChevronRight,
  ChevronLeft,
  Send,
  ThumbsUp,
  ThumbsDown,
  XCircle,
  Hourglass,
  ShieldCheck,
  Lock,
  ClipboardCheck,
  Square,
  CheckSquare,
  RefreshCw,
  Zap,
  Loader2,
  MessageCircle,
  ExternalLink,
  Save,
  CloudCheck
} from 'lucide-react';
import { Project, Client, RuralProperty, Professional, WorkflowStepId, ProjectStatus, SigefCertification, Service, BudgetItemTemplate, Registry, FinancialTransaction } from '../types';
import { WORKFLOW_STEPS_DEFINITION, CAR_WORKFLOW_STEPS_DEFINITION } from '../constants';
import DocumentPreview from './DocumentPreview';

interface ProjectWorkflowProps {
  project: Project;
  client: Client;
  property: RuralProperty;
  professional?: Professional;
  service: Service;
  allProjects: Project[];
  allClients: Client[];
  allProperties: RuralProperty[];
  allProfessionals: Professional[];
  allServices: Service[];
  allRegistries: Registry[];
  certifications: SigefCertification[];
  budgetItemTemplates: BudgetItemTemplate[];
  onUpdateStep: (stepDbId: string, status: ProjectStatus, notes?: string, docNumber?: string) => void;
  onInitSteps: () => Promise<boolean>;
  onBack: () => void;
  isAdmin: boolean;
  userName: string;
  onCreateTransaction: (transaction: Partial<FinancialTransaction>) => void;
}

const MONTIVIDIU_CNS = '02.456-1';

const CHECKLIST_MONTIVIDIU = [
  { id: '1', label: 'REQUERIMENTO solicitando a AVERBAÇÃO da CERTIFICAÇÃO.' },
  { id: '2', label: 'CERTIFICAÇÃO emitida pelo INCRA/SIGEF.' },
  { id: '3', label: 'ANUÊNCIA / DECLARAÇÃO de limites de todos os confrontantes.' },
  { id: '4', label: 'MAPA expedido pelo SIGEF.' },
  { id: '5', label: 'PROVA DE ART quitada.' },
  { id: '6', label: 'LAUDO TÉCNICO do engenheiro.' },
  { id: '7', label: 'CCIR atualizado.' },
  { id: '8', label: 'ITR – últimos 05 anos.' },
  { id: '9', label: 'Procuração (se aplicável).' },
  { id: '10', label: 'CAR (Cadastro Ambiental Rural).' },
];

const RIO_VERDE_CNS = '02.648-4';

const CHECKLIST_RIO_VERDE = [
  { id: '1', label: '1. REQUERIMENTO DO INTERESSADO solicitando a AVERBAÇÃO da CERTIFICAÇÃO do GEORREFERENCIAMENTO, assinado pelo(a)(s) proprietário(a)(s), com a(s) firma(s) reconhecida(s).' },
  { id: '2', label: '2. CERTIFICAÇÃO emitida pelo INCRA/SIGEF.' },
  { id: '3', label: '3. ANUÊNCIA / DECLARAÇÃO DE RESPEITO DE LIMITES de todos os confrontantes indicados no memorial descritivo e planta, com as respectivas firmas reconhecidas.' },
  { id: '4', label: '4. MAPA expedido pelo SIGEF.' },
  { id: '5', label: '5. PROVA DE ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA (ART) no Conselho Regional de Engenharia, quitada, com as firmas reconhecidas.' },
  { id: '6', label: '6. LAUDO TÉCNICO do engenheiro responsável.' },
  { id: '7', label: '7. CCIR do imóvel ou imóveis atualizado (último).' },
  { id: '8', label: '8. ITR – últimos 05 anos pagos ou Certidão expedida pela Receita Federal.' },
  { id: '9', label: '9. Procuração ou termo de inventariante, se for o caso, de todos os representantes que comparecem no processo ou nas cartas de anuência das confrontações.' },
  { id: '10', label: '10. CAR (Cadastro Ambiental Rural), juntamente com o requerimento para averbação, caso ainda não esteja averbado na matrícula do imóvel.' },
];

const RIO_VERDE_2_CNS = '02.612-0';

const CHECKLIST_RIO_VERDE_2 = [
  { id: '1', label: 'Certificação a ser emitida pelo INCRA.' },
  { id: '2', label: 'Memorial descritivo assinado pelo técnico responsável, contendo o nº do CREA.' },
  { id: '3', label: 'Anuência de todos os confrontantes' },
  { id: '4', label: 'Planta do imóvel rural georreferenciado.' },
  { id: '5', label: 'Planta do imóvel feita pelo técnico responsável, mostrando os confrontantes e suas matrículas, devidamente assinado.' },
  { id: '6', label: 'Laudo Técnico assinado pelo técnico responsável, justificando todas as divergências existentes.' },
  { id: '7', label: 'Certidão do IBAMA.' },
  { id: '8', label: 'CCIR e ITR atualizados.' },
  { id: '9', label: 'ART do CREA' }
];

const CHECKLIST_CAR_GO = [
  { id: '1', label: 'Documentos Pessoais' },
  { id: '2', label: 'Comprovante de Endereço' },
  { id: '3', label: 'Certidão de Matrícula ou Escritura' },
  { id: '4', label: 'e-mail' }
];

const ProjectWorkflow: React.FC<ProjectWorkflowProps> = ({
  project,
  client,
  property,
  professional,
  service,
  allProjects,
  allClients,
  allProperties,
  allProfessionals,
  allServices,
  allRegistries,
  certifications,
  budgetItemTemplates,
  onUpdateStep,
  onInitSteps,
  onBack,
  isAdmin,
  userName,
  onCreateTransaction
}) => {
  const steps = project.steps || [];

  const [selectedStepIndex, setSelectedStepIndex] = useState(() => {
    const idx = project.current_step_index || 0;
    return (steps.length > 0 && idx >= steps.length) ? 0 : idx;
  });

  const [showDocPreview, setShowDocPreview] = useState(false);
  // State specifically for generating the "Documentação (Checklist)"
  const [showCoverPreview, setShowCoverPreview] = useState(false);

  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [lastSavedNotes, setLastSavedNotes] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasTriedInit, setHasTriedInit] = useState(false);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [pointsState, setPointsState] = useState({ m: '', p: '', v: '' });

  const autoSaveTimeoutRef = useRef<number | null>(null);



  const selectedStep = steps[selectedStepIndex];
  const isCriStep = selectedStep?.step_id === WorkflowStepId.CRI_REGISTRATION;
  const isDocumentationStep = selectedStep?.step_id === WorkflowStepId.DOCUMENTATION;
  const isPointControlStep = selectedStep?.step_id === WorkflowStepId.POINT_CONTROL;

  const registry = allRegistries.find(r => r.id === project.registry_id);
  const isMontividiu = registry?.cns === MONTIVIDIU_CNS;
  const isRioVerde = registry?.cns === RIO_VERDE_CNS;
  const isRioVerde2 = registry?.cns === RIO_VERDE_2_CNS;

  const isCarGo = service?.name?.toUpperCase().includes('CAR');

  const activeChecklist = isCarGo ? CHECKLIST_CAR_GO : (isRioVerde ? CHECKLIST_RIO_VERDE : (isRioVerde2 ? CHECKLIST_RIO_VERDE_2 : (isMontividiu ? CHECKLIST_MONTIVIDIU : [])));
  const hasChecklist = isDocumentationStep && activeChecklist.length > 0;

  useEffect(() => {
    if (steps.length === 0 && !isInitializing && !hasTriedInit) {
      console.log("ProjectWorkflow: Initializing steps for project:", project.id);
      setIsInitializing(true);
      setHasTriedInit(true);
      onInitSteps().then((success) => {
        console.log("ProjectWorkflow: Steps initialization success:", success);
      }).catch((error) => {
        console.error("ProjectWorkflow: Steps initialization error:", error);
      }).finally(() => {
        setIsInitializing(false);
      });
    }
  }, [steps.length, isInitializing, hasTriedInit, onInitSteps]);

  useEffect(() => {
    if (!selectedStep) return;
    const currentNotes = selectedStep.notes || '';
    setNotes(currentNotes);
    setLastSavedNotes(currentNotes);

    if (hasChecklist) {
      try {
        const parsed = JSON.parse(currentNotes);
        setChecklistState(typeof parsed === 'object' && parsed !== null ? parsed : {});
      } catch {
        setChecklistState({});
      }
    }

    if (isPointControlStep) {
      try {
        const parsed = JSON.parse(currentNotes);
        setPointsState(typeof parsed === 'object' && parsed !== null ? { m: parsed.m || '', p: parsed.p || '', v: parsed.v || '' } : { m: '', p: '', v: '' });
      } catch {
        setPointsState({ m: '', p: '', v: '' });
      }
    }
  }, [selectedStep?.id, hasChecklist, isPointControlStep]);

  // ... (keep existing useEffects regarding autoSave and key handlers) ...
  // Re-implementing autoSave logic for context completeness
  useEffect(() => {
    if (!selectedStep || (!isCriStep && !isPointControlStep)) return;

    // For Point Control, we use pointsState instead of notes. Notes still contains stringified points.
    let currentDataToSave = isPointControlStep ? JSON.stringify(pointsState) : notes;

    if (currentDataToSave === lastSavedNotes) {
      setIsSavingNotes(false);
      return;
    }
    setIsSavingNotes(true);
    if (autoSaveTimeoutRef.current) window.clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      onUpdateStep(selectedStep.id!, selectedStep.status, currentDataToSave);
      setLastSavedNotes(currentDataToSave);
      setIsSavingNotes(false);
    }, 1500);
    return () => {
      if (autoSaveTimeoutRef.current) window.clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [notes, pointsState, selectedStep?.id, isCriStep, isPointControlStep, selectedStep?.status, onUpdateStep]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && selectedStepIndex > 0) {
        setSelectedStepIndex(selectedStepIndex - 1);
      } else if (e.key === 'ArrowRight' && selectedStepIndex < steps.length - 1 && selectedStepIndex < project.current_step_index) {
        setSelectedStepIndex(selectedStepIndex + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStepIndex, steps.length, project.current_step_index]);

  // ... (keep handleInitWorkflow, handleWhatsAppNotification) ...
  const handleInitWorkflow = async () => {
    setIsInitializing(true);
    try {
      const success = await onInitSteps();
      if (success) setSelectedStepIndex(0);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleWhatsAppNotification = () => {
    if (!professional) return;
    const cleanPhone = client.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá *${client.name}*, informamos que o projeto de georreferenciamento do imóvel *${property.name}* avançou para a etapa de *Registro no CRI*. Atenciosamente, *${professional.name}* (MétricaAgro).`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  const handleToggleChecklist = (itemId: string) => {
    const newState = { ...checklistState, [itemId]: !checklistState[itemId] };
    setChecklistState(newState);
    onUpdateStep(selectedStep.id!, ProjectStatus.IN_PROGRESS, JSON.stringify(newState));
  };

  const handleRequestApproval = () => {
    let finalNotes = notes;
    if (hasChecklist) finalNotes = JSON.stringify(checklistState);
    if (isPointControlStep) finalNotes = JSON.stringify(pointsState);

    // Se for etapa de Documentação, finaliza direto e avança
    if (isDocumentationStep || isPointControlStep) {
      onUpdateStep(selectedStep.id!, ProjectStatus.COMPLETED, finalNotes);
      if (selectedStepIndex < steps.length - 1) {
        setSelectedStepIndex(selectedStepIndex + 1);
      }
    } else {
      onUpdateStep(selectedStep.id!, ProjectStatus.WAITING_APPROVAL, finalNotes);
    }
  };

  const handleApproveStep = () => {
    let finalNotes = notes;
    if (hasChecklist) finalNotes = JSON.stringify(checklistState);
    if (isPointControlStep) finalNotes = JSON.stringify(pointsState);

    onUpdateStep(selectedStep.id!, ProjectStatus.COMPLETED, finalNotes);
    if (selectedStepIndex < steps.length - 1) {
      setSelectedStepIndex(selectedStepIndex + 1);
    }
  };

  const handleRejectStep = () => {
    let finalNotes = notes;
    if (hasChecklist) finalNotes = JSON.stringify(checklistState);
    if (isPointControlStep) finalNotes = JSON.stringify(pointsState);

    onUpdateStep(selectedStep.id!, ProjectStatus.REJECTED, finalNotes);
  };

  // ... (keep render logic for empty steps) ...
  if (steps.length === 0) {
    // (Keep existing empty state return)
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border border-dashed border-slate-200 min-h-[500px] animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-primary/5 text-primary rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <Zap size={40} className={isInitializing ? 'animate-pulse' : ''} />
        </div>
        <h3 className="text-2xl font-semibold text-slate-800">Configuração Pendente</h3>
        <p className="text-sm text-slate-500 max-w-sm text-center mt-3 mb-8 leading-relaxed">
          Este projeto está registrado, mas o workflow de georreferenciamento ainda não foi gerado.
          Clique abaixo para inicializar as etapas obrigatórias.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button disabled={isInitializing} onClick={onBack} className="px-5 py-2 text-slate-500 bg-white border border-slate-200/60 rounded-xl hover:bg-slate-50 transition-all text-xs font-black uppercase tracking-widest">Voltar</button>
          <button disabled={isInitializing} onClick={handleInitWorkflow} className="px-6 py-2 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md shadow-primary/10 flex items-center gap-2 hover:bg-primary-dark transition-all">
            {isInitializing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {isInitializing ? 'Sincronizando...' : 'Gerar Workflow'}
          </button>
        </div>
      </div>
    );
  }

  if (!selectedStep) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header com context do Documento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <button
            onClick={onBack}
            className="w-12 h-12 bg-white border border-border-light rounded-2xl flex items-center justify-center text-slate-muted hover:text-primary hover:border-primary/30 hover:shadow-soft transition-all duration-300 group shadow-sm"
          >
            <ArrowLeft size={20} className="group-hover:scale-110 transition-transform" />
          </button>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 bg-primary text-white text-[8px] font-black uppercase tracking-[0.2em] rounded shadow-sm">
                PROJETO #{project.project_number || '---'}
              </span>
              <span className="text-slate-muted text-[10px] font-medium uppercase tracking-widest pl-2 border-l border-border-light">
                {service?.name}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-slate-main tracking-tighter truncate">
              {property?.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-border-light shadow-premium">
          <div className="flex items-center gap-3 px-4 h-10 border-r border-border-light">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-primary shadow-inner">
              <ShieldCheck size={18} />
            </div>
            <div className="hidden sm:block">
              <p className="text-[8px] text-slate-muted font-medium uppercase tracking-widest">Protocolo Seguro</p>
              <p className="text-[10px] text-slate-main font-semibold tracking-tight">{project.id.slice(0, 12).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-muted">
              <Lock size={16} />
            </div>
            <div className="hidden sm:block">
              <p className="text-[8px] text-slate-muted font-medium uppercase tracking-widest">Acesso Restrito</p>
              <p className="text-[10px] text-slate-main font-semibold tracking-tight">{isAdmin ? 'Nível Administrador' : 'Colaborador'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-2">
          {/* (Keep sidebar code same as before) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Workflow Progress</span>
              <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                {Math.round(((project.current_step_index) / (steps.length - 1 || 1)) * 100)}%
              </span>
            </div>
            <div className="p-2 space-y-1">
              {steps.map((step, index) => {
                const isActive = selectedStepIndex === index;
                const isCompleted = step.status === ProjectStatus.COMPLETED;
                const isCurrent = project.current_step_index === index;
                const isLocked = index > project.current_step_index;

                return (
                  <button
                    key={step.id || index}
                    disabled={isLocked}
                    onClick={() => setSelectedStepIndex(index)}
                    className={`w-full flex items-center gap-4 p-3.5 rounded-2xl text-left transition-all relative group ${isActive
                      ? 'bg-primary text-white shadow-premium ring-1 ring-primary/20 translate-x-1'
                      : isLocked ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-slate-50 text-slate-muted hover:text-slate-main translate-x-0'
                      }`}
                  >
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-300 ${isActive ? 'bg-white text-primary border-white scale-110 shadow-soft' :
                      isCompleted ? 'bg-primary/5 text-primary border-primary/20' :
                        step.status === ProjectStatus.WAITING_APPROVAL ? 'bg-amber-50 text-amber-600 border-amber-200/50' :
                          step.status === ProjectStatus.REJECTED ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            isCurrent ? 'bg-amber-50 text-amber-600 border-amber-200/50 animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-300'
                      }`}>
                      {isCompleted ? <CheckCircle2 size={18} /> :
                        step.status === ProjectStatus.REJECTED ? <XCircle size={18} /> :
                          step.status === ProjectStatus.WAITING_APPROVAL ? <Clock size={18} /> :
                            WORKFLOW_STEPS_DEFINITION[index]?.icon || <ClipboardCheck size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-semibold uppercase tracking-widest truncate ${isActive ? 'text-white/70' : 'text-slate-muted'}`}>Etapa {index + 1}</p>
                      <h4 className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-main group-hover:text-primary transition-colors'}`}>{step.label}</h4>
                    </div>
                    {isCurrent && !isActive && (
                      <div className="shrink-0 w-1.5 h-1.5 bg-primary rounded-full animate-ping"></div>
                    )}
                    {isActive && (
                      <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="glass-card rounded-3xl overflow-hidden flex flex-col min-h-[500px] shadow-premium">
            <div className="p-6 border-b border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary-surface border border-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner shrink-0 group hover:scale-110 transition-transform duration-500">
                  {(() => {
                    const stepDef = isCarGo
                      ? (CAR_WORKFLOW_STEPS_DEFINITION[selectedStepIndex] || CAR_WORKFLOW_STEPS_DEFINITION[0] || WORKFLOW_STEPS_DEFINITION[0])
                      : (WORKFLOW_STEPS_DEFINITION[selectedStepIndex] || WORKFLOW_STEPS_DEFINITION[0]);

                    if (!stepDef || !stepDef.icon) return <ClipboardCheck size={28} className="animate-float" />;

                    try {
                      return React.cloneElement(stepDef.icon as React.ReactElement, { size: 28, className: 'animate-float' });
                    } catch (e) {
                      return <ClipboardCheck size={28} className="animate-float" />;
                    }
                  })()}
                </div>
                <div className="overflow-hidden">
                  <h2 className="text-xl font-heading font-semibold text-slate-main tracking-tight truncate">{selectedStep.label}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    {selectedStep.status === ProjectStatus.COMPLETED ? (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-semibold uppercase tracking-widest rounded flex items-center gap-1.5">
                        <CheckCircle2 size={12} /> Etapa Concluída
                      </span>
                    ) : selectedStep.status === ProjectStatus.WAITING_APPROVAL ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-semibold uppercase tracking-widest rounded flex items-center gap-1.5">
                        <Clock size={12} className="animate-spin-slow" /> Em Aprovação
                      </span>
                    ) : selectedStep.status === ProjectStatus.REJECTED ? (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[8px] font-semibold uppercase tracking-widest rounded flex items-center gap-1.5">
                        <XCircle size={12} /> Revisão Necessária
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-semibold uppercase tracking-widest rounded flex items-center gap-1.5">
                        <Clock size={12} /> Processamento Ativo
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedStep.has_document && (
                  <button
                    onClick={() => setShowDocPreview(true)}
                    className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white border border-border-light text-slate-main text-[10px] font-semibold uppercase tracking-widest rounded-xl hover:bg-slate-50 hover:border-primary/30 transition-all shadow-soft active:scale-95"
                  >
                    <FileDown size={16} className="text-primary" /> Documento
                  </button>
                )}
                {isCriStep && (
                  <button
                    onClick={handleWhatsAppNotification}
                    className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-primary/5 border border-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/10 transition-all shadow-soft active:scale-95"
                  >
                    <MessageCircle size={16} /> Notificar
                  </button>
                )}
              </div>
            </div>

            <div className="p-8 flex-1">
              {hasChecklist ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-primary/5 border border-primary/10 rounded-3xl gap-6 group">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-soft group-hover:scale-110 transition-transform">
                        <ClipboardCheck size={24} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em]">Check-list de Documentos</h4>
                        <p className="text-sm font-medium text-slate-main mt-1">Órgão Regulador: <strong className="font-semibold">{registry?.name || (isRioVerde || isRioVerde2 ? 'Rio Verde' : 'Local')}</strong></p>
                      </div>
                    </div>
                    {(isRioVerde || isRioVerde2) && (
                      <button
                        onClick={() => setShowCoverPreview(true)}
                        className="flex items-center justify-center gap-3 px-6 py-3 bg-slate-main text-white rounded-2xl text-[10px] font-semibold uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-premium w-full sm:w-auto active:scale-95"
                      >
                        <FileDown size={18} /> Gerar Checklist
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeChecklist.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleToggleChecklist(item.id)}
                        className={`group flex items-start gap-4 p-5 rounded-3xl border-2 transition-all duration-300 text-left ${checklistState[item.id]
                          ? 'bg-primary/5 border-primary text-slate-main shadow-soft'
                          : 'bg-white border-slate-50 text-slate-muted hover:border-slate-200'
                          }`}
                      >
                        <div className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${checklistState[item.id] ? 'bg-primary border-primary text-white scale-110 shadow-soft' : 'border-slate-200 bg-slate-50'}`}>
                          {checklistState[item.id] && <CheckCircle2 size={14} />}
                        </div>
                        <span className={`text-[11px] font-medium leading-relaxed transition-colors ${checklistState[item.id] ? 'text-slate-main' : 'group-hover:text-slate-main'}`}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-700">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-semibold text-slate-muted uppercase tracking-[0.3em]">
                      {isPointControlStep ? "Registro de Pontos" : (selectedStep.step_id === WorkflowStepId.BUDGET ? "Proposta Comercial" : "Inteligência & Notas")}
                    </label>
                    {(isCriStep || isPointControlStep) && (
                      <div className="flex items-center gap-2">
                        {isSavingNotes ? (
                          <span className="flex items-center gap-2 text-[10px] font-semibold text-amber-500 uppercase tracking-tighter bg-amber-50 px-3 py-1 rounded-lg">
                            <Loader2 size={12} className="animate-spin" /> Atualizando
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-[10px] font-semibold text-primary uppercase tracking-tighter bg-primary/5 px-3 py-1 rounded-lg">
                            <CloudCheck size={14} /> Sincronizado
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {isPointControlStep ? (
                    <div className="w-full min-h-[20rem] p-6 sm:p-8 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col justify-center items-center gap-6 shadow-inner">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-2xl">
                        {/* Ponto M */}
                        <div className="flex flex-col items-center gap-3 p-4 sm:p-6 bg-white rounded-3xl border border-slate-100 shadow-soft transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">M</div>
                          <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Pontos M</label>
                          <input
                            type="text"
                            value={pointsState.m || ''}
                            onChange={(e) => setPointsState(prev => ({ ...prev, m: e.target.value }))}
                            className="w-full text-center text-sm sm:text-lg font-heading font-black text-slate-main bg-transparent outline-none placeholder:text-slate-200 break-all"
                            placeholder="M-0000"
                          />
                        </div>

                        {/* Ponto P */}
                        <div className="flex flex-col items-center gap-3 p-4 sm:p-6 bg-white rounded-3xl border border-slate-100 shadow-soft transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">P</div>
                          <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Pontos P</label>
                          <input
                            type="text"
                            value={pointsState.p || ''}
                            onChange={(e) => setPointsState(prev => ({ ...prev, p: e.target.value }))}
                            className="w-full text-center text-sm sm:text-lg font-heading font-black text-slate-main bg-transparent outline-none placeholder:text-slate-200 break-all"
                            placeholder="P-0000"
                          />
                        </div>

                        {/* Ponto V */}
                        <div className="flex flex-col items-center gap-3 p-4 sm:p-6 bg-white rounded-3xl border border-slate-100 shadow-soft transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">V</div>
                          <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Pontos V</label>
                          <input
                            type="text"
                            value={pointsState.v || ''}
                            onChange={(e) => setPointsState(prev => ({ ...prev, v: e.target.value }))}
                            className="w-full text-center text-sm sm:text-lg font-heading font-black text-slate-main bg-transparent outline-none placeholder:text-slate-200 break-all"
                            placeholder="V-0000"
                          />
                        </div>
                      </div>
                    </div>
                  ) : selectedStep.step_id === WorkflowStepId.BUDGET ? (
                    <div className="w-full h-80 p-8 bg-slate-50 border border-slate-100 rounded-[2rem] overflow-y-auto custom-scrollbar shadow-inner">
                      {(() => {
                        try {
                          const parsed = JSON.parse(notes || '[]');
                          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && 'price' in parsed[0]) {
                            return (
                              <div className="space-y-6">
                                <div className="p-4 bg-primary/5 text-primary rounded-2xl text-[11px] font-semibold border border-primary/10 flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-soft shrink-0">
                                    <Info size={18} />
                                  </div>
                                  <p className="leading-relaxed">Estes itens são gerenciados pelo <strong className="font-semibold">Editor de Documentos</strong>. Use o botão Documento acima para editar.</p>
                                </div>
                                <div className="space-y-3">
                                  {parsed.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-soft hover:shadow-md transition-shadow">
                                      <span className="text-xs font-semibold text-slate-main">{item.description}</span>
                                      <div className="flex items-baseline gap-2">
                                        <span className="text-[10px] text-slate-muted font-medium">{item.qty}x</span>
                                        <span className="text-sm font-semibold text-primary tracking-tighter">R$ {item.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
                                  <span className="text-[10px] font-semibold uppercase text-slate-muted tracking-[0.2em]">Valor Total da Proposta</span>
                                  <div className="px-5 py-2.5 bg-primary text-white rounded-2xl shadow-premium text-lg font-semibold tracking-tighter">
                                    R$ {parsed.reduce((acc: number, item: any) => acc + ((item.price || 0) * (item.qty || 1)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        } catch (e) {
                        }
                        return (
                          <textarea
                            className={`w-full h-full bg-transparent outline-none resize-none text-sm font-medium text-slate-main leading-relaxed placeholder:text-slate-300`}
                            placeholder="Adicione detalhes do orçamento..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          ></textarea>
                        );
                      })()}
                    </div>
                  ) : (
                    <textarea
                      className={`w-full h-80 p-8 border-2 border-slate-50 bg-slate-50 rounded-[2rem] outline-none focus:ring-8 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all text-sm font-medium text-slate-main leading-relaxed shadow-inner placeholder:text-slate-300`}
                      placeholder={isCriStep ? "Descreva protocolos, prazos e andamento no CRI..." : "Adicione detalhes críticos sobre esta etapa..."}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50/50 border-t border-border-light flex flex-col sm:flex-row items-center justify-between gap-8">
              <div className="flex items-center bg-white p-1 rounded-2xl border border-border-light shadow-soft w-full sm:w-auto">
                <button
                  disabled={selectedStepIndex === 0}
                  onClick={() => setSelectedStepIndex(selectedStepIndex - 1)}
                  className="w-10 h-10 flex items-center justify-center text-slate-muted rounded-xl hover:text-primary hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex-1 sm:flex-none px-6 text-[10px] font-semibold text-slate-muted uppercase tracking-[0.3em] whitespace-nowrap">
                  Step <span className="text-slate-main">{selectedStepIndex + 1}</span> / {steps.length}
                </div>
                <button
                  disabled={selectedStepIndex === steps.length - 1 || selectedStepIndex >= project.current_step_index}
                  onClick={() => setSelectedStepIndex(selectedStepIndex + 1)}
                  className="w-10 h-10 flex items-center justify-center text-slate-muted rounded-xl hover:text-primary hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                {selectedStep.status === ProjectStatus.WAITING_APPROVAL && (
                  <button
                    onClick={handleRejectStep}
                    disabled={isSavingNotes}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-3.5 bg-white border border-rose-200 text-rose-500 rounded-2xl font-semibold text-[10px] uppercase tracking-widest shadow-soft hover:bg-rose-50 transition-all active:scale-95"
                  >
                    <ThumbsDown size={18} /> Revisão
                  </button>
                )}
                <button
                  onClick={selectedStep.status === ProjectStatus.WAITING_APPROVAL ? handleApproveStep : handleRequestApproval}
                  disabled={selectedStep.status === ProjectStatus.COMPLETED || isSavingNotes}
                  className={`w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-3.5 rounded-2xl font-semibold text-[10px] uppercase tracking-[0.2em] shadow-premium transition-all duration-300 active:scale-95 ${selectedStep.status === ProjectStatus.COMPLETED
                    ? 'bg-slate-100 text-slate-400 cursor-default shadow-none border border-slate-200'
                    : selectedStep.status === ProjectStatus.WAITING_APPROVAL ? 'bg-primary text-white hover:bg-primary-dark'
                      : 'bg-slate-main text-white hover:bg-slate-800'
                    } disabled:opacity-50`}
                >
                  {selectedStep.status === ProjectStatus.COMPLETED ? (
                    <><ShieldCheck size={18} /> Concluída</>
                  ) : selectedStep.status === ProjectStatus.WAITING_APPROVAL ? (
                    <><ThumbsUp size={18} className="animate-bounce" /> Aprovar Étapa</>
                  ) : (
                    <><Send size={18} /> Finalizar Etapa</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDocPreview && (
        <DocumentPreview
          project={project}
          step={selectedStep}
          client={client}
          property={property}
          professional={professional}
          service={service}
          allProjects={allProjects}
          allClients={allClients}
          allProperties={allProperties}
          allProfessionals={allProfessionals}
          allServices={allServices}
          allRegistries={allRegistries}
          certifications={certifications}
          budgetItemTemplates={budgetItemTemplates}
          onClose={() => setShowDocPreview(false)}
          isAdmin={isAdmin}
          onUpdateBudgetItems={(items) => {
            const budgetStep = project.steps?.find(s => s.step_id === WorkflowStepId.BUDGET);
            if (budgetStep) {
              onUpdateStep(budgetStep.id!, budgetStep.status, JSON.stringify(items));
            }
          }}
          onReceiptReceived={selectedStep?.step_id === WorkflowStepId.RECEIPT ? onCreateTransaction : undefined}
          onApprove={(num) => {
            onUpdateStep(selectedStep.id!, ProjectStatus.COMPLETED, notes, num);
            setShowDocPreview(false);
            if (selectedStepIndex < steps.length - 1) setSelectedStepIndex(selectedStepIndex + 1);
          }}
          onReject={() => {
            onUpdateStep(selectedStep.id!, ProjectStatus.REJECTED, notes);
            setShowDocPreview(false);
          }}
          userName={userName}
        />
      )}

      {showCoverPreview && (
        <DocumentPreview
          project={project}
          step={{ ...selectedStep, label: 'Documentação (Checklist)', notes: JSON.stringify(checklistState) }} // Pass checklist as notes
          client={client}
          property={property}
          professional={professional}
          service={service}
          allProjects={allProjects}
          allClients={allClients}
          allProperties={allProperties}
          allProfessionals={allProfessionals}
          allServices={allServices}
          allRegistries={allRegistries}
          certifications={certifications}
          budgetItemTemplates={budgetItemTemplates}
          onClose={() => setShowCoverPreview(false)}
          isAdmin={isAdmin}
          userName={userName}
        />
      )}
    </div>
  );
};

export default ProjectWorkflow;
