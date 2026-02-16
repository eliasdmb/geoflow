
import React, { useState, useRef } from 'react';
import { Client } from '../types';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Plus,
  X,
  IdCard,
  Edit3,
  Trash2,
  AlertTriangle,
  FileDown,
  Printer,
  Loader2,
  Building2,
  Calendar
} from 'lucide-react';
import { formatCpfCnpj, isValidCpfOrCnpj } from '../utils';

interface ClientListProps {
  clients: Client[];
  onSaveClient: (client: Partial<Client>, id?: string) => void;
  onDeleteClient: (id: string) => void;
}

const ClientList: React.FC<ClientListProps> = ({ clients, onSaveClient, onDeleteClient }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [errors, setErrors] = useState<{ cpf_cnpj?: string }>({});

  const reportRef = useRef<HTMLDivElement>(null);

  const LOGO_URL = 'https://lh3.googleusercontent.com/d/1-Bjja5XYN3fTDVwbqzfvtnTyfQhFRDkq=s2000';

  const [formData, setFormData] = useState({
    name: '', marital_status: 'Casado(a)', profession: '', cpf_cnpj: '', rg: '', email: '', phone: '',
    street: '', block: '', lot: '', number: '', sector: '', city: '', cep: ''
  });

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setFormData({
      name: client.name,
      marital_status: client.marital_status,
      profession: client.profession,
      cpf_cnpj: client.cpf_cnpj,
      rg: client.rg,
      email: client.email,
      phone: client.phone,
      street: client.address?.street || '',
      block: client.address?.block || '',
      lot: client.address?.lot || '',
      number: client.address?.number || '',
      sector: client.address?.sector || '',
      city: client.address?.city || '',
      cep: client.address?.cep || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCpfOrCnpj(formData.cpf_cnpj)) {
      setErrors({ cpf_cnpj: 'CPF ou CNPJ inválido' });
      return;
    }

    onSaveClient({
      name: formData.name, marital_status: formData.marital_status, profession: formData.profession,
      cpf_cnpj: formData.cpf_cnpj, rg: formData.rg, email: formData.email, phone: formData.phone,
      address: {
        street: formData.street, block: formData.block, lot: formData.lot, number: formData.number,
        sector: formData.sector, city: formData.city, cep: formData.cep
      }
    }, editingId || undefined);

    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '', marital_status: 'Casado(a)', profession: '', cpf_cnpj: '', rg: '', email: '', phone: '',
      street: '', block: '', lot: '', number: '', sector: '', city: '', cep: ''
    });
    setErrors({});
    setEditingId(null);
  };

  const handleGeneratePDF = async () => {
    if (!reportRef.current || clients.length === 0) return;
    const html2pdfLib = (window as any).html2pdf;
    if (!html2pdfLib) {
      alert("Aguarde o carregamento do PDF...");
      return;
    }
    setIsGeneratingReport(true);
    try {
      const opt = {
        margin: 0,
        filename: `RELATORIO_CLIENTES_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          backgroundColor: '#ffffff'
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: ['.break-inside-avoid', 'table', 'tr']
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
      };
      await html2pdfLib().set(opt).from(reportRef.current).save();
    } catch (err) {
      console.error("Erro PDF:", err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Clientes</h2>
          <p className="text-sm text-slate-500">Gestão de contatos e proprietários rurais.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGeneratePDF}
            disabled={isGeneratingReport || clients.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-slate-500 bg-white border border-border-light rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 text-xs font-black uppercase tracking-widest"
          >
            {isGeneratingReport ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            <span className="hidden sm:inline">Relatório</span>
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-md shadow-primary/10 text-xs font-black uppercase tracking-widest"
          >
            <Plus size={16} /> <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <User size={48} className="mx-auto text-slate-200 mb-4" />
          <h3 className="text-lg font-bold text-slate-400">Nenhum cliente cadastrado</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map(client => (
            <div key={client.id} className="bg-white p-5 rounded-xl border border-slate-200/40 shadow-sm group hover:shadow-md transition-all relative overflow-hidden">
              <div className="flex justify-between items-start mb-2 relative z-10">
                <h3 className="font-bold text-slate-800 truncate pr-8 tracking-tight">{client.name}</h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-0">
                  <button onClick={() => handleEdit(client)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-primary/5"><Edit3 size={14} /></button>
                  <button onClick={() => setShowDeleteConfirm(client.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-4">{client.profession || 'Pessoa Física'}</p>
              <div className="space-y-2 text-[11px] text-slate-600 border-t border-slate-50 pt-4">
                <div className="flex items-center gap-2"><IdCard size={12} className="text-slate-300" /> <span className="font-mono">{client.cpf_cnpj}</span></div>
                <div className="flex items-center gap-2 truncate text-slate-500"><Mail size={12} className="text-slate-300" /> {client.email || 'Não informado'}</div>
                <div className="flex items-center gap-2"><Phone size={12} className="text-slate-300" /> {client.phone || 'Não informado'}</div>
                <div className="flex items-center gap-2"><MapPin size={12} className="text-slate-300" /> {client.address?.city || 'Cidade'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template do Relatório PDF (Invisível) */}
      <div className="hidden">
        <div ref={reportRef} className="p-[20mm] text-slate-900 font-sans" style={{ width: '210mm', boxSizing: 'border-box' }}>
          <div className="flex justify-between items-center border-b-2 border-slate-800 pb-6 mb-8">
            <div className="flex items-center gap-4">
              <img
                src={LOGO_URL}
                alt="Logo"
                className="w-16 h-16 object-contain"
                crossOrigin="anonymous"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800 leading-none">Relatório Geral de Clientes</h1>
                <div className="flex flex-col mt-1 text-primary font-black uppercase tracking-tighter">
                  <span className="text-sm">MétricaAgro</span>
                  <span className="text-[9px] text-slate-700">Serviços Agronômicos e Geomensura</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Emitido em</p>
              <div className="flex items-center gap-2 text-slate-700 font-bold mt-1 justify-end">
                <Calendar size={14} className="text-slate-400" />
                <span>{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>

          <table className="w-full text-left border-collapse table-auto">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 border border-slate-200 text-[10px] font-black uppercase text-slate-600">Nome / Profissão</th>
                <th className="p-3 border border-slate-200 text-[10px] font-black uppercase text-slate-600">CPF/CNPJ</th>
                <th className="p-3 border border-slate-200 text-[10px] font-black uppercase text-slate-600">Contato</th>
                <th className="p-3 border border-slate-200 text-[10px] font-black uppercase text-slate-600">Localização</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id} className="border-b border-slate-100">
                  <td className="p-3 border border-slate-200">
                    <p className="text-sm font-bold text-slate-800">{client.name}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase">{client.profession}</p>
                  </td>
                  <td className="p-3 border border-slate-200 font-mono text-xs">{client.cpf_cnpj}</td>
                  <td className="p-3 border border-slate-200 text-xs">
                    {client.phone}<br />{client.email}
                  </td>
                  <td className="p-3 border border-slate-200 text-xs">
                    {client.address?.city}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-8 animate-in zoom-in duration-300">
            <h2 className="text-xl font-bold mb-6">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
              <input required placeholder="Nome Completo" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input required placeholder="CPF/CNPJ" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.cpf_cnpj} onChange={e => setFormData({ ...formData, cpf_cnpj: formatCpfCnpj(e.target.value) })} />
                  {errors.cpf_cnpj && <p className="text-[10px] text-rose-500 mt-1">{errors.cpf_cnpj}</p>}
                </div>
                <input placeholder="Profissão" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.profession} onChange={e => setFormData({ ...formData, profession: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="RG" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.rg} onChange={e => setFormData({ ...formData, rg: e.target.value })} />
                <select className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.marital_status} onChange={e => setFormData({ ...formData, marital_status: e.target.value })}>
                  <option>Casado(a)</option><option>Solteiro(a)</option><option>Divorciado(a)</option><option>Viúvo(a)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="email" placeholder="E-mail" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                <input placeholder="Telefone" className="w-full p-2.5 border rounded-lg bg-slate-50" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <h4 className="font-bold text-xs uppercase text-slate-400 mt-4">Endereço</h4>
              <div className="grid grid-cols-3 gap-3">
                <input className="col-span-2 p-2 border rounded-lg bg-slate-50 text-sm" placeholder="Rua/Logradouro" value={formData.street} onChange={e => setFormData({ ...formData, street: e.target.value })} />
                <input className="p-2 border rounded-lg bg-slate-50 text-sm" placeholder="Nº" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} />
                <input className="p-2 border rounded-lg bg-slate-50 text-sm" placeholder="Quadra" value={formData.block} onChange={e => setFormData({ ...formData, block: e.target.value })} />
                <input className="p-2 border rounded-lg bg-slate-50 text-sm" placeholder="Lote" value={formData.lot} onChange={e => setFormData({ ...formData, lot: e.target.value })} />
                <input className="p-2 border rounded-lg bg-slate-50 text-sm" placeholder="CEP" value={formData.cep} onChange={e => setFormData({ ...formData, cep: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-6 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border rounded-lg font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 bg-primary text-white rounded-lg font-black uppercase tracking-widest hover:bg-primary-dark">Salvar Alterações</button>
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
            <p className="text-sm text-slate-500 mb-6">Deseja realmente excluir este cliente?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 border rounded-lg">Cancelar</button>
              <button onClick={() => { onDeleteClient(showDeleteConfirm); setShowDeleteConfirm(null); }} className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-bold">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientList;
