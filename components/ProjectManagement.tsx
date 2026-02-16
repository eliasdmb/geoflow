
import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  ChevronRight,
  MapPin,
  Calendar,
  User,
  ArrowRight,
  AlertCircle,
  X,
  ClipboardList,
  Landmark,
  Edit3,
  Trash2,
  AlertTriangle,
  CalendarClock
} from 'lucide-react';
import { Project, Client, RuralProperty, Professional, ProjectStatus, Service, Registry, WorkflowStepId } from '../types';

interface ProjectManagementProps {
  projects: Project[];
  clients: Client[];
  properties: RuralProperty[];
  professionals: Professional[];
  services: Service[];
  registries: Registry[];
  onAddProject: (title: string, clientId: string, propertyId: string, professionalId: string, serviceId: string, registryId: string, deadline?: string, certificationNumber?: string) => void;
  onSelectProject: (id: string) => void;
  onUpdateProject: (project: Partial<Project>, id: string) => void;
  onDeleteProject: (id: string) => void;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({
  projects,
  clients,
  properties,
  professionals,
  services,
  registries,
  onAddProject,
  onSelectProject,
  onUpdateProject,
  onDeleteProject
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    clientId: '',
    propertyId: '',
    professionalId: '',
    serviceId: '',
    registryId: '',
    deadline: '',
    certificationNumber: ''
  });

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setFormData({
      title: project.title,
      clientId: project.client_id,
      propertyId: project.property_id,
      professionalId: project.professional_id,
      serviceId: project.service_id,
      registryId: project.registry_id,
      deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '',
      certificationNumber: project.certification_number || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.propertyId || !formData.professionalId || !formData.serviceId || !formData.registryId) {
      alert("Por favor, selecione todas as opções obrigatórias (Cliente, Imóvel, Técnico, Serviço e Serventia).");
      return;
    }

    if (editingId) {
      onUpdateProject({
        title: formData.title,
        client_id: formData.clientId,
        property_id: formData.propertyId,
        professional_id: formData.professionalId,
        service_id: formData.serviceId,
        registry_id: formData.registryId,
        deadline: formData.deadline || undefined,
        certification_number: formData.certificationNumber || undefined
      }, editingId);
    } else {
      onAddProject(
        formData.title,
        formData.clientId,
        formData.propertyId,
        formData.professionalId,
        formData.serviceId,
        formData.registryId,
        formData.deadline || undefined,
        formData.certificationNumber || undefined
      );
    }
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ title: '', clientId: '', propertyId: '', professionalId: '', serviceId: '', registryId: '', deadline: '', certificationNumber: '' });
    setEditingId(null);
  };

  const getUrgencyLevel = (deadline?: string, isCompleted?: boolean) => {
    if (!deadline || isCompleted) return 'normal';
    const now = new Date();
    const dueDate = new Date(deadline);
    const diff = dueDate.getTime() - now.getTime();
    if (diff < 0) return 'expired';
    if (diff < 3 * 24 * 60 * 60 * 1000) return 'critical';
    if (diff < 7 * 24 * 60 * 60 * 1000) return 'warning';
    return 'normal';
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredProjects = normalizedSearch.length === 0
    ? projects
    : projects.filter(p => {
      const clientName = clients.find(c => c.id === p.client_id)?.name;
      return p.title.toLowerCase().includes(normalizedSearch) || clientName?.toLowerCase().includes(normalizedSearch);
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar projetos..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-border-light rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-slate-500 bg-white border border-border-light rounded-xl hover:bg-slate-50 transition-all text-xs font-bold">
            <Filter size={16} />
            <span>Filtros</span>
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-md shadow-primary/10 text-xs font-bold"
          >
            <Plus size={16} />
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      {filteredProjects.length === 0 && (
        <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-8 text-center">
          <p className="text-sm font-bold text-slate-700">Nenhum projeto encontrado</p>
          <p className="text-xs text-slate-500 mt-2">Verifique o filtro de busca ou crie um novo projeto.</p>
          {normalizedSearch.length > 0 && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/10"
            >
              Limpar busca
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map(project => {
          const client = clients.find(c => c.id === project.client_id);
          const property = properties.find(prop => prop.id === project.property_id);
          const stepsCount = project.steps?.length || 1;
          const isCompleted = project.steps?.[stepsCount - 1]?.status === ProjectStatus.COMPLETED;
          const progress = project.steps ? Math.round(((project.current_step_index) / (stepsCount - 1 || 1)) * 100) : 0;
          const isPending = project.steps?.some(s => s.status === ProjectStatus.PENDING);
          const urgency = getUrgencyLevel(project.deadline, isCompleted);

          return (
            <div
              key={project.id}
              className={`bg-white rounded-2xl border overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group relative ${urgency === 'expired' || urgency === 'critical' ? 'border-rose-200 ring-4 ring-rose-500/5' :
                urgency === 'warning' ? 'border-amber-200 ring-4 ring-amber-500/5' :
                  isPending ? 'border-rose-100' : 'border-slate-200/40'
                }`}
            >
              {urgency !== 'normal' && !isCompleted && (
                <div className={`absolute top-0 right-0 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm z-10 animate-pulse ${urgency === 'expired' ? 'bg-slate-900' : urgency === 'critical' ? 'bg-rose-600' : 'bg-amber-600'
                  }`}>
                  <CalendarClock size={10} /> {urgency === 'expired' ? 'PRAZO VENCIDO' : urgency === 'critical' ? 'PRAZO CRÍTICO' : 'PRAZO PRÓXIMO'}
                </div>
              )}

              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div onClick={() => onSelectProject(project.id)} className="cursor-pointer">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isPending ? 'text-rose-600 bg-rose-50' : 'text-primary bg-primary/10'
                      }`}>
                      ID: {project.id.slice(0, 8)}
                    </span>
                    <h3 className={`text-base font-black mt-1.5 transition-colors tracking-tight ${urgency === 'critical' ? 'text-rose-900' : 'text-secondary'
                      }`}>
                      {project.title}
                    </h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(project)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-primary/5"><Edit3 size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(project.id); }} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"><Trash2 size={16} /></button>
                  </div>
                </div>

                <div className="space-y-3 cursor-pointer" onClick={() => onSelectProject(project.id)}>
                  <div className="flex items-center gap-2 text-[13px] text-slate-600">
                    <User size={14} className="text-primary/40" />
                    <span className="truncate font-bold">{client?.name || 'Cliente'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-slate-500">
                    <MapPin size={14} className="text-primary/40" />
                    <span className="truncate font-medium">{property?.name}</span>
                  </div>
                  {project.deadline && (
                    <div className={`flex items-center gap-2 text-[10px] font-bold py-1 px-2 rounded-lg inline-flex ${urgency === 'expired' ? 'bg-slate-100 text-slate-900' :
                      urgency === 'critical' ? 'bg-rose-50 text-rose-600' :
                        urgency === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-primary/5 text-primary'
                      }`}>
                      <CalendarClock size={12} />
                      <span>Prazo: {new Date(project.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 cursor-pointer" onClick={() => onSelectProject(project.id)}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Progresso do Workflow</span>
                    <span className={`text-xs font-black ${isPending ? 'text-rose-600' : 'text-primary'}`}>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${isPending ? 'bg-rose-500' : 'bg-primary'}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-[9px] text-slate-400 uppercase font-black tracking-tight">
                      Etapa: <span className={isPending ? 'text-rose-700' : 'text-secondary'}>
                        {project.steps?.[project.current_step_index]?.label || 'Não iniciada'}
                      </span>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Projeto' : 'Novo Projeto'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Título do Projeto</label>
                  <input required type="text" placeholder="Ex: Georref. Fazenda Santa Luzia" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nº da Certificação</label>
                  <input type="text" placeholder="Ex: 500.000.000" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" value={formData.certificationNumber} onChange={e => setFormData({ ...formData, certificationNumber: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente</label>
                  <select required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Imóvel</label>
                  <select required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" value={formData.propertyId} onChange={e => setFormData({ ...formData, propertyId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Prazo de Entrega Final</label>
                <div className="relative">
                  <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    value={formData.deadline}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">* Este prazo ativará os alertas inteligentes do sistema.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Técnico</label>
                  <select required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" value={formData.professionalId} onChange={e => setFormData({ ...formData, professionalId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Serventia</label>
                  <select required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" value={formData.registryId} onChange={e => setFormData({ ...formData, registryId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {registries.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Serviço</label>
                <select required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" value={formData.serviceId} onChange={e => setFormData({ ...formData, serviceId: e.target.value })}>
                  <option value="">Selecione...</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark font-black uppercase tracking-widest shadow-lg shadow-primary/20">{editingId ? 'Salvar Alterações' : 'Criar Projeto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm text-center shadow-2xl animate-in zoom-in">
            <AlertTriangle className="mx-auto text-rose-500 mb-4" size={48} />
            <h3 className="text-lg font-bold mb-2">Excluir Projeto</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">Deseja realmente excluir este projeto? Esta ação apagará permanentemente todos os registros.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 border rounded-lg">Cancelar</button>
              <button onClick={() => { onDeleteProject(showDeleteConfirm); setShowDeleteConfirm(null); }} className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-bold">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
