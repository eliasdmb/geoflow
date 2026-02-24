
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
    name: '',
    crea: '',
    cpf: '',
    address: '',
    phone: '',
    email: '',
    professional_title: '',
    credential_code: ''
  });

  const handleEdit = (prof: Professional) => {
    setEditingId(prof.id);
    setFormData({
      name: prof.name,
      crea: prof.crea,
      cpf: prof.cpf,
      address: prof.address,
      phone: prof.phone,
      email: prof.email,
      professional_title: prof.professional_title || prof.specialty || '',
      credential_code: prof.credential_code || prof.incra_code || ''
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
      name: formData.name,
      crea: formData.crea,
      cpf: formData.cpf,
      address: formData.address,
      phone: formData.phone,
      email: formData.email,
      professional_title: formData.professional_title,
      credential_code: formData.credential_code,
      // Maintain old fields for db compatibility if needed
      specialty: formData.professional_title,
      incra_code: formData.credential_code
    }, editingId || undefined);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      crea: '',
      cpf: '',
      address: '',
      phone: '',
      email: '',
      professional_title: '',
      credential_code: ''
    });
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
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark shadow-md shadow-primary/10 text-xs font-black uppercase tracking-widest transition-all"><Plus size={16} /> Novo Técnico</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {professionals.map(prof => (
          <div key={prof.id} className="bg-white rounded-xl border border-slate-200/40 group hover:shadow-md transition-all p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-base shadow-sm">{prof.name.charAt(0)}</div>
                <div>
                  <h3 className="font-bold text-slate-800 tracking-tight">{prof.name}</h3>
                  <p className="text-[9px] text-primary font-bold uppercase tracking-wider">{prof.professional_title || prof.specialty}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(prof)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-primary-50"><Edit3 size={14} /></button>
                <button onClick={() => setShowDeleteConfirm(prof.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="space-y-2 pt-3 border-t border-slate-50">
              <InfoRow icon={<Award size={12} />} label="CREA" value={prof.crea} />
              <InfoRow icon={<ShieldCheck size={12} />} label="CRED" value={prof.credential_code || prof.incra_code || ''} />
              <InfoRow icon={<Phone size={12} />} label="Fone" value={prof.phone} />
              <InfoRow icon={<Mail size={12} />} label="Email" value={prof.email} />
              <InfoRow icon={<MapPin size={12} />} label="Endereço" value={prof.address} />
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
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Novo Profissional</h2>
              <p className="text-sm text-slate-500 mt-1">Cadastre os dados do profissional responsável técnico.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto px-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Nome Completo *</label>
                <input required placeholder="Ex: Eng. Agrimensor João Silva" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">CREA *</label>
                  <input required placeholder="Ex: GO-123456" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700" value={formData.crea} onChange={e => setFormData({ ...formData, crea: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">CPF *</label>
                  <input required placeholder="Ex: 123.456.789-00" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: formatCpfCnpj(e.target.value) })} />
                  {errors.cpf && <p className="text-[10px] text-rose-500 mt-1">{errors.cpf}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Endereço *</label>
                <input required placeholder="Ex: Rua das Flores, 100, Montividiu/GO" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Telefone *</label>
                  <input required placeholder="Ex: (64) 99999-0000" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">E-mail *</label>
                  <input required type="email" placeholder="Ex: contato@exemplo.com" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Título Profissional *</label>
                  <input required placeholder="Engenheiro Agrimensor" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700" value={formData.professional_title} onChange={e => setFormData({ ...formData, professional_title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Código Credenciado *</label>
                  <input required placeholder="Ex: CRED-001" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-slate-700" value={formData.credential_code} onChange={e => setFormData({ ...formData, credential_code: e.target.value })} />
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
