
import React, { useState, useMemo } from 'react';
import {
    FileText,
    Filter,
    Download,
    Calendar,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Info,
    CheckCircle2,
    Clock,
    ArrowRightLeft
} from 'lucide-react';
import {
    FinancialTransaction,
    TransactionType,
    TransactionStatus
} from '../types';
import { formatDate } from '../utils';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface FinancialReportProps {
    transactions: FinancialTransaction[];
}

type EntryTypeFilter = 'EFETIVADO' | 'PENDENTE' | 'AMBOS';
type ReportTypeFilter = 'REAL' | 'PROJETADO';

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const FinancialReport: React.FC<FinancialReportProps> = ({ transactions }) => {
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        d.setDate(0);
        return d.toISOString().split('T')[0];
    });
    const [entryType, setEntryType] = useState<EntryTypeFilter>('AMBOS');
    const [reportType, setReportType] = useState<ReportTypeFilter>('REAL');

    const filteredData = useMemo(() => {
        return transactions.filter(t => {
            const date = new Date(t.due_date);
            const start = new Date(startDate);
            const end = new Date(endDate);

            // Filter by period
            const inPeriod = date >= start && date <= end;
            if (!inPeriod) return false;

            // Filter by Entry Type (Status)
            if (entryType === 'EFETIVADO' && t.status !== TransactionStatus.PAID) return false;
            if (entryType === 'PENDENTE' && t.status !== TransactionStatus.PENDING) return false;

            // Filter by Report Type (Calculation Rule)
            if (reportType === 'REAL' && t.status !== TransactionStatus.PAID) return false;
            // Saldo Projetado includes both PAID and PENDING, so no additional filtering here 
            // as the Entry Type filter already handles granular status filtering if active.

            return true;
        });
    }, [transactions, startDate, endDate, entryType, reportType]);

    const stats = useMemo(() => {
        let totalRevenue = 0;
        let totalExpenses = 0;

        filteredData.forEach(t => {
            const amount = parseFloat(String(t.amount)) || 0;
            if (t.type === TransactionType.INCOME) {
                totalRevenue += amount;
            } else {
                totalExpenses += amount;
            }
        });

        return {
            revenue: totalRevenue,
            expenses: totalExpenses,
            balance: totalRevenue - totalExpenses
        };
    }, [filteredData]);

    const chartData = useMemo(() => {
        return [
            { name: 'Receitas', valor: stats.revenue, color: '#1b4332' },
            { name: 'Despesas', valor: stats.expenses, color: '#ef4444' }
        ];
    }, [stats]);

    const exportCSV = () => {
        const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Status', 'Valor'];
        const rows = filteredData.map(t => [
            formatDate(t.due_date),
            t.description,
            t.category,
            t.type,
            t.status,
            t.amount.toString()
        ]);

        const content = [headers, ...rows].map(e => e.join(';')).join('\n');
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_financeiro_${reportType.toLowerCase()}_${startDate}_${endDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 text-white">
                            <FileText size={22} />
                        </div>
                        <div className="flex flex-col">
                            <span className="leading-none">Relatório Financeiro</span>
                            <p className="text-[10px] text-slate-500 mt-1">Análise de desempenho e projeções.</p>
                        </div>
                    </h2>
                </div>
                <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200/40"
                >
                    <Download size={14} /> Exportar CSV
                </button>
            </div>

            {/* Filters Box */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/40 shadow-sm space-y-5">
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-indigo-600" />
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtros de Análise</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Período Inicial</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Período Final</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tipo de Lançamento</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {(['EFETIVADO', 'PENDENTE', 'AMBOS'] as EntryTypeFilter[]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setEntryType(type)}
                                    className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${entryType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                >
                                    {type === 'EFETIVADO' ? 'Efetiv.' : type === 'PENDENTE' ? 'Pend.' : 'Ambos'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tipo de Relatório</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {(['REAL', 'PROJETADO'] as ReportTypeFilter[]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setReportType(type)}
                                    className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${reportType === type ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                                >
                                    {type === 'REAL' ? 'Saldo Real' : 'Saldo Proj.'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/40 shadow-sm border-l-4 border-l-primary">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-primary/5 rounded-lg flex items-center justify-center text-primary shadow-sm">
                            <TrendingUp size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receitas</span>
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 tracking-tight">{formatCurrency(stats.revenue)}</h4>
                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 tracking-wider">Acumulado no período</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/40 shadow-sm border-l-4 border-l-rose-500">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600 shadow-sm">
                            <TrendingDown size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Despesas</span>
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 tracking-tight">{formatCurrency(stats.expenses)}</h4>
                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 tracking-wider">Total de débitos</p>
                </div>

                <div className={`bg-white p-5 rounded-2xl border border-slate-200/40 shadow-sm border-l-4 ${stats.balance >= 0 ? 'border-l-indigo-500' : 'border-l-amber-500'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${stats.balance >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                            <DollarSign size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resultado</span>
                    </div>
                    <h4 className={`text-xl font-bold tracking-tight ${stats.balance >= 0 ? 'text-indigo-900' : 'text-amber-900'}`}>{formatCurrency(stats.balance)}</h4>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider ${reportType === 'REAL' ? 'bg-primary/10 text-primary-dark font-black' : 'bg-indigo-100 text-indigo-700'}`}>
                            {reportType === 'REAL' ? 'Real' : 'Projetado'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Chart & Instructions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                        <TrendingUp size={16} className="text-indigo-500" /> Comparativo de Fluxo
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={40}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-4 bg-slate-900 p-8 rounded-3xl text-white shadow-xl flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Info size={100} /></div>
                    <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        Regras de Cálculo
                    </h3>
                    <div className="space-y-4 relative z-10">
                        <div className="flex gap-3">
                            <CheckCircle2 size={16} className="text-primary-light shrink-0" />
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Saldo Real</p>
                                <p className="text-[11px] text-slate-300">Considera exclusivamente lançamentos efetivados (status pago).</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <ArrowRightLeft size={16} className="text-indigo-400 shrink-0" />
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Saldo Projetado</p>
                                <p className="text-[11px] text-slate-300">Soma valores efetivados aos valores ainda pendentes no período.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Info size={16} className="text-amber-400 shrink-0" />
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Atualização</p>
                                <p className="text-[11px] text-slate-300">O relatório é atualizado em tempo real ao alterar qualquer filtro.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        Detalhamento dos Lançamentos ({filteredData.length})
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Descrição</th>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <Clock size={32} className="mx-auto text-slate-200 mb-2" />
                                        <p className="text-xs font-bold text-slate-400 uppercase italic">Nenhum registro encontrado no período</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-all group">
                                        <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                            {formatDate(t.due_date)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-slate-800">{t.description}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">{t.category}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${t.type === TransactionType.INCOME ? 'bg-primary/5 text-primary font-black' : 'bg-rose-50 text-rose-600'}`}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase ${t.status === TransactionStatus.PAID ? 'bg-primary/10 text-primary-dark font-black' : 'bg-amber-100 text-amber-700'}`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-black text-xs ${t.type === TransactionType.INCOME ? 'text-primary-dark font-black' : 'text-rose-700'}`}>
                                            {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FinancialReport;
