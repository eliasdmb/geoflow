
import React, { useState } from 'react';
import { Service } from '../types';
import { ClipboardList, Plus, X, CheckCircle2, Info, DollarSign, FileText, Trash2, Edit3, AlertTriangle } from 'lucide-react';

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
    name: '', description: '', items: '', base_price: ''
  });

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setFormData({
      name: service.name, description: service.description,
      items: (service.items || []).join('\n'),
      base_price: (service.base_price || 0).toString()
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveService({
      name: formData.name, description: formData.description,
      items: formData.items.split('\n').filter(item => item.trim() !== ''),
      base_price: parseFloat(formData.base_price) || 0
    }, editingId || undefined);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', items: '', base_price: '' });
    setEditingId(null);
  };

  const useTemplate = () => {
    setFormData({
      name: 'Georreferenciamento de Imóvel Rural (Padrão INCRA)',
      description: 'Prestação de serviços técnicos conforme Lei nº 10.267/2001.',
      items: [
        'Levantamento com GNSS RTK', 'Implantação de Marcos', 'Elaboração de Planta',
        'Memorial Descritivo', 'Certificação SIGEF'
      ].join('\n'),
      base_price: '5000'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-slate-800 tracking-tight">Catálogo de Serviços</h2><p className="text-sm text-slate-500">Serviços técnicos padronizados.</p></div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark shadow-lg shadow-primary/10 text-xs font-black uppercase tracking-widest transition-all"><Plus size={16} /> Novo Serviço</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {services.map(service => (
          <div key={service.id} className="bg-white rounded-xl border border-slate-200/40 group hover:shadow-md transition-all overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-200/40 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm"><ClipboardList size={20} /></div>
                <div>
                  <h3 className="font-bold text-slate-800 tracking-tight">{service.name}</h3>
                  <p className="text-primary font-black text-xs">{service.base_price?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(service)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-primary/5"><Edit3 size={16} /></button>
                <button onClick={() => setShowDeleteConfirm(service.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500 italic leading-relaxed">{service.description}</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(service.items || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[9px] font-bold text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50"><div className="w-1 h-1 rounded-full bg-primary/50 mt-1.5 shrink-0"></div>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl p-8 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{editingId ? 'Editar Serviço' : 'Novo Serviço'}</h2>
              <button onClick={useTemplate} className="text-[10px] font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-full">Usar Modelo Padrão</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
              <input required placeholder="Nome do Serviço" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              <textarea placeholder="Descrição" className="w-full p-2.5 border rounded-lg bg-slate-50" rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              <textarea placeholder="Itens (um por linha)" className="w-full p-2.5 border rounded-lg bg-slate-50 font-mono text-xs" rows={5} value={formData.items} onChange={e => setFormData({ ...formData, items: e.target.value })} />
              <div className="flex items-center gap-2"><DollarSign size={16} className="text-slate-400" /><input type="number" placeholder="Preço Base" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.base_price} onChange={e => setFormData({ ...formData, base_price: e.target.value })} /></div>
              <div className="flex gap-3 pt-6 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-dark shadow-xl shadow-primary/10">Salvar no Catálogo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm text-center shadow-2xl">
            <AlertTriangle className="mx-auto text-rose-500 mb-4" size={48} />
            <h3 className="text-lg font-bold mb-2">Excluir Serviço</h3>
            <p className="text-sm text-slate-500 mb-6">Confirmar exclusão definitiva do catálogo?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 border rounded-lg">Manter</button>
              <button onClick={() => { onDeleteService(showDeleteConfirm); setShowDeleteConfirm(null); }} className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-bold">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceList;
