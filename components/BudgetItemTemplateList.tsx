
import React, { useState } from 'react';
import { BudgetItemTemplate } from '../types';
import { Library, Plus, X, Tag, DollarSign, Search, Trash2, Edit3, AlertTriangle } from 'lucide-react';

interface BudgetItemTemplateListProps {
  templates: BudgetItemTemplate[];
  onSaveTemplate: (template: Partial<BudgetItemTemplate>, id?: string) => void;
  onDeleteTemplate: (id: string) => void;
}

const BudgetItemTemplateList: React.FC<BudgetItemTemplateListProps> = ({ templates, onSaveTemplate, onDeleteTemplate }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    description: '', default_price: '', category: 'Campo'
  });

  const categories = ['Campo', 'Escritório', 'Taxas/Processos', 'Materiais', 'Logística', 'Geral'];

  const handleEdit = (item: BudgetItemTemplate) => {
    setEditingId(item.id);
    setFormData({
      description: item.description, default_price: item.default_price.toString(), category: item.category
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTemplate({
      description: formData.description,
      default_price: parseFloat(formData.default_price) || 0,
      category: formData.category
    }, editingId || undefined);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ description: '', default_price: '', category: 'Campo' });
    setEditingId(null);
  };

  const filtered = templates.filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-slate-800 tracking-tight">Biblioteca de Itens</h2><p className="text-sm text-slate-500">Componentes recorrentes para orçamentos.</p></div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark shadow-lg shadow-primary/10 transition-all"><Plus size={16} /> Novo Item</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-3.5 border-b border-slate-200/60 bg-slate-50/50 flex items-center gap-3">
          <Search size={16} className="text-slate-400" />
          <input className="bg-transparent text-xs w-full outline-none font-medium placeholder:text-slate-400" placeholder="Buscar na biblioteca..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[9px] uppercase font-bold text-slate-400 tracking-widest border-b border-slate-200/60">
              <tr>
                <th className="px-6 py-3">Descrição Item</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3">Valor (R$)</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-700 tracking-tight">{item.description}</td>
                  <td className="px-6 py-3.5"><span className="px-2 py-0.5 bg-slate-100/80 text-slate-500 border border-slate-200/40 rounded text-[9px] font-bold uppercase tracking-wider">{item.category}</span></td>
                  <td className="px-6 py-3.5 font-mono font-bold text-primary">{item.default_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-3.5 text-right flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-primary/5"><Edit3 size={14} /></button>
                    <button onClick={() => setShowDeleteConfirm(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-400/10 backdrop-blur-md">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-8 animate-in zoom-in duration-300">
            <h2 className="text-xl font-bold mb-6">{editingId ? 'Editar Item Modelo' : 'Novo Item Modelo'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Descrição</label><input required className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Categoria</label><select className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Preço Sugerido</label><input type="number" step="0.01" className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={formData.default_price} onChange={e => setFormData({ ...formData, default_price: e.target.value })} /></div>
              </div>
              <div className="flex gap-3 pt-6 border-t mt-4"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border rounded-lg">Cancelar</button><button type="submit" className="flex-1 py-3 bg-primary text-white rounded-lg font-bold">Salvar Item</button></div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-400/10 backdrop-blur-md">
          <div className="bg-white rounded-2xl p-6 max-w-sm text-center">
            <AlertTriangle className="mx-auto text-rose-500 mb-4" size={48} />
            <h3 className="text-lg font-bold mb-2">Excluir Modelo</h3>
            <p className="text-sm text-slate-500 mb-6">Confirmar remoção da biblioteca?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 border rounded-lg">Não</button>
              <button onClick={() => { onDeleteTemplate(showDeleteConfirm); setShowDeleteConfirm(null); }} className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-bold">Sim</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetItemTemplateList;
