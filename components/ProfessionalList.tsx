
import React, { useState } from 'react';
import { Professional } from '../types';
import { UserRound, Award, ShieldCheck, Plus, X, Phone, Mail, MapPin, IdCard, Briefcase, Hash, AlertCircle, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { formatCpfCnpj, validateCPF } from '../utils';

interface ProfessionalListProps {
  professionals: Professional[];
  onSaveProfessional: (professional: Partial<Professional>, id?: string) => void;
  onDeleteProfessional: (id: string) => void;
}

const ProfessionalList: React.FC<ProfessionalListProps> = ({ professionals, onSaveProfessional, onDeleteProfessional }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ cpf?: string }>({});

  const [formData, setFormData] = useState({
    name: '', crea: '', specialty: '', cpf: '', phone: '', email: '', address: '', incra_code: ''
  });

  const handleEdit = (prof: Professional) => {
    setEditingId(prof.id);
    setFormData({
      name: prof.name, crea: prof.crea, specialty: prof.specialty, cpf: prof.cpf,
      phone: prof.phone, email: prof.email, address: prof.address, incra_code: prof.incra_code
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCPF(formData.cpf)) {
      setErrors({ cpf: 'CPF inválido' });
      return;
    }

    onSaveProfessional({
      name: formData.name, crea: formData.crea, specialty: formData.specialty, cpf: formData.cpf,
      phone: formData.phone, email: formData.email, address: formData.address, incra_code: formData.incra_code
    }, editingId || undefined);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', crea: '', specialty: '', cpf: '', phone: '', email: '', address: '', incra_code: '' });
    setErrors({});
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Responsáveis Técnicos</h2>
          <p className="text-sm text-slate-500">Gestão de profissionais credenciados.</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-700 shadow-md shadow-primary-200/50 text-xs font-bold transition-all"><Plus size={16} /> Novo Técnico</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {professionals.map(prof => (
          <div key={prof.id} className="bg-white rounded-xl border border-slate-200/40 group hover:shadow-md transition-all p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-base shadow-sm">{prof.name.charAt(0)}</div>
                <div>
                  <h3 className="font-bold text-slate-800 tracking-tight">{prof.name}</h3>
                  <p className="text-[9px] text-primary font-bold uppercase tracking-wider">{prof.specialty}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(prof)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-primary-50"><Edit3 size={14} /></button>
                <button onClick={() => setShowDeleteConfirm(prof.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="space-y-2 pt-3 border-t border-slate-50">
              <InfoRow icon={<Award size={12} />} label="CREA" value={prof.crea} />
              <InfoRow icon={<Hash size={12} />} label="INCRA" value={prof.incra_code} />
              <InfoRow icon={<Phone size={12} />} label="Fone" value={prof.phone} />
              <InfoRow icon={<Mail size={12} />} label="Email" value={prof.email} />
              <InfoRow icon={<MapPin size={12} />} label="Endereço" value={prof.address} />
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-8 animate-in zoom-in duration-300">
            <h2 className="text-xl font-bold mb-6">{editingId ? 'Editar Técnico' : 'Novo Técnico'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Nome Completo" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="CREA" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.crea} onChange={e => setFormData({ ...formData, crea: e.target.value })} />
                <input required placeholder="Código INCRA" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.incra_code} onChange={e => setFormData({ ...formData, incra_code: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Especialidade" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value })} />
                <div>
                  <input required placeholder="CPF" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: formatCpfCnpj(e.target.value) })} />
                  {errors.cpf && <p className="text-[10px] text-rose-500 mt-1">{errors.cpf}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input required type="email" placeholder="E-mail" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                <input required placeholder="Telefone" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <input required placeholder="Endereço Completo" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              <div className="flex gap-3 pt-6 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border rounded-lg font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-lg font-bold">Salvar Técnico</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm text-center shadow-2xl">
            <AlertTriangle className="mx-auto text-rose-500 mb-4" size={48} />
            <h3 className="text-lg font-bold mb-2">Remover Técnico</h3>
            <p className="text-sm text-slate-500 mb-6">Deseja realmente remover o profissional do sistema?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 border rounded-lg">Cancelar</button>
              <button onClick={() => { onDeleteProfessional(showDeleteConfirm); setShowDeleteConfirm(null); }} className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-bold">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2 text-[10px] text-slate-600">
    <div className="text-slate-400 shrink-0">{icon}</div>
    <span className="font-semibold text-slate-400 uppercase text-[8px] w-12 shrink-0">{label}:</span>
    <span className="truncate">{value || 'N/A'}</span>
  </div>
);

export default ProfessionalList;
