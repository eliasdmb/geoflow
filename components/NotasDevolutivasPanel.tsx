import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  CalendarCheck,
  AlertCircle,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { NotaDevolutiva, Exigencia } from '../types';

interface NotasDevolutivasPanelProps {
  projectId: string;
}

const emptyNota = { numero_nota: '', protocolo: '', vinculo: '' };

const NotasDevolutivasPanel: React.FC<NotasDevolutivasPanelProps> = ({ projectId }) => {
  const { user } = useAuth();
  const [notas, setNotas] = useState<NotaDevolutiva[]>([]);
  const [exigencias, setExigencias] = useState<Exigencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNotas, setExpandedNotas] = useState<Set<string>>(new Set());

  // Formulário nova nota
  const [showForm, setShowForm] = useState(false);
  const [formNota, setFormNota] = useState(emptyNota);
  const [formExigencias, setFormExigencias] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);

  // Conclusão de exigência
  const [concludingId, setConcludingId] = useState<string | null>(null);
  const [concludeDate, setConcludeDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingConclusion, setSavingConclusion] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: notasData }, { data: exigData }] = await Promise.all([
        supabase
          .from('notas_devolutivas')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('exigencias')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
      ]);
      setNotas(notasData || []);
      setExigencias(exigData || []);
      // Expandir todas as notas com exigências pendentes por padrão
      const withPending = new Set<string>(
        (notasData || [])
          .filter(n => (exigData || []).some(e => e.nota_id === n.id && e.status === 'pendente'))
          .map(n => n.id)
      );
      setExpandedNotas(withPending);
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpanded = (id: string) => {
    setExpandedNotas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addExigenciaField = () => setFormExigencias(prev => [...prev, '']);

  const removeExigenciaField = (idx: number) =>
    setFormExigencias(prev => prev.filter((_, i) => i !== idx));

  const updateExigenciaField = (idx: number, val: string) =>
    setFormExigencias(prev => prev.map((v, i) => (i === idx ? val : v)));

  const handleSaveNota = async () => {
    if (!user) return;
    if (!formNota.numero_nota.trim() && !formNota.protocolo.trim() && !formNota.vinculo.trim()) return;
    const validExigencias = formExigencias.filter(e => e.trim());
    setSaving(true);
    try {
      const { data: notaData, error: notaError } = await supabase
        .from('notas_devolutivas')
        .insert({
          user_id: user.id,
          project_id: projectId,
          numero_nota: formNota.numero_nota.trim(),
          protocolo: formNota.protocolo.trim(),
          vinculo: formNota.vinculo.trim()
        })
        .select()
        .single();

      if (notaError) throw notaError;

      if (validExigencias.length > 0 && notaData) {
        const payload = validExigencias.map(desc => ({
          user_id: user.id,
          nota_id: notaData.id,
          descricao: desc.trim(),
          status: 'pendente'
        }));
        const { error: exigError } = await supabase.from('exigencias').insert(payload);
        if (exigError) throw exigError;
      }

      setFormNota(emptyNota);
      setFormExigencias(['']);
      setShowForm(false);
      await fetchData();
      if (notaData) {
        setExpandedNotas(prev => new Set([...prev, notaData.id]));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNota = async (notaId: string) => {
    if (!user) return;
    await supabase.from('notas_devolutivas').delete().eq('id', notaId).eq('user_id', user.id);
    await fetchData();
  };

  const handleAddExigencia = async (notaId: string, descricao: string) => {
    if (!user || !descricao.trim()) return;
    await supabase.from('exigencias').insert({
      user_id: user.id,
      nota_id: notaId,
      descricao: descricao.trim(),
      status: 'pendente'
    });
    await fetchData();
  };

  const handleDeleteExigencia = async (exigId: string) => {
    if (!user) return;
    await supabase.from('exigencias').delete().eq('id', exigId).eq('user_id', user.id);
    await fetchData();
  };

  const handleConclude = async () => {
    if (!user || !concludingId || !concludeDate) return;
    setSavingConclusion(true);
    try {
      await supabase
        .from('exigencias')
        .update({ status: 'concluida', concluded_at: concludeDate })
        .eq('id', concludingId)
        .eq('user_id', user.id);
      setConcludingId(null);
      await fetchData();
    } finally {
      setSavingConclusion(false);
    }
  };

  const handleReopen = async (exigId: string) => {
    if (!user) return;
    await supabase
      .from('exigencias')
      .update({ status: 'pendente', concluded_at: null })
      .eq('id', exigId)
      .eq('user_id', user.id);
    await fetchData();
  };

  const totalPendente = exigencias.filter(
    e => e.status === 'pendente' && notas.some(n => n.id === e.nota_id)
  ).length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 tracking-tight">Notas Devolutivas</h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
              {notas.length} {notas.length === 1 ? 'nota' : 'notas'} cadastrada{notas.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totalPendente > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-[10px] font-bold uppercase tracking-wider">
              <AlertCircle size={12} />
              {totalPendente} pendente{totalPendente !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={() => { setShowForm(true); setFormNota(emptyNota); setFormExigencias(['']); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-indigo-200"
          >
            <Plus size={14} /> Nova Nota
          </button>
        </div>
      </div>

      {/* Formulário nova nota */}
      {showForm && (
        <div className="p-5 bg-indigo-50/40 border-b border-indigo-100 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Nova Nota Devolutiva</p>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest px-1">N. da Nota</label>
              <input
                type="text"
                placeholder="Ex: 001/2026"
                value={formNota.numero_nota}
                onChange={e => setFormNota(p => ({ ...p, numero_nota: e.target.value }))}
                className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-400 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest px-1">Protocolo</label>
              <input
                type="text"
                placeholder="Ex: 2026.0001"
                value={formNota.protocolo}
                onChange={e => setFormNota(p => ({ ...p, protocolo: e.target.value }))}
                className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-400 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest px-1">Vínculo</label>
              <input
                type="text"
                placeholder="Ex: CRI Rio Verde"
                value={formNota.vinculo}
                onChange={e => setFormNota(p => ({ ...p, vinculo: e.target.value }))}
                className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-400 transition-all"
              />
            </div>
          </div>

          {/* Exigências */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest px-1">Exigências</label>
              <button
                onClick={addExigenciaField}
                className="flex items-center gap-1 text-[9px] text-indigo-600 font-bold hover:text-indigo-800 uppercase tracking-wider transition-colors"
              >
                <Plus size={11} /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {formExigencias.map((exig, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Exigência ${idx + 1}`}
                    value={exig}
                    onChange={e => updateExigenciaField(idx, e.target.value)}
                    className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-400 transition-all"
                  />
                  {formExigencias.length > 1 && (
                    <button
                      onClick={() => removeExigenciaField(idx)}
                      className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveNota}
              disabled={saving || (!formNota.numero_nota.trim() && !formNota.protocolo.trim() && !formNota.vinculo.trim())}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Modal concluir exigência */}
      {concludingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <CalendarCheck size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Concluir Exigência</h4>
                <p className="text-[10px] text-slate-400">Informe a data de conclusão</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 mb-5">
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Data de Conclusão</label>
              <input
                type="date"
                value={concludeDate}
                onChange={e => setConcludeDate(e.target.value)}
                className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-300/40 focus:border-emerald-400 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConcludingId(null)}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConclude}
                disabled={savingConclusion || !concludeDate}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
              >
                {savingConclusion ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de notas */}
      <div className="divide-y divide-slate-50">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-medium">Carregando...</span>
          </div>
        ) : notas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
              <FileText size={22} />
            </div>
            <p className="text-xs text-slate-400 font-medium">Nenhuma nota devolutiva cadastrada.</p>
            <p className="text-[10px] text-slate-300 mt-1">Clique em "Nova Nota" para começar.</p>
          </div>
        ) : (
          notas.map(nota => {
            const notaExigs = exigencias.filter(e => e.nota_id === nota.id);
            const pendentes = notaExigs.filter(e => e.status === 'pendente').length;
            const concluidas = notaExigs.filter(e => e.status === 'concluida').length;
            const isExpanded = expandedNotas.has(nota.id);

            return (
              <NotaCard
                key={nota.id}
                nota={nota}
                exigencias={notaExigs}
                pendentes={pendentes}
                concluidas={concluidas}
                isExpanded={isExpanded}
                onToggle={() => toggleExpanded(nota.id)}
                onDeleteNota={() => handleDeleteNota(nota.id)}
                onAddExigencia={(desc) => handleAddExigencia(nota.id, desc)}
                onDeleteExigencia={handleDeleteExigencia}
                onConclude={(id) => { setConcludingId(id); setConcludeDate(new Date().toISOString().split('T')[0]); }}
                onReopen={handleReopen}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

/* ----------- Subcomponente NotaCard ----------- */
interface NotaCardProps {
  nota: NotaDevolutiva;
  exigencias: Exigencia[];
  pendentes: number;
  concluidas: number;
  isExpanded: boolean;
  onToggle: () => void;
  onDeleteNota: () => void;
  onAddExigencia: (desc: string) => void;
  onDeleteExigencia: (id: string) => void;
  onConclude: (id: string) => void;
  onReopen: (id: string) => void;
}

const NotaCard: React.FC<NotaCardProps> = ({
  nota, exigencias, pendentes, concluidas,
  isExpanded, onToggle, onDeleteNota,
  onAddExigencia, onDeleteExigencia, onConclude, onReopen
}) => {
  const [newExigDesc, setNewExigDesc] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newExigDesc.trim()) return;
    setAdding(true);
    await onAddExigencia(newExigDesc.trim());
    setNewExigDesc('');
    setAdding(false);
  };

  return (
    <div className="group">
      {/* Cabeçalho da nota */}
      <div
        className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-2 h-8 rounded-full shrink-0 transition-all ${pendentes > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">
                Nota {nota.numero_nota || '—'}
              </span>
              {nota.protocolo && (
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                  Protocolo: {nota.protocolo}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">
              {nota.vinculo || <span className="text-slate-400 italic">Sem vínculo</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {pendentes > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-amber-100">
              <Clock size={10} /> {pendentes} pend.
            </span>
          )}
          {concluidas > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-emerald-100">
              <CheckCircle2 size={10} /> {concluidas} ok
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDeleteNota(); }}
            className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            title="Excluir nota"
          >
            <Trash2 size={13} />
          </button>
          <div className="text-slate-400 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      {/* Exigências (expandidas) */}
      {isExpanded && (
        <div className="px-5 pb-5 bg-slate-50/40 border-t border-slate-100 animate-in slide-in-from-top-1 duration-200">
          {/* Lista */}
          {exigencias.length === 0 ? (
            <p className="text-[10px] text-slate-400 italic py-3">Nenhuma exigência cadastrada para esta nota.</p>
          ) : (
            <div className="pt-3 space-y-2">
              {exigencias.map(exig => (
                <div
                  key={exig.id}
                  className={`flex items-start justify-between gap-3 p-3 rounded-2xl border transition-all group/exig ${
                    exig.status === 'concluida'
                      ? 'bg-emerald-50/60 border-emerald-100'
                      : 'bg-white border-slate-100 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                      exig.status === 'concluida' ? 'text-emerald-500' : 'text-amber-500'
                    }`}>
                      {exig.status === 'concluida'
                        ? <CheckCircle2 size={14} />
                        : <Clock size={13} />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-medium leading-snug ${exig.status === 'concluida' ? 'text-emerald-700 line-through decoration-emerald-400' : 'text-slate-700'}`}>
                        {exig.descricao}
                      </p>
                      {exig.status === 'concluida' && exig.concluded_at && (
                        <p className="text-[9px] text-emerald-500 font-semibold mt-0.5 uppercase tracking-wider">
                          Concluída em {new Date(exig.concluded_at + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {exig.status === 'pendente' ? (
                      <button
                        onClick={() => onConclude(exig.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95 shadow-sm whitespace-nowrap"
                        title="Marcar como concluída"
                      >
                        <CheckCircle2 size={10} /> Concluir
                      </button>
                    ) : (
                      <button
                        onClick={() => onReopen(exig.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-300 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap"
                        title="Reabrir exigência"
                      >
                        <Clock size={10} /> Reabrir
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteExigencia(exig.id)}
                      className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover/exig:opacity-100"
                      title="Excluir exigência"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Adicionar exigência inline */}
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              placeholder="Adicionar nova exigência..."
              value={newExigDesc}
              onChange={e => setNewExigDesc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-400 transition-all"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newExigDesc.trim()}
              className="flex items-center gap-1.5 px-4 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 shadow-sm whitespace-nowrap"
            >
              {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
              Adicionar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotasDevolutivasPanel;
