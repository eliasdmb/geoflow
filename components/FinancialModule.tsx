
import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Plus,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  X,
  Trash2,
  FileText,
  Briefcase,
  PieChart as PieIcon,
  Calculator,
  CreditCard as CreditCardIcon,
  Layers,
  Landmark
} from 'lucide-react';
import {
  Project,
  FinancialTransaction,
  TransactionType,
  TransactionStatus,
  CreditCard,
  CreditCardExpense,
  Account,
  AccountType
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
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ReportPDF from './ReportPDF';

interface FinancialModuleProps {
  transactions: FinancialTransaction[];
  projects: Project[];
  creditCards: CreditCard[];
  creditCardExpenses: CreditCardExpense[];
  onSaveTransaction: (transaction: Partial<FinancialTransaction>, id?: string) => void;
  onDeleteTransaction: (id: string) => void;
  onSaveCreditCard: (card: Partial<CreditCard>, id?: string) => void;
  onDeleteCreditCard: (id: string) => void;
  onSaveCreditCardExpense: (expense: Partial<CreditCardExpense>, id?: string) => void;
  onDeleteCreditCardExpense: (id: string) => void;
  onSaveAccount: (account: Partial<Account>, id?: string) => void;
  onDeleteAccount: (id: string) => void;
  accounts: Account[];
}

const formatCurrency = (value: any) => {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const FinancialModule: React.FC<FinancialModuleProps> = ({
  transactions,
  projects,
  creditCards,
  creditCardExpenses,
  onSaveTransaction,
  onDeleteTransaction,
  onSaveCreditCard,
  onDeleteCreditCard,
  onSaveCreditCardExpense,
  onDeleteCreditCardExpense,
  onSaveAccount,
  onDeleteAccount,
  accounts
}) => {
  const [activeTab, setActiveTab] = useState<'FLUXO' | 'CARTOES' | 'RELATORIOS'>('FLUXO');
  const [balanceMode, setBalanceMode] = useState<'EFETIVADO' | 'PROJETADO'>('EFETIVADO');
  const [showModal, setShowModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | 'ALL'>('ALL');

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransactionStatus>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'Pessoal' | 'Empresa'>('ALL');

  // Report states
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportType, setReportType] = useState<'ALL' | TransactionType>('ALL');
  const [reportCategory, setReportCategory] = useState('');
  const [reportData, setReportData] = useState<FinancialTransaction[]>([]);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: TransactionType.INCOME,
    category: 'Serviços',
    status: TransactionStatus.PENDING,
    payment_method: 'PIX' as any,
    due_date: new Date().toISOString().split('T')[0],
    project_id: '',
    account: '',
    from_account_id: '',
    to_account_id: '',
    scope: 'Empresa' as 'Pessoal' | 'Empresa',
    notes: '',
    repeat_type: 'none' as 'none' | 'installment' | 'recurrence',
    installments_count: '1',
    recurrence_period: 'monthly' as 'monthly' | 'weekly'
  });

  const availableAccounts = useMemo(() => {
    const accounts = new Set<string>();
    transactions.forEach(t => {
      if (t.account) accounts.add(t.account);
      if (t.from_account_id) accounts.add(t.from_account_id);
      if (t.to_account_id) accounts.add(t.to_account_id);
    });
    return Array.from(accounts);
  }, [transactions]);

  const [cardFormData, setCardFormData] = useState({
    name: '',
    credit_limit: '',
    closing_day: '1',
    due_day: '10'
  });

  const [expenseFormData, setExpenseFormData] = useState({
    description: '',
    amount: '',
    card_id: '',
    category: 'Outros',
    date: new Date().toISOString().split('T')[0],
    installments: '1',
    project_id: ''
  });

  const [newAccountFormData, setNewAccountFormData] = useState({
    name: '',
    type: AccountType.CHECKING,
    initial_balance: ''
  });

  // Cálculo Virtual de Faturas
  const creditCardData = useMemo(() => {
    if (!Array.isArray(creditCards)) return [];

    return creditCards.map(card => {
      const invoices: Record<string, { total: number, items: any[] }> = {};

      if (Array.isArray(creditCardExpenses)) {
        creditCardExpenses
          .filter(e => e && e.card_id === card.id)
          .forEach(expense => {
            const installments = parseInt(String(expense.installments)) || 1;
            const installmentAmount = (expense.amount || 0) / installments;
            const expenseDate = new Date(expense.date);

            if (!isNaN(expenseDate.getTime())) {
              for (let i = 0; i < installments; i++) {
                const installmentDate = new Date(expenseDate);
                installmentDate.setMonth(expenseDate.getMonth() + i);

                // Regra de fechamento
                const isAfterClosing = expenseDate.getDate() >= (card.closing_day || 1);
                const invoiceMonth = new Date(installmentDate);
                if (isAfterClosing) {
                  invoiceMonth.setMonth(invoiceMonth.getMonth() + 1);
                }

                const key = `${invoiceMonth.getFullYear()}-${(invoiceMonth.getMonth() + 1).toString().padStart(2, '0')}`;
                if (!invoices[key]) invoices[key] = { total: 0, items: [] };

                invoices[key].total += installmentAmount;
                invoices[key].items.push({
                  ...expense,
                  current_installment: i + 1,
                  installment_amount: installmentAmount
                });
              }
            }
          });
      }

      return { ...card, invoices };
    });
  }, [creditCards, creditCardExpenses]);

  // Cálculos de Resumo
  const stats = useMemo(() => {
    const scopeFiltered = transactions.filter(t => {
      if (scopeFilter === 'ALL') return true;
      if (!t.scope) return scopeFilter === 'Empresa';
      return t.scope === scopeFilter;
    });

    const balance = scopeFiltered
      .filter(t => t.status === TransactionStatus.PAID)
      .reduce((acc, t) => {
        if (t.type === TransactionType.TRANSFER) return acc;
        if (t.type === TransactionType.INCOME) return acc + (parseFloat(String(t.amount)) || 0);
        if (t.type === TransactionType.EXPENSE) return acc - (parseFloat(String(t.amount)) || 0);
        return acc;
      }, 0);

    const receivable = scopeFiltered
      .filter(t => t.type === TransactionType.INCOME && t.status === TransactionStatus.PENDING)
      .reduce((acc, t) => acc + (parseFloat(String(t.amount)) || 0), 0);

    const payable = scopeFiltered
      .filter(t => t.type === TransactionType.EXPENSE && t.status === TransactionStatus.PENDING)
      .reduce((acc, t) => acc + (parseFloat(String(t.amount)) || 0), 0);

    return { balance, receivable, payable, projected: balance + receivable - payable };
  }, [transactions, scopeFilter]);

  // Dados para Gráfico de Fluxo de Caixa
  const chartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
    }).reverse();

    return last6Months.map(month => {
      const monthTransactions = transactions.filter(t => {
        const d = new Date(t.due_date);
        return d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }) === month;
      });

      const scopeMonthTransactions = monthTransactions.filter(t => {
        if (scopeFilter === 'ALL') return true;
        if (!t.scope) return scopeFilter === 'Empresa';
        return t.scope === scopeFilter;
      });

      const filteredIncomeTransactions = scopeMonthTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .filter(t => balanceMode === 'EFETIVADO' ? t.status === TransactionStatus.PAID : true);

      const filteredExpenseTransactions = scopeMonthTransactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .filter(t => balanceMode === 'EFETIVADO' ? t.status === TransactionStatus.PAID : true);

      const income = filteredIncomeTransactions
        .reduce((acc, t) => acc + (parseFloat(String(t.amount)) || 0), 0);

      const expense = filteredExpenseTransactions
        .reduce((acc, t) => acc + (parseFloat(String(t.amount)) || 0), 0);

      return { name: month, Entradas: income, Saídas: expense, Saldo: income - expense };
    });
  }, [transactions, balanceMode, scopeFilter]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchesProject = projectFilter === 'ALL' || t.project_id === projectFilter;
      const matchesScope = scopeFilter === 'ALL' || (t.scope || 'Empresa') === scopeFilter;
      return matchesSearch && matchesType && matchesStatus && matchesProject && matchesScope;
    });
  }, [transactions, searchTerm, typeFilter, statusFilter, projectFilter, scopeFilter]);

  const handleEditTransaction = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction);
    setFormData({
      description: transaction.description,
      amount: String(transaction.amount),
      type: transaction.type,
      category: transaction.category,
      status: transaction.status,
      payment_method: transaction.payment_method,
      due_date: new Date(transaction.due_date).toISOString().split('T')[0],
      project_id: transaction.project_id || '',
      account: transaction.account || '',
      from_account_id: transaction.from_account_id || '', // Populate for transfers
      to_account_id: transaction.to_account_id || '',     // Populate for transfers
      scope: transaction.scope || 'Empresa',
      notes: transaction.notes || '',
      repeat_type: 'none',
      installments_count: '1',
      recurrence_period: 'monthly'
    });
    setShowModal(true);
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
      onDeleteTransaction(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount)) {
      alert('Por favor, insira um valor numérico válido para o campo "Valor".');
      return;
    }

    // Common data for all transactions in a series
    const commonData = {
      description: formData.description,
      type: formData.type,
      category: formData.category,
      status: formData.status,
      payment_method: formData.payment_method,
      project_id: formData.project_id || undefined,
      account: formData.account || undefined,
      from_account_id: formData.from_account_id || undefined,
      to_account_id: formData.to_account_id || undefined,
      scope: formData.scope,
      notes: formData.notes || undefined
    };

    if (formData.repeat_type === 'none' || editingTransaction) {
      // Single transaction
      onSaveTransaction({
        ...(editingTransaction && { id: editingTransaction.id }),
        ...commonData,
        amount: parsedAmount,
        due_date: formData.due_date
      }, editingTransaction?.id);
    } else {
      // Multiple transactions (Installments or Recurrence)
      const count = parseInt(formData.installments_count) || 1;
      const parentId = crypto.randomUUID();
      const baseDate = new Date(formData.due_date);

      for (let i = 0; i < count; i++) {
        const dueDate = new Date(baseDate);
        if (formData.repeat_type === 'installment' || formData.recurrence_period === 'monthly') {
          dueDate.setMonth(baseDate.getMonth() + i);
        } else if (formData.recurrence_period === 'weekly') {
          dueDate.setDate(baseDate.getDate() + (i * 7));
        }

        const amount = formData.repeat_type === 'installment'
          ? Number((parsedAmount / count).toFixed(2))
          : parsedAmount;

        onSaveTransaction({
          ...commonData,
          amount,
          due_date: dueDate.toISOString().split('T')[0],
          parent_id: parentId,
          occurrence_number: i + 1,
          total_occurrences: count,
          is_recurring: formData.repeat_type === 'recurrence'
        });
      }
    }

    setShowModal(false);
    setEditingTransaction(null);
    setFormData({
      description: '',
      amount: '',
      type: TransactionType.INCOME,
      category: 'Serviços',
      status: TransactionStatus.PENDING,
      payment_method: 'PIX' as any,
      due_date: new Date().toISOString().split('T')[0],
      project_id: '',
      account: '',
      from_account_id: '',
      to_account_id: '',
      scope: 'Empresa',
      notes: '',
      repeat_type: 'none',
      installments_count: '1',
      recurrence_period: 'monthly'
    });
  };

  const handleAccountFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAccountFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedInitialBalance = parseFloat(newAccountFormData.initial_balance);
    if (isNaN(parsedInitialBalance)) {
      alert('Por favor, insira um valor numérico válido para o campo "Saldo Inicial".');
      return;
    }

    onSaveAccount({
      ...(editingAccount && { id: editingAccount.id }),
      name: newAccountFormData.name,
      type: newAccountFormData.type,
      initial_balance: parsedInitialBalance
    }, editingAccount?.id);
    setShowAccountModal(false);
    setEditingAccount(null);
    setNewAccountFormData({
      name: '',
      type: AccountType.CHECKING,
      initial_balance: ''
    });
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setNewAccountFormData({
      name: account.name,
      type: account.type,
      initial_balance: String(account.initial_balance)
    });
    setShowAccountModal(true);
  };

  const handleDeleteAccountConfig = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta? Isso não apagará as transações vinculadas, mas a conta não aparecerá mais nos filtros e relatórios.')) {
      onDeleteAccount(id);
    }
  };

  const calculateAccountBalance = (account: Account) => {
    const accountTransactions = transactions.filter(t =>
      t.status === TransactionStatus.PAID &&
      (t.account === account.id || t.account === account.name)
    );

    const balanceChange = accountTransactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) return acc + parseFloat(String(t.amount));
      if (t.type === TransactionType.EXPENSE) return acc - parseFloat(String(t.amount));
      return acc;
    }, 0);

    return account.initial_balance + balanceChange;
  };

  const handleGenerateReport = () => {
    const filtered = transactions.filter(t => {
      const matchesDateRange = (!reportStartDate || new Date(t.due_date) >= new Date(reportStartDate)) &&
        (!reportEndDate || new Date(t.due_date) <= new Date(reportEndDate));
      const matchesType = reportType === 'ALL' || t.type === reportType;
      const matchesCategory = !reportCategory || t.category.toLowerCase().includes(reportCategory.toLowerCase());
      return matchesDateRange && matchesType && matchesCategory;
    });
    setReportData(filtered);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/10 text-white">
              <Calculator size={22} />
            </div>
            <div className="flex flex-col">
              <span className="leading-none">Módulo Financeiro</span>
              <p className="text-[10px] text-slate-500 mt-1">Gestão de receitas e despesas.</p>
            </div>
          </h2>
        </div>
        <div className="flex flex-col xl:flex-row xl:items-center gap-2">
          <div className="flex flex-wrap bg-slate-100/50 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setActiveTab('FLUXO')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${activeTab === 'FLUXO' ? 'bg-white text-primary shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Fluxo
            </button>
            <button
              onClick={() => setActiveTab('CARTOES')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${activeTab === 'CARTOES' ? 'bg-white text-primary shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Cartões
            </button>
            <button
              onClick={() => setActiveTab('RELATORIOS')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${activeTab === 'RELATORIOS' ? 'bg-white text-primary shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Relatórios
            </button>
          </div>
          <div className="flex flex-wrap bg-slate-100/50 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setBalanceMode('EFETIVADO')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${balanceMode === 'EFETIVADO' ? 'bg-white text-primary shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Efetivado
            </button>
            <button
              onClick={() => setBalanceMode('PROJETADO')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${balanceMode === 'PROJETADO' ? 'bg-white text-primary shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Projetado
            </button>
          </div>
          <div className="flex flex-wrap bg-slate-100/50 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setScopeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${scopeFilter === 'ALL' ? 'bg-white text-primary shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setScopeFilter('Pessoal')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${scopeFilter === 'Pessoal' ? 'bg-white text-primary shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Pessoal
            </button>
            <button
              onClick={() => setScopeFilter('Empresa')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${scopeFilter === 'Empresa' ? 'bg-white text-primary shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Empresa
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => activeTab === 'FLUXO' ? setShowModal(true) : setShowExpenseModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark shadow-md shadow-primary/10 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all"
            >
              <Plus size={16} /> {activeTab === 'FLUXO' ? 'Novo Lançamento' : 'Nova Despesa Card'}
            </button>
            <button
              onClick={() => {
                setEditingAccount(null);
                setNewAccountFormData({ name: '', type: AccountType.CHECKING, initial_balance: '' });
                setShowAccountModal(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md shadow-blue-200/50 text-[10px] sm:text-xs font-bold transition-all"
            >
              <Plus size={16} /> Nova Conta
            </button>
          </div>
        </div>
      </div>

      {
        activeTab === 'FLUXO' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Saldo Atual" value={balanceMode === 'EFETIVADO' ? stats.balance : stats.projected} icon={<DollarSign className="text-primary" />} sub={balanceMode === 'EFETIVADO' ? 'Transações conciliadas' : 'Projeção fluxo futuro'} />
              <StatCard label="A Receber" value={stats.receivable} icon={<TrendingUp className="text-blue-600" />} sub="Próximos vencimentos" />
              <StatCard label="A Pagar" value={stats.payable} icon={<TrendingDown className="text-rose-600" />} sub="Contas pendentes" />
              <StatCard label="Saldo Projetado" value={stats.projected} icon={<TrendingUp className="text-violet-600" />} sub="Projeção fluxo futuro" />
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/40 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                <Landmark size={18} className="text-blue-500" /> Minhas Contas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.length > 0 ? (
                  accounts.map(account => (
                    <div key={account.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-between group relative overflow-hidden">
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-lg backdrop-blur-sm border border-slate-200 shadow-sm">
                        <button
                          onClick={() => handleEditAccount(account)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 rounded-md transition-colors"
                          title="Editar conta"
                        >
                          <FileText size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteAccountConfig(account.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-md transition-colors"
                          title="Excluir conta"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">{account.type}</p>
                        <p className="font-bold text-slate-800 text-lg pr-12">{account.name}</p>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between items-center text-xs text-slate-500">
                          <span>Saldo Inicial:</span>
                          <span>{formatCurrency(account.initial_balance)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-600">Saldo Atual:</span>
                          <span className={`font-black ${calculateAccountBalance(account) >= 0 ? 'text-primary' : 'text-rose-600'}`}>
                            {formatCurrency(calculateAccountBalance(account))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 col-span-full">Nenhuma conta cadastrada ainda.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/40 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={18} className="text-primary-light" /> Fluxo de Caixa Mensal
                  </h3>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="Entradas" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="Saídas" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Controle por Projeto</h3>
                <div className="flex-1 space-y-4">
                  {projects.slice(0, 5).map(p => {
                    const projectTotal = transactions.filter(t => t && t.project_id === p.id).reduce((acc, t) => t.type === TransactionType.INCOME ? acc + (parseFloat(String(t.amount)) || 0) : acc - (parseFloat(String(t.amount)) || 0), 0);
                    return (
                      <div key={p.id} className="group">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{p.title || 'Projeto'}</span>
                          <span className={`text-xs font-black ${projectTotal >= 0 ? 'text-primary' : 'text-rose-600'}`}>{formatCurrency(projectTotal)}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full ${projectTotal >= 0 ? 'bg-primary' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, Math.abs(projectTotal / 1000) * 10)}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tabela de Resumo Mensal */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={18} className="text-primary" /> Resumo de Fluxo Mensal
                </h3>
              </div>
              <div className="table-responsive">
                <div className="inline-block min-w-full align-middle">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-6 py-4">Mês/Período</th>
                        <th className="px-6 py-4 text-right">Entradas (+)</th>
                        <th className="px-6 py-4 text-right">Saídas (-)</th>
                        <th className="px-6 py-4 text-right whitespace-nowrap">Saldo Líquido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...chartData].reverse().map((data: any) => (
                        <tr key={data.name} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-tight">{data.name}</td>
                          <td className="px-6 py-4 text-right text-xs font-bold text-primary font-black">{formatCurrency(data.Entradas)}</td>
                          <td className="px-6 py-4 text-right text-xs font-bold text-rose-500">{formatCurrency(data.Saídas)}</td>
                          <td className={`px-6 py-4 text-right text-xs font-black ${data.Saldo >= 0 ? 'text-primary-dark font-black' : 'text-rose-700'}`}>
                            {formatCurrency(data.Saldo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <div className="table-responsive">
                <div className="inline-block min-w-full align-middle">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Descrição</th>
                        <th className="px-6 py-4">Conta</th>
                        <th className="px-6 py-4">Escopo</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Valor</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-all group">
                          <td className="px-6 py-4 text-xs font-bold text-slate-600 whitespace-nowrap">{formatDate(t.due_date)}</td>
                          <td className="px-6 py-4 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              {t.occurrence_number && t.total_occurrences && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black border border-slate-200">
                                  {t.occurrence_number}/{t.total_occurrences}
                                </span>
                              )}
                              <p className="text-xs font-bold text-slate-800">{t.description}</p>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{t.category}</p>
                            {t.notes && <p className="text-[9px] text-slate-400 mt-1">{t.notes}</p>}
                          </td>
                          <td className="px-6 py-4 text-[10px] font-bold text-slate-600 whitespace-nowrap">
                            {accounts.find(a => a.id === t.account)?.name || t.account || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => onSaveTransaction({ id: t.id, scope: t.scope === 'Pessoal' ? 'Empresa' : 'Pessoal' }, t.id)}
                              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.scope === 'Pessoal' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}
                            >
                              {t.scope || 'Empresa'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => onSaveTransaction({ id: t.id, status: t.status === TransactionStatus.PAID ? TransactionStatus.PENDING : TransactionStatus.PAID }, t.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase whitespace-nowrap ${t.status === TransactionStatus.PAID ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700'}`}
                            >
                              {t.status === TransactionStatus.PAID ? <CheckCircle2 size={12} /> : <Clock size={12} />} {t.status === TransactionStatus.PAID ? 'Efetivado' : 'Previsto'}
                            </button>
                            {t.payment_method && (
                              <span className="block mt-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">{t.payment_method}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-black whitespace-nowrap">
                            {t.type === TransactionType.INCOME ? '+' : t.type === TransactionType.EXPENSE ? '-' : '±'} {formatCurrency(t.amount)}
                          </td>
                          <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                            <button onClick={() => handleEditTransaction(t)} className="p-2 text-slate-300 hover:text-blue-500 rounded-lg"><FileText size={14} /></button>
                            <button onClick={() => handleDeleteTransaction(t.id)} className="p-2 text-slate-300 hover:text-rose-500 rounded-lg"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        activeTab === 'CARTOES' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creditCardData.map(card => {
                const now = new Date();
                const currentKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                const currentInvoice = (card.invoices && card.invoices[currentKey]) || { total: 0, items: [] };
                const limit = parseFloat(String(card.credit_limit)) || 0;

                return (
                  <div key={card.id} className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 text-slate-900 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity text-slate-900"><CreditCardIcon size={120} /></div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-10">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Cartão</span>
                          <h4 className="text-lg font-bold tracking-tight">{card.name || 'Sem nome'}</h4>
                        </div>
                        <div className="w-10 h-7 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center shadow-sm"><div className="w-6 h-4 bg-primary/20 rounded-sm"></div></div>
                      </div>
                      <div className="mb-8">
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Fatura Atual</p>
                        <h3 className="text-2xl font-bold tracking-tight text-primary">{formatCurrency(currentInvoice.total)}</h3>
                      </div>
                      <div className="flex justify-between items-end border-t border-slate-50 pt-5">
                        <div className="grid grid-cols-2 gap-6">
                          <div><p className="text-[8px] font-bold uppercase text-slate-400 tracking-widest">Vencimento</p><p className="text-xs font-bold text-slate-700">Dia {card.due_day || '-'}</p></div>
                          <div><p className="text-[8px] font-bold uppercase text-slate-400 tracking-widest">Limite</p><p className="text-xs font-bold text-slate-700">{formatCurrency(limit)}</p></div>
                        </div>
                        <button onClick={() => onDeleteCreditCard(card.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setShowCardModal(true)} className="group border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-12 hover:border-primary hover:bg-primary/5 transition-all text-slate-400 hover:text-primary">
                <Plus size={32} /><span className="text-xs font-black uppercase tracking-widest mt-2">Novo Cartão</span>
              </button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden mt-8">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between"><h3 className="text-xl font-black text-slate-800">Lançamentos em Cartão</h3></div>
              <div className="p-8">
                {!Array.isArray(creditCardExpenses) || creditCardExpenses.length === 0 ? (<div className="py-20 text-center"><Layers size={48} className="mx-auto text-slate-200 mb-4" /><p className="text-sm font-bold text-slate-400 uppercase italic">Nenhuma despesa</p></div>) : (
                  <div className="space-y-12">
                    {creditCardData.map(card => card.invoices && Object.entries(card.invoices).sort((a, b) => b[0].localeCompare(a[0])).map(([key, invoice]: [string, any]) => (
                      <div key={`${card.id}-${key}`} className="space-y-4">
                        <div className="flex items-center gap-4"><span className="px-4 py-1.5 bg-slate-100 rounded-full text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Fatura {key} - {card.name || 'Cartão'}</span><div className="h-px flex-1 bg-slate-100" /></div>
                        <table className="w-full text-left">
                          <tbody>
                            {(invoice.items || []).map((item: any, idx: number) => (
                              <tr key={`${item.id || idx}-${item.current_installment || 1}`} className="group hover:bg-slate-50">
                                <td className="py-4 text-xs font-bold text-slate-500">{formatDate(item.date)}</td>
                                <td className="py-4 text-xs font-black text-slate-800">{item.description || 'Sem descrição'}</td>
                                <td className="py-4 text-[9px] font-black text-slate-500">{item.current_installment || 1}/{item.installments || 1}</td>
                                <td className="py-4 text-right font-black">{formatCurrency(item.installment_amount)}</td>
                                <td className="py-4 text-right"><button onClick={() => onDeleteCreditCardExpense(item.id)} className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500"><Trash2 size={12} /></button></td>
                              </tr>
                            ))}
                            <tr className="bg-slate-50/50"><td colSpan={3} className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase">Subtotal</td><td className="py-4 text-right pr-2 text-sm font-black text-primary font-black">{formatCurrency(invoice.total)}</td><td></td></tr>
                          </tbody>
                        </table>
                      </div>
                    )))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {
        activeTab === 'RELATORIOS' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/40 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Gerar Relatório Personalizado</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data de Início</label>
                  <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data de Fim</label>
                  <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo de Transação</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none" value={reportType} onChange={e => setReportType(e.target.value as 'ALL' | TransactionType)}>
                    <option value="ALL">Todos</option>
                    <option value="INCOME">Receitas</option>
                    <option value="EXPENSE">Despesas</option>
                    <option value="TRANSFER">Transferências</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Categoria</label>
                  <input type="text" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none" placeholder="Ex: Alimentação" value={reportCategory} onChange={e => setReportCategory(e.target.value)} />
                </div>
              </div>
              <button onClick={handleGenerateReport} className="mt-6 w-full py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/10 hover:bg-primary-dark">Gerar Relatório</button>
              {reportData.length > 0 && (
                <PDFDownloadLink
                  document={<ReportPDF
                    reportData={reportData}
                    startDate={reportStartDate}
                    endDate={reportEndDate}
                    reportType={reportType}
                    reportCategory={reportCategory}
                  />}
                  fileName={`relatorio_financeiro_${new Date().toISOString().split('T')[0]}.pdf`}
                >
                  {({ loading }) => (
                    <button
                      className="mt-4 w-full py-3 bg-blue-600 text-white rounded-2xl font-bold"
                      disabled={loading}
                    >
                      {loading ? 'Gerando PDF...' : 'Baixar PDF'}
                    </button>
                  )}
                </PDFDownloadLink>
              )}
            </div>

            {reportData.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={18} className="text-primary-light" /> Resultados do Relatório
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Descrição</th>
                        <th className="px-6 py-4">Tipo</th>
                        <th className="px-6 py-4">Categoria</th>
                        <th className="px-6 py-4 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-4 text-xs font-bold text-slate-600">{formatDate(t.due_date)}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-800">{t.description}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-600">{t.type}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-600">{t.category}</td>
                          <td className="px-6 py-4 text-right font-black">
                            {t.type === TransactionType.INCOME ? '+' : t.type === TransactionType.EXPENSE ? '-' : '±'} {formatCurrency(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )
      }

      {/* MODALS */}
      {
        showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-400/10 backdrop-blur-md">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
              <div className="p-4 sm:p-6 bg-slate-50 flex items-center justify-between shrink-0"><h2 className="text-lg sm:text-xl font-black text-slate-800">{editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}</h2><button onClick={() => { setShowModal(false); setEditingTransaction(null); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button></div>
              <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo de Lançamento</label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as TransactionType })}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"
                  >
                    <option value={TransactionType.INCOME}>Receita</option>
                    <option value={TransactionType.EXPENSE}>Despesa</option>
                    <option value={TransactionType.TRANSFER}>Transferência</option>
                  </select>
                </div>

                <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Descrição" />
                <div className="grid grid-cols-2 gap-4">
                  <input required type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="Valor" />
                  <input required type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="account" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Conta</label>
                    <select
                      id="account"
                      name="account"
                      value={formData.account}
                      onChange={e => setFormData({ ...formData, account: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"
                    >
                      <option value="">Selecione uma conta</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>{account.name}</option>
                      ))}
                    </select>
                  </div>

                  {formData.type === TransactionType.TRANSFER && (
                    <>
                      <div>
                        <label htmlFor="from_account_id" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Conta de Origem</label>
                        <select
                          id="from_account_id"
                          name="from_account_id"
                          value={formData.from_account_id}
                          onChange={e => setFormData({ ...formData, from_account_id: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"
                        >
                          <option value="">Selecione a conta de origem</option>
                          {accounts.map(account => (
                            <option key={account.id} value={account.id}>{account.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="to_account_id" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Conta de Destino</label>
                        <select
                          id="to_account_id"
                          name="to_account_id"
                          value={formData.to_account_id}
                          onChange={e => setFormData({ ...formData, to_account_id: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"
                        >
                          <option value="">Selecione a conta de destino</option>
                          {accounts.map(account => (
                            <option key={account.id} value={account.id}>{account.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pessoal/Empresa</label>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, scope: 'Pessoal' })}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.scope === 'Pessoal' ? 'bg-white text-primary shadow-sm font-black' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Pessoal
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, scope: 'Empresa' })}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.scope === 'Empresa' ? 'bg-white text-primary shadow-sm font-black' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Empresa
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Forma de Pagamento</label>
                  <select
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"
                    value={formData.payment_method}
                    onChange={e => setFormData({ ...formData, payment_method: e.target.value as any })}
                  >
                    <option value="PIX">PIX</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Vincular a Projeto (Opcional)</label>
                  <select
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                    value={formData.project_id}
                    onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                  >
                    <option value="">Nenhum Projeto (Geral)</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-primary uppercase tracking-tighter">Status do Lançamento</p>
                    <p className="text-[9px] text-primary/60 font-bold leading-none mt-1">Já recebeu ou pagou este valor?</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: formData.status === TransactionStatus.PAID ? TransactionStatus.PENDING : TransactionStatus.PAID })}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${formData.status === TransactionStatus.PAID ? 'bg-primary text-white' : 'bg-white text-primary border border-primary/20'}`}
                  >
                    {formData.status === TransactionStatus.PAID ? 'Efetivado' : 'Previsto'}
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Observações</label>
                  <textarea
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl resize-none text-sm"
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Observações sobre o lançamento"
                  />
                </div>

                {!editingTransaction && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Repetir Lançamento</label>
                      <div className="flex bg-white p-1 rounded-xl border border-slate-100">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, repeat_type: 'none' })}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${formData.repeat_type === 'none' ? 'bg-primary text-white shadow-sm' : 'text-slate-400'}`}
                        >
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, repeat_type: 'installment' })}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${formData.repeat_type === 'installment' ? 'bg-primary text-white shadow-sm' : 'text-slate-400'}`}
                        >
                          Parcelar
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, repeat_type: 'recurrence' })}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${formData.repeat_type === 'recurrence' ? 'bg-primary text-white shadow-sm' : 'text-slate-400'}`}
                        >
                          Fixa
                        </button>
                      </div>
                    </div>

                    {formData.repeat_type !== 'none' && (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/50">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                            {formData.repeat_type === 'installment' ? 'Parcelas' : 'Repetições'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            className="w-full p-3 bg-white border border-slate-100 rounded-xl outline-none"
                            value={formData.installments_count}
                            onChange={e => setFormData({ ...formData, installments_count: e.target.value })}
                          />
                        </div>
                        {formData.repeat_type === 'recurrence' && (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Frequência</label>
                            <select
                              className="w-full p-3 bg-white border border-slate-100 rounded-xl outline-none"
                              value={formData.recurrence_period}
                              onChange={e => setFormData({ ...formData, recurrence_period: e.target.value as any })}
                            >
                              <option value="monthly">Mensal</option>
                              <option value="weekly">Semanal</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" className="w-full py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-dark shadow-lg shadow-primary/10">Confirmar</button>
              </form>
            </div>
          </div>
        )
      }

      {showCardModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-400/10 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8 relative my-auto">
            <button
              onClick={() => setShowCardModal(false)}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-slate-800 mb-6 font-heading">Novo Cartão</h3>
            <form onSubmit={e => { e.preventDefault(); onSaveCreditCard({ name: cardFormData.name, credit_limit: parseFloat(cardFormData.credit_limit), closing_day: parseInt(cardFormData.closing_day), due_day: parseInt(cardFormData.due_day) }); setShowCardModal(false); }} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
              <input placeholder="Nome" className="w-full p-3 bg-slate-50 rounded-xl" value={cardFormData.name} onChange={e => setCardFormData({ ...cardFormData, name: e.target.value })} />
              <input placeholder="Limite" className="w-full p-3 bg-slate-50 rounded-xl" type="number" value={cardFormData.credit_limit} onChange={e => setCardFormData({ ...cardFormData, credit_limit: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Dia Fechamento" className="w-full p-3 bg-slate-50 rounded-xl" type="number" value={cardFormData.closing_day} onChange={e => setCardFormData({ ...cardFormData, closing_day: e.target.value })} />
                <input placeholder="Dia Vencimento" className="w-full p-3 bg-slate-50 rounded-xl" type="number" value={cardFormData.due_day} onChange={e => setCardFormData({ ...cardFormData, due_day: e.target.value })} />
              </div>
              <button type="submit" className="w-full py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-dark shadow-lg shadow-primary/10">Salvar</button>
            </form>
          </div>
        </div>
      )
      }

      {showExpenseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-400/10 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300 relative my-auto">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Lançar em Cartão</h3>
              <button onClick={() => setShowExpenseModal(false)} className="p-2 text-slate-400 hover:text-rose-500 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveCreditCardExpense({
                  description: expenseFormData.description,
                  amount: parseFloat(expenseFormData.amount),
                  card_id: expenseFormData.card_id,
                  category: expenseFormData.category,
                  date: expenseFormData.date,
                  installments: parseInt(expenseFormData.installments),
                  project_id: expenseFormData.project_id || undefined
                });
                setShowExpenseModal(false);
                setExpenseFormData({ description: '', amount: '', card_id: '', category: 'Outros', date: new Date().toISOString().split('T')[0], installments: '1', project_id: '' });
              }}
              className="p-8 space-y-4 max-h-[70vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Descrição</label>
                  <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={expenseFormData.description} onChange={e => setExpenseFormData({ ...expenseFormData, description: e.target.value })} placeholder="Ex: Combustível" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Cartão</label>
                  <select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={expenseFormData.card_id} onChange={e => setExpenseFormData({ ...expenseFormData, card_id: e.target.value })}>
                    <option value="">Selecione...</option>
                    {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Categoria</label>
                  <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={expenseFormData.category} onChange={e => setExpenseFormData({ ...expenseFormData, category: e.target.value })} placeholder="Ex: Viagem" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Valor Total</label>
                  <input required type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={expenseFormData.amount} onChange={e => setExpenseFormData({ ...expenseFormData, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Data</label>
                  <input required type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={expenseFormData.date} onChange={e => setExpenseFormData({ ...expenseFormData, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Parcelas</label>
                  <input required type="number" min="1" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={expenseFormData.installments} onChange={e => setExpenseFormData({ ...expenseFormData, installments: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Projeto (Opcional)</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={expenseFormData.project_id} onChange={e => setExpenseFormData({ ...expenseFormData, project_id: e.target.value })}>
                    <option value="">Nenhum</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-dark shadow-lg shadow-primary/10">Lançar</button>
              </div>
            </form>
          </div>
        </div>
      )
      }
      {showAccountModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-400/10 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300 relative my-auto">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{editingAccount ? 'Editar Conta' : 'Nova Conta'}</h3>
              <button onClick={() => { setShowAccountModal(false); setEditingAccount(null); }} className="p-2 text-slate-400 hover:text-rose-500 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveAccount} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label htmlFor="accountName" className="block text-sm font-medium text-slate-700">Nome da Conta</label>
                <input
                  type="text"
                  id="accountName"
                  name="name"
                  value={newAccountFormData.name}
                  onChange={handleAccountFormChange}
                  className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
              <div>
                <label htmlFor="accountType" className="block text-sm font-medium text-slate-700">Tipo de Conta</label>
                <select
                  id="accountType"
                  name="type"
                  value={newAccountFormData.type}
                  onChange={handleAccountFormChange}
                  className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
                  required
                >
                  {Object.values(AccountType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="initialBalance" className="block text-sm font-medium text-slate-700">Saldo Inicial</label>
                <input
                  type="number"
                  id="initialBalance"
                  name="initial_balance"
                  value={newAccountFormData.initial_balance}
                  onChange={handleAccountFormChange}
                  className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
                  step="0.01"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface StatCardProps { label: string; value: number; icon: React.ReactNode; sub: string; }
const StatCard: React.FC<StatCardProps> = ({ label, value, icon, sub }) => (
  <div className="bg-white p-5 rounded-2xl border border-border-light shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all group">
    <div className="flex justify-between items-start">
      <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-primary/5 group-hover:text-primary transition-colors">{icon}</div>
      <div className="text-right">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <h4 className="text-lg font-black text-secondary mt-1 tracking-tight">{formatCurrency(value)}</h4>
      </div>
    </div>
    <div className="pt-3 border-t border-slate-50 mt-4">
      <p className="text-[9px] text-slate-400 font-black uppercase flex items-center gap-1.5"><Clock size={10} className="text-slate-300" /> {sub || 'Sem detalhes'}</p>
    </div>
  </div>
);

export default FinancialModule;
