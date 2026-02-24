
import React, { useState } from 'react';
import { Registry } from '../types';
import { Landmark, Plus, X, Hash, MapPin, Search, Trash2, AlertTriangle, Building2, Edit3 } from 'lucide-react';

interface RegistryListProps {
  registries: Registry[];
  onSaveRegistry: (registry: Partial<Registry>, id?: string) => void;
  onDeleteRegistry: (id: string) => void;
}

const RegistryList: React.FC<RegistryListProps> = ({ registries, onSaveRegistry, onDeleteRegistry }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', cns: '', municipality: '', uf: 'GO' });

  const handleEdit = (reg: Registry) => {
    setEditingId(reg.id);
    setFormData({ name: reg.name, cns: reg.cns, municipality: reg.municipality, uf: reg.uf });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRegistry(formData, editingId || undefined);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', cns: '', municipality: '', uf: 'GO' });
    setEditingId(null);
  };

  const filtered = registries.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Serventias (Cartórios)</h2>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark shadow-primary/10 text-xs font-bold transition-all"><Plus size={16} /> Nova Serventia</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(registry => (
          <div key={registry.id} className="bg-white rounded-xl border border-slate-200/40 group hover:shadow-md transition-all p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary shadow-sm"><Landmark size={20} /></div>
                <div><h3 className="font-bold text-slate-800 text-sm leading-tight tracking-tight">{registry.name}</h3><p className="text-[10px] text-primary font-bold mt-1 uppercase tracking-wider">CNS: {registry.cns}</p></div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(registry)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-primary/5"><Edit3 size={16} /></button>
                <button onClick={() => setShowDeleteConfirm(registry.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-3 border-t border-slate-50"><MapPin size={12} className="text-slate-300" /> {registry.municipality} - {registry.uf}</div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-400/10 backdrop-blur-md">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-8 animate-in zoom-in duration-300">
            <h2 className="text-xl font-bold mb-6">{editingId ? 'Editar Serventia' : 'Nova Serventia'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Nome do Cartório" className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="CNS" className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={formData.cns} onChange={e => setFormData({ ...formData, cns: e.target.value })} />
                <input required placeholder="Município" className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={formData.municipality} onChange={e => setFormData({ ...formData, municipality: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-6 border-t"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border rounded-lg">Cancelar</button><button type="submit" className="flex-1 py-3 bg-primary text-white rounded-lg font-bold">Salvar Serventia</button></div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-400/10 backdrop-blur-md">
          <div className="bg-white rounded-2xl p-6 max-w-sm text-center shadow-2xl">
            <AlertTriangle className="mx-auto text-rose-500 mb-4" size={48} />
            <h3 className="text-lg font-bold mb-2">Excluir Serventia</h3>
            <p className="text-sm text-slate-500 mb-6">Confirmar remoção do sistema?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 border rounded-lg">Não</button>
              <button onClick={() => { onDeleteRegistry(showDeleteConfirm); setShowDeleteConfirm(null); }} className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-bold">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistryList;
