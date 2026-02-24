import React, { useState } from 'react';
import { Service, Professional, RuralProperty } from '../types';
import {
  ClipboardList,
  Plus,
  X,
  Edit3,
  Trash2,
  AlertTriangle,
  User,
  MapPin,
  FileCheck,
  Calendar,
  Hash,
  Download
} from 'lucide-react';
import { INITIAL_SERVICES } from '../constants';

interface ServiceListProps {
  services: Service[];
  onSaveService: (service: Partial<Service>, id?: string) => void;
  onDeleteService: (id: string) => void;
}

const ServiceList: React.FC<ServiceListProps> = ({ services, onSaveService, onDeleteService }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    items: [] as string[]
  });
  const [newItem, setNewItem] = useState('');

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setFormData({
      name: service.name || '',
      description: service.description || '',
      items: service.items || []
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveService(formData, editingId || undefined);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      items: []
    });
    setNewItem('');
    setEditingId(null);
  };

  const handleImportDefaults = () => {
    INITIAL_SERVICES.forEach(service => {
      // Check if service with same name exists to avoid duplicates (case-insensitive + trim)
      const isDuplicate = services.some(s =>
        s.name.trim().toLowerCase() === service.name.trim().toLowerCase()
      );

      if (!isDuplicate) {
        onSaveService({
          name: service.name,
          description: service.description,
          items: service.items
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Serviços</h2>
          <p className="text-sm text-slate-500">Gestão de modelos de serviços e atividades.</p>
        </div>
        <div className="flex items-center gap-2">
          {services.length === 0 && (
            <button
              onClick={handleImportDefaults}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all text-xs font-bold"
            >
              <Download size={16} /> Importar Padrões
            </button>
          )}
          <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark shadow-md shadow-primary/10 text-xs font-black uppercase tracking-widest transition-all">
            <Plus size={16} /> Novo Serviço
          </button>
        </div>
      </div>

      {services.length === 0 && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center animate-in fade-in duration-700">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm text-slate-300">
            <ClipboardList size={40} />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhum serviço cadastrado</h3>
          <p className="text-sm text-slate-500 max-w-xs mx-auto mb-8">Comece criando um novo serviço ou importe nossos modelos padrão para agilizar seu trabalho.</p>
          <button
            onClick={handleImportDefaults}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
            <Download size={20} /> Importar Serviços Padrão
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(service => (
          <div key={service.id} className="bg-white rounded-xl border border-slate-200/40 group hover:shadow-md transition-all p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 tracking-tight truncate max-w-[150px]">{service.name}</h3>
                  <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider truncate max-w-[150px]">
                    {service.items.length} Atividades
                  </p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(service)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-primary-50">
                  <Edit3 size={14} />
                </button>
                <button onClick={() => setShowDeleteConfirm(service.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-50">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Resumo das Atividades:</div>
              <div className="space-y-1">
                {service.items && service.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-600">
                    <div className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
                {service.items && service.items.length > 3 && (
                  <div className="text-[9px] text-slate-400 font-medium italic">+{service.items.length - 3} mais...</div>
                )}
                {(!service.items || service.items.length === 0) && (
                  <div className="text-[10px] text-slate-400 italic">Nenhuma atividade listada.</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-400/10 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-8 animate-in zoom-in duration-300 relative my-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">{editingId ? 'Editar Serviço' : 'Novo Serviço'}</h2>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                <ClipboardList size={14} className="text-indigo-500" />
                Defina o nome e as atividades detalhadas deste serviço.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Nome do Serviço *</label>
                <input
                  required
                  placeholder="Ex: Georreferenciamento de Imóvel Rural"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Descrição (Opcional)</label>
                <textarea
                  placeholder="Breve descrição do objetivo do serviço..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700 min-h-[80px] resize-none"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Atividades Detalhadas *</label>
                <div className="flex gap-2 mb-3">
                  <input
                    placeholder="Adicionar atividade..."
                    className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700"
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newItem.trim()) {
                          setFormData({ ...formData, items: [...formData.items, newItem.trim()] });
                          setNewItem('');
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newItem.trim()) {
                        setFormData({ ...formData, items: [...formData.items, newItem.trim()] });
                        setNewItem('');
                      }
                    }}
                    className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl group animate-in slide-in-from-left-2 duration-200">
                      <span className="text-sm font-medium text-slate-600 truncate mr-4">{item}</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) })}
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {formData.items.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl">
                      <p className="text-xs text-slate-400 font-medium italic">Nenhuma atividade adicionada.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3.5 px-6 bg-slate-100 text-slate-700 rounded-3xl font-bold hover:bg-slate-200 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-3.5 px-6 bg-primary text-white rounded-3xl font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all">
                  {editingId ? 'Salvar Edição' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-400/10 backdrop-blur-md">
          <div className="bg-white rounded-2xl p-6 max-w-sm text-center shadow-2xl">
            <AlertTriangle className="mx-auto text-rose-500 mb-4" size={48} />
            <h3 className="text-lg font-bold mb-2">Confirmar Exclusão</h3>
            <p className="text-sm text-slate-500 mb-6">Esta ação apagará permanentemente o registro deste serviço.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 border rounded-lg">Cancelar</button>
              <button onClick={() => { onDeleteService(showDeleteConfirm); setShowDeleteConfirm(null); }} className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-bold">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode, label: string, value: string | number }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2 text-[10px] text-slate-600">
    <div className="text-slate-400 shrink-0">{icon}</div>
    <span className="font-semibold text-slate-400 uppercase text-[8px] w-14 shrink-0">{label}:</span>
    <span className="truncate">{value || 'N/A'}</span>
  </div>
);

export default ServiceList;
