
import React, { useState } from 'react';
import { SigefCertification } from '../types';
import { ShieldCheck, Plus, X, Calendar, FileText, Landmark, DollarSign, ClipboardCheck, Edit3, Trash2, AlertTriangle } from 'lucide-react';

interface SigefCertificationListProps {
  certifications: SigefCertification[];
  onSaveCertification: (cert: Partial<SigefCertification>, id?: string) => void;
  onDeleteCertification: (id: string) => void;
}

const SigefCertificationList: React.FC<SigefCertificationListProps> = ({ certifications, onSaveCertification, onDeleteCertification }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cert_number: '', cert_date: '', art_number: '', contract_number: '', contract_value: '', is_registered: 'N'
  });

  const handleEdit = (cert: SigefCertification) => {
    setEditingId(cert.id);
    setFormData({
      cert_number: cert.cert_number, cert_date: cert.cert_date, art_number: cert.art_number,
      contract_number: cert.contract_number, contract_value: cert.contract_value.toString(),
      is_registered: cert.is_registered ? 'S' : 'N'
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCertification({
      cert_number: formData.cert_number, cert_date: formData.cert_date, art_number: formData.art_number,
      contract_number: formData.contract_number, contract_value: parseFloat(formData.contract_value) || 0,
      is_registered: formData.is_registered === 'S'
    }, editingId || undefined);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ cert_number: '', cert_date: '', art_number: '', contract_number: '', contract_value: '', is_registered: 'N' });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-slate-800 tracking-tight">Certificações SIGEF</h2><p className="text-sm text-slate-500">Gestão de registros do INCRA/SIGEF.</p></div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark shadow-lg shadow-primary/10 transition-all"><Plus size={16} /> Nova Certificação</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certifications.map(cert => (
          <div key={cert.id} className="bg-white rounded-xl border border-slate-200/40 group hover:shadow-md transition-all p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary shadow-sm"><ShieldCheck size={20} /></div>
                <div><h3 className="font-bold text-slate-800 text-sm tracking-tight">Nº {cert.cert_number}</h3><p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(cert.cert_date).toLocaleDateString()}</p></div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(cert)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-primary/5"><Edit3 size={16} /></button>
                <button onClick={() => setShowDeleteConfirm(cert.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="space-y-2 pt-3 border-t border-slate-50 text-[10px] text-slate-600">
              <p className="flex justify-between"><span className="text-slate-400 font-bold uppercase">ART:</span> <b>{cert.art_number}</b></p>
              <p className="flex justify-between"><span className="text-slate-400 font-bold uppercase">VALOR:</span> <b>{cert.contract_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b></p>
              <p className={`text-center font-bold px-2 py-1 rounded-lg mt-3 text-[9px] uppercase tracking-wider ${cert.is_registered ? 'bg-primary/5 text-primary border border-primary/20' : 'bg-rose-50 text-rose-600 border border-rose-100/50'}`}>
                {cert.is_registered ? 'REGISTRADO NO CRI' : 'PENDENTE DE REGISTRO'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-400/10 backdrop-blur-md">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl p-8 animate-in zoom-in duration-300">
            <h2 className="text-xl font-bold mb-6">{editingId ? 'Editar Certificação' : 'Nova Certificação'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required placeholder="Nº Certificação" className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={formData.cert_number} onChange={e => setFormData({ ...formData, cert_number: e.target.value })} />
              <input required type="date" className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={formData.cert_date} onChange={e => setFormData({ ...formData, cert_date: e.target.value })} />
              <input required placeholder="Nº ART" className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={formData.art_number} onChange={e => setFormData({ ...formData, art_number: e.target.value })} />
              <input placeholder="Contrato" className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={formData.contract_number} onChange={e => setFormData({ ...formData, contract_number: e.target.value })} />
              <input type="number" placeholder="Valor (R$)" className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={formData.contract_value} onChange={e => setFormData({ ...formData, contract_value: e.target.value })} />
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Registrado no CRI?</label><select className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={formData.is_registered} onChange={e => setFormData({ ...formData, is_registered: e.target.value })}><option value="S">Sim</option><option value="N">Não</option></select></div>
              <div className="md:col-span-2 pt-6 flex gap-3 border-t"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border rounded-lg">Cancelar</button><button type="submit" className="flex-1 py-3 bg-primary text-white rounded-lg font-bold">Salvar Certificação</button></div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-400/10 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-sm text-center shadow-2xl">
            <AlertTriangle className="mx-auto text-rose-500 mb-4" size={48} />
            <h3 className="text-lg font-bold mb-2">Confirmar Exclusão</h3>
            <p className="text-sm text-slate-500 mb-6">Confirmar remoção permanente do registro SIGEF?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 border rounded-lg">Não</button>
              <button onClick={() => { onDeleteCertification(showDeleteConfirm); setShowDeleteConfirm(null); }} className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-bold">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SigefCertificationList;
