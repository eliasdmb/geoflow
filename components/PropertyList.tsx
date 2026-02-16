
import React, { useState } from 'react';
import { RuralProperty } from '../types';
import { Map as MapIcon, Landmark, Maximize, Plus, X, FileText, Building2, MapPin, Hash, Edit3, Trash2, AlertTriangle } from 'lucide-react';

interface PropertyListProps {
  properties: RuralProperty[];
  onSaveProperty: (property: Partial<RuralProperty>, id?: string) => void;
  onDeleteProperty: (id: string) => void;
}

const PropertyList: React.FC<PropertyListProps> = ({ properties, onSaveProperty, onDeleteProperty }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    area_ha: '',
    registration_number: '',
    municipality: '',
    cri: '',
    comarca: '',
    incra_code: ''
  });

  const handleEdit = (prop: RuralProperty) => {
    setEditingId(prop.id);
    setFormData({
      name: prop.name,
      area_ha: prop.area_ha.toString(),
      registration_number: prop.registration_number,
      municipality: prop.municipality,
      cri: prop.cri,
      comarca: prop.comarca,
      incra_code: prop.incra_code
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProperty({
      name: formData.name,
      area_ha: parseFloat(formData.area_ha),
      registration_number: formData.registration_number,
      municipality: formData.municipality,
      cri: formData.cri,
      comarca: formData.comarca,
      incra_code: formData.incra_code
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
      cri: '',
      comarca: '',
      incra_code: ''
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Imóveis Rurais</h2>
          <p className="text-sm text-slate-500">Base de dados das propriedades cadastradas.</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark shadow-md shadow-primary/10 text-xs font-black uppercase tracking-widest transition-all"><Plus size={16} /> Novo Imóvel</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map(prop => (
          <div key={prop.id} className="bg-white rounded-xl border border-border-light shadow-sm group hover:shadow-md transition-all p-5 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm"><MapIcon size={20} /></div>
                <div>
                  <h3 className="font-black text-secondary truncate max-w-[150px] tracking-tight">{prop.name}</h3>
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest">{prop.area_ha} ha</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(prop)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-primary/5"><Edit3 size={14} /></button>
                <button onClick={() => setShowDeleteConfirm(prop.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"><Trash2 size={14} /></button>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-50 flex-1">
              <InfoRow icon={<Hash size={12} />} label="Matrícula" value={prop.registration_number} />
              <InfoRow icon={<Landmark size={12} />} label="Município" value={prop.municipality} />
              <InfoRow icon={<FileText size={12} />} label="INCRA" value={prop.incra_code} />
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-8 animate-in zoom-in duration-300">
            <h2 className="text-xl font-bold mb-6">{editingId ? 'Editar Imóvel' : 'Cadastrar Imóvel'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto px-1">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Propriedade</label>
                <input required className="w-full p-2.5 bg-slate-50 border border-border-light rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Fazenda Santa Maria" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Área (ha)</label>
                <input required type="number" step="0.0001" className="w-full p-2.5 bg-slate-50 border border-border-light rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" value={formData.area_ha} onChange={e => setFormData({ ...formData, area_ha: e.target.value })} placeholder="0.0000" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Matrícula</label>
                <input required className="w-full p-2.5 bg-slate-50 border border-border-light rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" value={formData.registration_number} onChange={e => setFormData({ ...formData, registration_number: e.target.value })} placeholder="Nº do Registro" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código INCRA</label>
                <input required className="w-full p-2.5 bg-slate-50 border border-border-light rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" value={formData.incra_code} onChange={e => setFormData({ ...formData, incra_code: e.target.value })} placeholder="Código INCRA" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Comarca</label>
                <input required className="w-full p-2.5 bg-slate-50 border border-border-light rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" value={formData.comarca} onChange={e => setFormData({ ...formData, comarca: e.target.value })} placeholder="Comarca" />
              </div>

              <div className="mt-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Município</label>
                <input required className="w-full p-2.5 bg-slate-50 border border-border-light rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" value={formData.municipality} onChange={e => setFormData({ ...formData, municipality: e.target.value })} placeholder="Município" />
              </div>
              <div className="mt-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Serventia (CRI)</label>
                <input required className="w-full p-2.5 bg-slate-50 border border-border-light rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" value={formData.cri} onChange={e => setFormData({ ...formData, cri: e.target.value })} placeholder="Cartório de Registro" />
              </div>

              <div className="md:col-span-2 pt-6 flex gap-3 border-t mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-lg font-black uppercase tracking-widest hover:bg-primary-dark shadow-lg shadow-primary/10 transition-all">Salvar Imóvel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
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
