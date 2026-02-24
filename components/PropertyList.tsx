import React, { useState } from 'react';
import { RuralProperty, Client } from '../types';
import {
  Plus,
  X,
  FileText,
  Building2,
  MapPin,
  Edit3,
  Trash2,
  AlertTriangle,
  Maximize2,
  Navigation,
  Landmark,
  Hash
} from 'lucide-react';

interface PropertyListProps {
  properties: RuralProperty[];
  clients: Client[];
  onSaveProperty: (property: Partial<RuralProperty>, id?: string) => void;
  onDeleteProperty: (id: string) => void;
}

const PropertyList: React.FC<PropertyListProps> = ({ properties, clients, onSaveProperty, onDeleteProperty }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    area_ha: '',
    registration_number: '',
    municipality: '',
    uf: '',
    cri: '',
    comarca: '',
    incra_code: '',
    client_id: ''
  });

  const handleEdit = (prop: RuralProperty) => {
    setEditingId(prop.id);
    setFormData({
      name: prop.name,
      area_ha: prop.area_ha.toString(),
      registration_number: prop.registration_number,
      municipality: prop.municipality,
      uf: prop.uf || '',
      cri: prop.cri,
      comarca: prop.comarca,
      incra_code: prop.incra_code,
      client_id: prop.client_id || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProperty({
      ...formData,
      area_ha: parseFloat(formData.area_ha)
    }, editingId || undefined);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      area_ha: '',
      registration_number: '',
      municipality: '',
      uf: '',
      cri: '',
      comarca: '',
      incra_code: '',
      client_id: ''
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Imóveis Rurais</h2>
          <p className="text-sm text-slate-500">Gestão de propriedades e matrículas.</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark shadow-md shadow-primary/10 text-xs font-black uppercase tracking-widest transition-all"><Plus size={16} /> Novo Imóvel</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map(prop => {
          const owner = clients.find(c => c.id === prop.client_id);
          return (
            <div key={prop.id} className="bg-white rounded-xl border border-slate-200/40 group hover:shadow-md transition-all p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm"><MapPin size={20} /></div>
                  <div>
                    <h3 className="font-bold text-slate-800 tracking-tight truncate max-w-[150px]">{prop.name}</h3>
                    <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider truncate max-w-[150px]">{owner?.name || 'Sem proprietário'}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(prop)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-primary-50"><Edit3 size={14} /></button>
                  <button onClick={() => setShowDeleteConfirm(prop.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="space-y-2 pt-3 border-t border-slate-50">
                <InfoRow icon={<Maximize2 size={12} />} label="Área" value={`${prop.area_ha} ha`} />
                <InfoRow icon={<FileText size={12} />} label="Matrícula" value={prop.registration_number} />
                <InfoRow icon={<Navigation size={12} />} label="Local" value={`${prop.municipality}/${prop.uf || '-'}`} />
                <InfoRow icon={<Building2 size={12} />} label="CRI" value={prop.cri} />
              </div>
            </div>
          );
        })}
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
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Novo Imóvel</h2>
              <p className="text-sm text-slate-500 mt-1">Cadastre os dados do imóvel rural.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto px-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Proprietário *</label>
                <select
                  required
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700"
                  value={formData.client_id}
                  onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                >
                  <option value="">Selecione o proprietário</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Nome do Imóvel *</label>
                <input required placeholder="Ex: Fazenda Boa Vista" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Área Total (ha) *</label>
                  <input required type="number" step="0.0001" placeholder="Ex: 150.50" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700" value={formData.area_ha} onChange={e => setFormData({ ...formData, area_ha: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Nº Matrícula *</label>
                  <input required placeholder="Ex: 12.345" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700" value={formData.registration_number} onChange={e => setFormData({ ...formData, registration_number: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Município *</label>
                  <input required placeholder="Ex: Montividiu" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700" value={formData.municipality} onChange={e => setFormData({ ...formData, municipality: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">UF *</label>
                  <input required placeholder="Ex: GO" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700 uppercase" maxLength={2} value={formData.uf} onChange={e => setFormData({ ...formData, uf: e.target.value.toUpperCase() })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">CRI *</label>
                  <input required placeholder="Ofício de Registro" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700" value={formData.cri} onChange={e => setFormData({ ...formData, cri: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Comarca *</label>
                  <input required placeholder="Ex: Rio Verde" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700" value={formData.comarca} onChange={e => setFormData({ ...formData, comarca: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Código INCRA *</label>
                <input required placeholder="Ex: 950.123..." className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700" value={formData.incra_code} onChange={e => setFormData({ ...formData, incra_code: e.target.value })} />
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
            <p className="text-sm text-slate-500 mb-6">Esta ação apagará permanentemente o imóvel rural.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 border rounded-lg">Cancelar</button>
              <button onClick={() => { onDeleteProperty(showDeleteConfirm); setShowDeleteConfirm(null); }} className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-bold">Sim, Excluir</button>
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

export default PropertyList;
