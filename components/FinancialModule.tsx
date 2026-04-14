
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
  Landmark,
  Loader2,
  Tag,
  Wallet,
  Target,
  Pencil,
  ChevronRight,
  Info
} from 'lucide-react';
import {
  Project,
  FinancialProject,
  FinancialTransaction,
  TransactionType,
  TransactionStatus,
  CreditCard,
  CreditCardExpense,
  Account,
  AccountType,
  Category,
  Budget
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
import DREPDF from './DREPDF';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ReportPDF from './ReportPDF';

interface FinancialModuleProps {
  transactions: FinancialTransaction[];
  projects: Project[];
  financialProjects: FinancialProject[];
  creditCards: CreditCard[];
  creditCardExpenses: CreditCardExpense[];
  onSaveTransaction: (transaction: Partial<FinancialTransaction>, id?: string) => Promise<void>;
  onDeleteTransaction: (id: string) => void;
  onSaveCreditCard: (card: Partial<CreditCard>, id?: string) => Promise<void>;
  onDeleteCreditCard: (id: string) => void;
  onSaveCreditCardExpense: (expense: Partial<CreditCardExpense>, id?: string) => Promise<void>;
  onDeleteCreditCardExpense: (id: string) => void;
  onSaveAccount: (account: Partial<Account>, id?: string) => Promise<void>;
  onDeleteAccount: (id: string) => void;
  accounts: Account[];
  onSaveFinancialProject: (fp: Partial<FinancialProject>, id?: string) => Promise<void>;
  onDeleteFinancialProject: (id: string) => void;
  categories: Category[];
  budgets: Budget[];
  onSaveCategory: (cat: Partial<Category>, id?: string) => Promise<void>;
  onDeleteCategory: (id: string) => void;
  onSaveBudget: (b: Partial<Budget>, id?: string) => Promise<void>;
  onDeleteBudget: (id: string) => void;
}

const formatCurrency = (value: any) => {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const FinancialModule: React.FC<FinancialModuleProps> = ({
  transactions,
  projects,
  financialProjects,
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
  accounts,
  onSaveFinancialProject,
  onDeleteFinancialProject,
  categories,
  budgets,
  onSaveCategory,
  onDeleteCategory,
  onSaveBudget,
  onDeleteBudget,
}) => {
  const [activeTab, setActiveTab] = useState<'FLUXO' | 'PROJETOS' | 'CARTOES' | 'RELATORIOS' | 'DRE' | 'ORCAMENTO'>('FLUXO');

  // ── Orçamento / Categorias state ──────────────────────────────────────────
  const [budgetMonth, setBudgetMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<{ name: string; type: 'Receita' | 'Despesa' | 'Ambos'; color: string }>({
    name: '', type: 'Despesa', color: '#6366f1'
  });
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetModalCategory, setBudgetModalCategory] = useState<Category | null>(null);
  const [budgetFormAmount, setBudgetFormAmount] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [balanceMode, setBalanceMode] = useState<'EFETIVADO' | 'PROJETADO'>('EFETIVADO');
  const [dreYear, setDreYear] = useState(new Date().getFullYear().toString());
  const [dreScope, setDreScope] = useState<'ALL' | 'Pessoal' | 'Empresa'>('Empresa');
  const [showModal, setShowModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showFinancialProjectModal, setShowFinancialProjectModal] = useState(false);
  const [editingFinancialProject, setEditingFinancialProject] = useState<FinancialProject | null>(null);
  const [financialProjectFilter, setFinancialProjectFilter] = useState<string>('ALL');
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showInstallmentChoice, setShowInstallmentChoice] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | 'ALL'>('ALL');

  // Period selector for stats cards
  type PeriodPreset = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'LAST_YEAR' | 'CUSTOM' | 'ALL';
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('THIS_MONTH');
  const [periodCustomStart, setPeriodCustomStart] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-01`;
  });
  const [periodCustomEnd, setPeriodCustomEnd] = useState<string>(() => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return last.toISOString().split('T')[0];
  });

  // Resolve the active date range from the period preset
  const activePeriodRange = useMemo<{ start: string | null; end: string | null }>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed
    if (periodPreset === 'THIS_MONTH') {
      const start = `${y}-${(m + 1).toString().padStart(2, '0')}-01`;
      const endDate = new Date(y, m + 1, 0);
      return { start, end: endDate.toISOString().split('T')[0] };
    }
    if (periodPreset === 'LAST_MONTH') {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      const start = `${ly}-${(lm + 1).toString().padStart(2, '0')}-01`;
      const endDate = new Date(ly, lm + 1, 0);
      return { start, end: endDate.toISOString().split('T')[0] };
    }
    if (periodPreset === 'THIS_YEAR') {
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
    if (periodPreset === 'LAST_YEAR') {
      return { start: `${y - 1}-01-01`, end: `${y - 1}-12-31` };
    }
    if (periodPreset === 'CUSTOM') {
      return { start: periodCustomStart, end: periodCustomEnd };
    }
    return { start: null, end: null }; // ALL
  }, [periodPreset, periodCustomStart, periodCustomEnd]);

  // Account filter for stats cards (independent from list's accountFilter)
  const [statsAccountFilter, setStatsAccountFilter] = useState<string>('ALL');

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransactionStatus>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'Pessoal' | 'Empresa'>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const [includePreviousBalance, setIncludePreviousBalance] = useState(false);
  const [previousBalance, setPreviousBalance] = useState('0');

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
    financial_project_id: '',
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
    project_id: '',
    financial_project_id: ''
  });

  const [fpFormData, setFpFormData] = useState({
    name: '',
    description: '',
    color: '#22c55e',
    budget: '',
    start_date: '',
    end_date: ''
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

  // Cálculos de Resumo (com filtro de período e conta)
  const stats = useMemo(() => {
    const { start, end } = activePeriodRange;

    // Find selected account object for initial_balance lookup
    const selectedAccount = statsAccountFilter !== 'ALL'
      ? accounts.find(a => a.id === statsAccountFilter)
      : null;
    const accountInitial = selectedAccount ? (selectedAccount.initial_balance || 0) : 0;

    const periodFiltered = transactions.filter(t => {
      if (!start && !end) return true;
      const ym = (t.due_date || '').slice(0, 10);
      if (start && ym < start) return false;
      if (end && ym > end) return false;
      return true;
    });

    const accountFiltered = periodFiltered.filter(t => {
      if (statsAccountFilter === 'ALL') return true;
      // Match by account id or name (legacy support)
      return (
        t.account === statsAccountFilter ||
        t.from_account_id === statsAccountFilter ||
        t.to_account_id === statsAccountFilter
      );
    });

    const scopeFiltered = accountFiltered.filter(t => {
      if (scopeFilter === 'ALL') return true;
      if (!t.scope) return scopeFilter === 'Empresa';
      return t.scope === scopeFilter;
    });

    const balanceFromTransactions = scopeFiltered
      .filter(t => t.status === TransactionStatus.PAID)
      .reduce((acc, t) => {
        if (t.type === TransactionType.TRANSFER) return acc;
        if (t.type === TransactionType.INCOME) return acc + (parseFloat(String(t.amount)) || 0);
        if (t.type === TransactionType.EXPENSE) return acc - (parseFloat(String(t.amount)) || 0);
        return acc;
      }, 0);

    // When a specific account is selected and no period filter, include initial balance
    const balance = selectedAccount && !start && !end
      ? accountInitial + balanceFromTransactions
      : balanceFromTransactions;

    const receivable = scopeFiltered
      .filter(t => t.type === TransactionType.INCOME && t.status === TransactionStatus.PENDING)
      .reduce((acc, t) => acc + (parseFloat(String(t.amount)) || 0), 0);

    const payable = scopeFiltered
      .filter(t => t.type === TransactionType.EXPENSE && t.status === TransactionStatus.PENDING)
      .reduce((acc, t) => acc + (parseFloat(String(t.amount)) || 0), 0);

    return { balance, receivable, payable, projected: balance + receivable - payable, selectedAccount };
  }, [transactions, scopeFilter, activePeriodRange, statsAccountFilter, accounts]);

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
      const matchesFinancialProject = financialProjectFilter === 'ALL' || t.financial_project_id === financialProjectFilter;
      const matchesScope = scopeFilter === 'ALL' || (t.scope || 'Empresa') === scopeFilter;
      const matchesAccount = accountFilter === 'ALL' || t.account === accountFilter;
      const matchesMonth = (() => {
        if (!monthFilter) return true;
        // Extrai ano-mês direto da string para evitar desvio de fuso horário
        const ym = (t.due_date || '').slice(0, 7);
        return ym === monthFilter;
      })();
      return matchesSearch && matchesType && matchesStatus && matchesProject && matchesFinancialProject && matchesScope && matchesAccount && matchesMonth;
    }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [transactions, searchTerm, typeFilter, statusFilter, projectFilter, financialProjectFilter, scopeFilter, accountFilter, monthFilter]);

  const filteredStats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((s, t) => s + (parseFloat(String(t.amount)) || 0), 0);
    const expense = filteredTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((s, t) => s + (parseFloat(String(t.amount)) || 0), 0);
    const prev = includePreviousBalance ? (parseFloat(previousBalance) || 0) : 0;
    return { income, expense, net: income - expense, prev, final: prev + income - expense };
  }, [filteredTransactions, includePreviousBalance, previousBalance]);

  const dreData = useMemo(() => {
    const categoriesFilter = {
      REVENUE: ['serviço', 'honorário', 'venda', 'receita', 'projeto'],
      DEDUCTIONS: ['imposto', 'iss', 'ir', 'taxa', 'dedução'],
      COSTS: ['custo', 'insumo', 'deslocamento', 'combustível', 'obra'],
      PERSONNEL: ['salário', 'pró-labore', 'folha', 'encargos', 'fgts'],
      FINANCIAL: ['juros', 'bancária', 'empréstimo']
    };

    const structure = {
      revenueBruta: Array(12).fill(0),
      deductions: Array(12).fill(0),
      costs: Array(12).fill(0),
      personnel: Array(12).fill(0),
      financial: Array(12).fill(0),
      operatingExpenses: Array(12).fill(0),
      otherIncome: Array(12).fill(0),
      otherExpenses: Array(12).fill(0),
    };

    const details = {
      revenue: {} as Record<string, number[]>,
      operating: {} as Record<string, number[]>,
    };

    transactions
      .filter(t => t.status === TransactionStatus.PAID)
      // Exclui transferências internas (não são receita nem despesa real)
      .filter(t =>
        t.type !== TransactionType.TRANSFER &&
        t.category !== 'Transferência Enviada' &&
        t.category !== 'Transferência Recebida'
      )
      .filter(t => {
        // Parsing timezone-safe: usa string diretamente para evitar desvio UTC
        const year = (t.due_date || '').slice(0, 4);
        return year === dreYear;
      })
      .filter(t => {
        if (dreScope === 'ALL') return true;
        return (t.scope || 'Empresa') === dreScope;
      })
      .forEach(t => {
        // Extrai mês diretamente da string (evita bug de fuso horário no dia 1º)
        const month = parseInt((t.due_date || '').slice(5, 7), 10) - 1;
        const amount = parseFloat(String(t.amount)) || 0;
        const cat = t.category.toLowerCase();

        if (t.type === TransactionType.INCOME) {
          if (categoriesFilter.REVENUE.some(k => cat.includes(k))) {
            structure.revenueBruta[month] += amount;
            if (!details.revenue[t.category]) details.revenue[t.category] = Array(12).fill(0);
            details.revenue[t.category][month] += amount;
          } else {
            structure.otherIncome[month] += amount;
          }
        } else if (t.type === TransactionType.EXPENSE) {
          if (categoriesFilter.DEDUCTIONS.some(k => cat.includes(k))) {
            structure.deductions[month] += amount;
          } else if (categoriesFilter.COSTS.some(k => cat.includes(k))) {
            structure.costs[month] += amount;
          } else if (categoriesFilter.PERSONNEL.some(k => cat.includes(k))) {
            structure.personnel[month] += amount;
          } else if (categoriesFilter.FINANCIAL.some(k => cat.includes(k))) {
            structure.financial[month] += amount;
          } else {
            structure.operatingExpenses[month] += amount;
            if (!details.operating[t.category]) details.operating[t.category] = Array(12).fill(0);
            details.operating[t.category][month] += amount;
          }
        }
      });

    return { structure, details };
  }, [transactions, dreYear, dreScope]);

  const reminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fifteenDaysFromNow = new Date(today);
    fifteenDaysFromNow.setDate(today.getDate() + 15);

    const overdue = transactions.filter(t =>
      t.status === TransactionStatus.PENDING &&
      new Date(t.due_date) < today
    ).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    const dueSoon = transactions.filter(t =>
      t.status === TransactionStatus.PENDING &&
      new Date(t.due_date) >= today &&
      new Date(t.due_date) <= fifteenDaysFromNow
    ).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    return { overdue, dueSoon, hasReminders: overdue.length > 0 || dueSoon.length > 0 };
  }, [transactions]);

  // ── Estatísticas de Orçamento por Categoria (Sistema dos Potes) ──────────
  const budgetStats = useMemo(() => {
    return categories.map(cat => {
      const budget = budgets.find(b => b.category_id === cat.id && b.month === budgetMonth);
      const monthTransactions = transactions.filter(t => {
        const ym = (t.due_date || '').slice(0, 7);
        return ym === budgetMonth && t.category === cat.name;
      });

      const spent = (cat.type === 'Despesa' || cat.type === 'Ambos')
        ? monthTransactions.filter(t => t.type === TransactionType.EXPENSE)
            .reduce((s, t) => s + (parseFloat(String(t.amount)) || 0), 0)
        : 0;

      const received = (cat.type === 'Receita' || cat.type === 'Ambos')
        ? monthTransactions.filter(t => t.type === TransactionType.INCOME)
            .reduce((s, t) => s + (parseFloat(String(t.amount)) || 0), 0)
        : 0;

      const limit = budget?.limit_amount || 0;
      const used = cat.type === 'Receita' ? received : spent;
      const percentage = limit > 0 ? Math.min((used / limit) * 100, 999) : 0;
      const remaining = limit - used;

      return { cat, budget, spent, received, used, limit, percentage, remaining };
    });
  }, [categories, budgets, transactions, budgetMonth]);

  const budgetSummary = useMemo(() => {
    const withBudget = budgetStats.filter(s => s.limit > 0);
    const totalLimit = withBudget.reduce((sum, s) => sum + s.limit, 0);
    const totalUsed = withBudget.reduce((sum, s) => sum + s.used, 0);
    const totalRemaining = totalLimit - totalUsed;
    const overBudget = withBudget.filter(s => s.percentage > 100).length;
    const nearLimit = withBudget.filter(s => s.percentage >= 75 && s.percentage <= 100).length;
    return { totalLimit, totalUsed, totalRemaining, overBudget, nearLimit, count: withBudget.length };
  }, [budgetStats]);

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
      financial_project_id: transaction.financial_project_id || '',
      account: transaction.account || '',
      from_account_id: transaction.from_account_id || '',
      to_account_id: transaction.to_account_id || '',
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

  const isEditingSeries = !!(
    editingTransaction &&
    editingTransaction.parent_id &&
    editingTransaction.total_occurrences &&
    editingTransaction.total_occurrences > 1
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount)) {
      alert('Por favor, insira um valor numérico válido para o campo "Valor".');
      return;
    }
    if (formData.type === TransactionType.TRANSFER) {
      if (!formData.from_account_id) {
        alert('Selecione a conta de origem para a transferência.');
        return;
      }
      if (!formData.to_account_id) {
        alert('Selecione a conta de destino para a transferência.');
        return;
      }
      if (formData.from_account_id === formData.to_account_id) {
        alert('As contas de origem e destino devem ser diferentes.');
        return;
      }
    }
    // Se é edição de uma parcela de série, perguntar escopo da alteração
    if (isEditingSeries) {
      setShowInstallmentChoice(true);
      return;
    }
    doSave('single');
  };

  const doSave = async (mode: 'single' | 'all') => {
    const parsedAmount = parseFloat(formData.amount);
    setShowInstallmentChoice(false);
    setIsSaving(true);

    const commonData = {
      description: formData.description,
      type: formData.type,
      category: formData.category,
      status: formData.status,
      payment_method: formData.payment_method,
      project_id: formData.project_id || undefined,
      financial_project_id: formData.financial_project_id || undefined,
      account: formData.account || undefined,
      from_account_id: formData.from_account_id || undefined,
      to_account_id: formData.to_account_id || undefined,
      scope: formData.scope,
      notes: formData.notes || undefined
    };

    try {
      if (editingTransaction && mode === 'all') {
        // Atualiza todas as parcelas da série (mantém a due_date individual de cada uma)
        const siblings = transactions.filter(
          (t: FinancialTransaction) => t.parent_id === editingTransaction.parent_id
        );
        await Promise.all(
          siblings.map((sibling: FinancialTransaction) =>
            onSaveTransaction(
              { id: sibling.id, ...commonData, amount: parsedAmount, due_date: sibling.due_date },
              sibling.id
            )
          )
        );
      } else if (editingTransaction) {
        // Atualiza apenas esta parcela
        await onSaveTransaction(
          { id: editingTransaction.id, ...commonData, amount: parsedAmount, due_date: formData.due_date },
          editingTransaction.id
        );
      } else {
        // Novo lançamento — parcelas ou recorrência
        const count = parseInt(formData.installments_count) || 1;
        const generateUUID = () => {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };
        const parentId = generateUUID();
        const baseDate = new Date(formData.due_date);
        const transactionsToSave = [];
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
          transactionsToSave.push({
            ...commonData,
            amount,
            due_date: dueDate.toISOString().split('T')[0],
            parent_id: parentId,
            occurrence_number: i + 1,
            total_occurrences: count,
            is_recurring: formData.repeat_type === 'recurrence'
          });
        }
        // Transfers must be passed as a single object so the special transfer
        // logic in App.tsx (creating an expense + income pair) is triggered.
        if (formData.type === TransactionType.TRANSFER) {
          await onSaveTransaction(transactionsToSave[0] as any);
        } else {
          await onSaveTransaction(transactionsToSave as any);
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
        financial_project_id: '',
        account: '',
        from_account_id: '',
        to_account_id: '',
        scope: 'Empresa',
        notes: '',
        repeat_type: 'none',
        installments_count: '1',
        recurrence_period: 'monthly'
      });
    } catch (err: any) {
      console.error('FinancialModule Error:', err);
      alert(`Erro ao salvar: ${err?.message || String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAccountFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAccountFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedInitialBalance = parseFloat(newAccountFormData.initial_balance);
    if (isNaN(parsedInitialBalance)) {
      alert('Por favor, insira um valor numérico válido para o campo "Saldo Inicial".');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveAccount({
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
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
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

  const handleFpSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveFinancialProject({
        ...(editingFinancialProject && { id: editingFinancialProject.id }),
        name: fpFormData.name,
        description: fpFormData.description || undefined,
        color: fpFormData.color,
        budget: fpFormData.budget ? parseFloat(fpFormData.budget) : undefined,
        start_date: fpFormData.start_date || undefined,
        end_date: fpFormData.end_date || undefined
      }, editingFinancialProject?.id);
      setShowFinancialProjectModal(false);
      setEditingFinancialProject(null);
      setFpFormData({ name: '', description: '', color: '#22c55e', budget: '', start_date: '', end_date: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditFp = (fp: FinancialProject) => {
    setEditingFinancialProject(fp);
    setFpFormData({
      name: fp.name,
      description: fp.description || '',
      color: fp.color,
      budget: fp.budget ? String(fp.budget) : '',
      start_date: fp.start_date || '',
      end_date: fp.end_date || ''
    });
    setShowFinancialProjectModal(true);
  };

  const handleDeleteFp = (id: string) => {
    if (window.confirm('Excluir este projeto financeiro? Os lançamentos vinculados não serão excluídos.')) {
      onDeleteFinancialProject(id);
    }
  };

  // Per-financial-project stats
  const fpStats = useMemo(() => {
    return financialProjects.map(fp => {
      const related = transactions.filter(t => t.financial_project_id === fp.id);
      const income = related.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + (parseFloat(String(t.amount)) || 0), 0);
      const expense = related.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + (parseFloat(String(t.amount)) || 0), 0);
      const paidExpense = related.filter(t => t.type === TransactionType.EXPENSE && t.status === TransactionStatus.PAID).reduce((s, t) => s + (parseFloat(String(t.amount)) || 0), 0);
      return { fp, income, expense, paidExpense, net: income - expense, count: related.length };
    });
  }, [financialProjects, transactions]);


  // ── Handlers: Categorias ─────────────────────────────────────────────────
  const handleOpenNewCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({ name: '', type: 'Despesa', color: '#6366f1' });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryFormData({ name: cat.name, type: cat.type, color: cat.color });
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm('Excluir esta categoria? Os lançamentos vinculados manterão o nome da categoria, mas não serão mais reconhecidos.')) {
      onDeleteCategory(id);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.name.trim()) return;
    setIsSavingCategory(true);
    try {
      await onSaveCategory(
        { ...(editingCategory && { id: editingCategory.id }), name: categoryFormData.name.trim(), type: categoryFormData.type, color: categoryFormData.color },
        editingCategory?.id
      );
      setShowCategoryModal(false);
      setEditingCategory(null);
    } catch (err) { console.error(err); }
    finally { setIsSavingCategory(false); }
  };

  const handleSeedDefaultCategories = async () => {
    const defaults: Array<{ name: string; type: 'Receita' | 'Despesa' | 'Ambos'; color: string }> = [
      { name: 'Alimentação',   type: 'Despesa',  color: '#f97316' },
      { name: 'Moradia',       type: 'Despesa',  color: '#3b82f6' },
      { name: 'Transporte',    type: 'Despesa',  color: '#8b5cf6' },
      { name: 'Saúde',         type: 'Despesa',  color: '#ef4444' },
      { name: 'Educação',      type: 'Despesa',  color: '#14b8a6' },
      { name: 'Lazer',         type: 'Despesa',  color: '#ec4899' },
      { name: 'Vestuário',     type: 'Despesa',  color: '#f59e0b' },
      { name: 'Assinaturas',   type: 'Despesa',  color: '#64748b' },
      { name: 'Impostos',      type: 'Despesa',  color: '#475569' },
      { name: 'Investimentos', type: 'Ambos',    color: '#a855f7' },
      { name: 'Serviços',      type: 'Receita',  color: '#22c55e' },
      { name: 'Salário',       type: 'Receita',  color: '#10b981' },
      { name: 'Freelance',     type: 'Receita',  color: '#06b6d4' },
      { name: 'Outros',        type: 'Ambos',    color: '#94a3b8' },
    ];
    const existingNames = categories.map(c => c.name.toLowerCase());
    const toCreate = defaults.filter(d => !existingNames.includes(d.name.toLowerCase()));
    if (toCreate.length === 0) { alert('Todas as categorias padrão já existem.'); return; }
    setIsSavingCategory(true);
    try {
      // Envia como array para o handleUpsert fazer inserção em lote (um único fetchInitialData)
      await (onSaveCategory as any)(toCreate);
    } catch (err: any) {
      console.error('Erro ao criar categorias padrão:', err);
      alert('Erro ao criar categorias. Verifique se o SQL de migração foi executado no Supabase:\nsupabase/migrations/20260412_add_categories_and_budgets.sql');
    } finally {
      setIsSavingCategory(false);
    }
  };

  // ── Handlers: Orçamento (Potes) ──────────────────────────────────────────
  const handleOpenBudgetModal = (cat: Category) => {
    setBudgetModalCategory(cat);
    const existing = budgets.find(b => b.category_id === cat.id && b.month === budgetMonth);
    setBudgetFormAmount(existing ? String(existing.limit_amount) : '');
    setShowBudgetModal(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetModalCategory) return;
    const amount = parseFloat(budgetFormAmount);
    if (isNaN(amount) || amount < 0) { alert('Insira um valor válido.'); return; }
    setIsSavingBudget(true);
    try {
      const existing = budgets.find(b => b.category_id === budgetModalCategory.id && b.month === budgetMonth);
      await onSaveBudget(
        { ...(existing && { id: existing.id }), category_id: budgetModalCategory.id, month: budgetMonth, limit_amount: amount },
        existing?.id
      );
      setShowBudgetModal(false);
      setBudgetModalCategory(null);
    } catch (err) { console.error(err); }
    finally { setIsSavingBudget(false); }
  };

  const handleDeleteBudgetForCategory = (cat: Category) => {
    const existing = budgets.find(b => b.category_id === cat.id && b.month === budgetMonth);
    if (!existing) return;
    if (window.confirm(`Remover o limite de orçamento da categoria "${cat.name}" para este mês?`)) {
      onDeleteBudget(existing.id);
    }
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
              onClick={() => setActiveTab('PROJETOS')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${activeTab === 'PROJETOS' ? 'bg-white text-primary shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Projetos
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
            <button
              onClick={() => setActiveTab('DRE')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${activeTab === 'DRE' ? 'bg-white text-primary shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-700'}`}
            >
              DRE
            </button>
            <button
              onClick={() => setActiveTab('ORCAMENTO')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'ORCAMENTO' ? 'bg-white text-primary shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Wallet size={12} /> Orçamento
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
            {activeTab === 'PROJETOS' ? (
              <button
                onClick={() => {
                  setEditingFinancialProject(null);
                  setFpFormData({ name: '', description: '', color: '#22c55e', budget: '', start_date: '', end_date: '' });
                  setShowFinancialProjectModal(true);
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark shadow-md shadow-primary/10 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all"
              >
                <Plus size={16} /> Novo Projeto
              </button>
            ) : (
              <button
                onClick={() => activeTab === 'FLUXO' ? setShowModal(true) : setShowExpenseModal(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark shadow-md shadow-primary/10 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all"
              >
                <Plus size={16} /> {activeTab === 'FLUXO' ? 'Novo Lançamento' : 'Nova Despesa Card'}
              </button>
            )}
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

            {/* ── Period + Account Selector ── */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">

              {/* Row 1: Period */}
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2 shrink-0">
                  <Calendar size={14} className="text-primary" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {([
                    { key: 'THIS_MONTH', label: 'Este mês' },
                    { key: 'LAST_MONTH', label: 'Mês anterior' },
                    { key: 'THIS_YEAR',  label: 'Este ano' },
                    { key: 'LAST_YEAR',  label: 'Ano anterior' },
                    { key: 'CUSTOM',     label: 'Personalizado' },
                    { key: 'ALL',        label: 'Todos' },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setPeriodPreset(key)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        periodPreset === key
                          ? 'bg-primary text-white shadow-md shadow-primary/20'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {periodPreset === 'CUSTOM' && (
                  <div className="flex items-center gap-2 ml-auto">
                    <input
                      type="date"
                      value={periodCustomStart}
                      onChange={e => setPeriodCustomStart(e.target.value)}
                      className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="text-slate-400 text-xs font-bold">até</span>
                    <input
                      type="date"
                      value={periodCustomEnd}
                      onChange={e => setPeriodCustomEnd(e.target.value)}
                      className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                )}

                {periodPreset !== 'CUSTOM' && periodPreset !== 'ALL' && (
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
                    {activePeriodRange.start} → {activePeriodRange.end}
                  </span>
                )}
                {periodPreset === 'ALL' && (
                  <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
                    Todos os lançamentos
                  </span>
                )}
              </div>

              {/* Row 2: Account selector */}
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-slate-50/60">
                <div className="flex items-center gap-2 shrink-0">
                  <Landmark size={14} className="text-blue-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conta</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setStatsAccountFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      statsAccountFilter === 'ALL'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                        : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    Todas as contas
                  </button>
                  {accounts.map(account => (
                    <button
                      key={account.id}
                      onClick={() => setStatsAccountFilter(account.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        statsAccountFilter === account.id
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                          : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      {account.name}
                    </button>
                  ))}
                </div>

                {/* Selected account info badge */}
                {stats.selectedAccount && (
                  <div className="ml-auto flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    <span className="text-[10px] font-bold text-blue-700">{stats.selectedAccount.type}</span>
                    <span className="text-[10px] text-blue-400">·</span>
                    <span className="text-[10px] font-black text-blue-800">
                      Saldo Inicial: {stats.selectedAccount.initial_balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Saldo Atual" value={balanceMode === 'EFETIVADO' ? stats.balance : stats.projected} icon={<DollarSign className="text-primary" />} sub={balanceMode === 'EFETIVADO' ? 'Transações conciliadas' : 'Projeção fluxo futuro'} />
              <StatCard label="A Receber" value={stats.receivable} icon={<TrendingUp className="text-blue-600" />} sub="Próximos vencimentos" />
              <StatCard label="A Pagar" value={stats.payable} icon={<TrendingDown className="text-rose-600" />} sub="Contas pendentes" />
              <StatCard label="Saldo Projetado" value={stats.projected} icon={<TrendingUp className="text-violet-600" />} sub="Projeção fluxo futuro" />
            </div>

            {/* Active Financial Project Banner */}
            {financialProjectFilter !== 'ALL' && (() => {
              const activeFp = financialProjects.find(fp => fp.id === financialProjectFilter);
              const activeStats = fpStats.find(s => s.fp.id === financialProjectFilter);
              if (!activeFp || !activeStats) return null;
              return (
                <div
                  className="rounded-2xl border-2 p-4 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300"
                  style={{ borderColor: activeFp.color + '66', backgroundColor: activeFp.color + '0d' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: activeFp.color + '22' }}
                  >
                    <Briefcase size={16} style={{ color: activeFp.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: activeFp.color }}>Filtrando por projeto financeiro</p>
                    <p className="text-sm font-black text-slate-800 truncate">{activeFp.name}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gasto</p>
                      <p className="text-sm font-black text-rose-600">{formatCurrency(activeStats.expense)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Receita</p>
                      <p className="text-sm font-black text-emerald-600">{formatCurrency(activeStats.income)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Líquido</p>
                      <p className={`text-sm font-black ${activeStats.net >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>{formatCurrency(activeStats.net)}</p>
                    </div>
                    {activeFp.budget && (
                      <div className="text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Orçamento</p>
                        <p className="text-sm font-black text-slate-600">{formatCurrency(activeFp.budget)}</p>
                      </div>
                    )}
                    <button
                      onClick={() => setFinancialProjectFilter('ALL')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 hover:border-rose-200 transition-all"
                    >
                      <X size={10} /> Limpar filtro
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Lembretes Financeiros */}
            {reminders.hasReminders && (
              <div className="bg-white p-6 rounded-2xl border border-rose-200/50 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={18} className="text-rose-500" /> Pendências Financeiras Urgentes
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">
                    {reminders.overdue.length + reminders.dueSoon.length} itens
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Vencidos */}
                  {reminders.overdue.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div>
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Vencidos</p>
                      </div>
                      <div className="space-y-2 overflow-y-auto max-h-[250px] custom-scrollbar pr-1">
                        {reminders.overdue.map(t => (
                          <div key={t.id} className="flex items-center justify-between bg-rose-50/50 p-3 rounded-xl border border-rose-100 group hover:bg-rose-50 hover:shadow-sm transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-rose-500 shadow-sm shrink-0 group-hover:scale-110 transition-transform">
                                <AlertCircle size={14} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{t.description}</p>
                                <p className="text-[10px] text-rose-600 font-medium">Venceu em {formatDate(t.due_date)}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-xs font-black text-rose-700">{formatCurrency(t.amount)}</p>
                              <button 
                                onClick={() => handleEditTransaction(t)}
                                className="mt-1 flex items-center gap-1 text-[9px] font-black text-primary uppercase tracking-tighter hover:text-primary-dark transition-colors"
                              >
                                Pagar <ArrowUpRight size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* A Vencer */}
                  {reminders.dueSoon.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">A Vencer (15 dias)</p>
                      </div>
                      <div className="space-y-2 overflow-y-auto max-h-[250px] custom-scrollbar pr-1">
                        {reminders.dueSoon.map(t => (
                          <div key={t.id} className="flex items-center justify-between bg-amber-50/50 p-3 rounded-xl border border-amber-100 group hover:bg-amber-50 hover:shadow-sm transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-amber-500 shadow-sm shrink-0 group-hover:scale-110 transition-transform">
                                <Clock size={14} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{t.description}</p>
                                <p className="text-[10px] text-amber-600 font-medium">Vence em {formatDate(t.due_date)}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-xs font-black text-amber-700">{formatCurrency(t.amount)}</p>
                              <button 
                                onClick={() => handleEditTransaction(t)}
                                className="mt-1 flex items-center gap-1 text-[9px] font-black text-primary uppercase tracking-tighter hover:text-primary-dark transition-colors"
                              >
                                Pagar <ArrowUpRight size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

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
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthFilter(e.target.value)}
                  className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600"
                />
                <select value={typeFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value as 'ALL' | TransactionType)} className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">
                  <option value="ALL">Todos os tipos</option>
                  <option value={TransactionType.INCOME}>Receita</option>
                  <option value={TransactionType.EXPENSE}>Despesa</option>
                  <option value={TransactionType.TRANSFER}>Transferência</option>
                </select>
                <select value={statusFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as 'ALL' | TransactionStatus)} className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">
                  <option value="ALL">Todos os status</option>
                  <option value={TransactionStatus.PENDING}>Pendente</option>
                  <option value={TransactionStatus.PAID}>Pago</option>
                </select>
                <select value={scopeFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setScopeFilter(e.target.value as 'ALL' | 'Pessoal' | 'Empresa')} className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">
                  <option value="ALL">Empresa + Pessoal</option>
                  <option value="Empresa">Empresa</option>
                  <option value="Pessoal">Pessoal</option>
                </select>
                <select value={accountFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAccountFilter(e.target.value)} className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">
                  <option value="ALL">Todas as contas</option>
                  {accounts.map((a: Account) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <select value={projectFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProjectFilter(e.target.value)} className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">
                  <option value="ALL">Todos os geo-projetos</option>
                  {projects.map((p: { id: string; title: string }) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <select
                  value={financialProjectFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFinancialProjectFilter(e.target.value)}
                  className={`py-2 px-3 border rounded-xl text-sm font-bold transition-all ${financialProjectFilter !== 'ALL' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  <option value="ALL">Todos os projetos fin.</option>
                  {financialProjects.map(fp => (
                    <option key={fp.id} value={fp.id}>{fp.name}</option>
                  ))}
                </select>
              </div>

              {/* Sumário dos itens filtrados */}
              <div className="px-4 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap gap-3 flex-1">
                  <div className="flex flex-col items-center px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 min-w-[110px]">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Entradas</span>
                    <span className="text-sm font-black text-emerald-700">{formatCurrency(filteredStats.income)}</span>
                  </div>
                  <div className="flex flex-col items-center px-4 py-2 bg-rose-50 rounded-xl border border-rose-100 min-w-[110px]">
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Saídas</span>
                    <span className="text-sm font-black text-rose-700">{formatCurrency(filteredStats.expense)}</span>
                  </div>
                  {includePreviousBalance && (
                    <div className="flex flex-col items-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 min-w-[110px]">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Anterior</span>
                      <span className="text-sm font-black text-slate-700">{formatCurrency(filteredStats.prev)}</span>
                    </div>
                  )}
                  <div className={`flex flex-col items-center px-4 py-2 rounded-xl border min-w-[110px] ${filteredStats.final >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-rose-50 border-rose-100'}`}>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${filteredStats.final >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                      {includePreviousBalance ? 'Saldo Final' : 'Saldo do Período'}
                    </span>
                    <span className={`text-sm font-black ${filteredStats.final >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>{formatCurrency(filteredStats.final)}</span>
                  </div>
                </div>

                {/* Saldo anterior toggle + input */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includePreviousBalance}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIncludePreviousBalance(e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">Saldo anterior</span>
                  </label>
                  {includePreviousBalance && (
                    <input
                      type="number"
                      step="0.01"
                      value={previousBalance}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPreviousBalance(e.target.value)}
                      className="w-28 py-1 px-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700"
                      placeholder="0,00"
                    />
                  )}
                </div>

                {/* Exportar PDF */}
                <PDFDownloadLink
                  document={
                    <ReportPDF
                      reportData={filteredTransactions}
                      previousBalance={filteredStats.prev}
                      includePreviousBalance={includePreviousBalance}
                    />
                  }
                  fileName={`lancamentos-${monthFilter || 'filtrados'}.pdf`}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-dark shadow-md shadow-primary/10 transition-all whitespace-nowrap"
                >
                  {({ loading }: { loading: boolean }) => loading ? 'Gerando...' : <><FileText size={14} /> Exportar PDF</>}
                </PDFDownloadLink>
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
        activeTab === 'PROJETOS' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header stats strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Briefcase size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Projetos</p>
                  <p className="text-xl font-black text-slate-800">{financialProjects.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                  <TrendingDown size={18} className="text-rose-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Gasto</p>
                  <p className="text-xl font-black text-rose-600">
                    {formatCurrency(fpStats.reduce((s, f) => s + f.expense, 0))}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <TrendingUp size={18} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Receitas</p>
                  <p className="text-xl font-black text-emerald-600">
                    {formatCurrency(fpStats.reduce((s, f) => s + f.income, 0))}
                  </p>
                </div>
              </div>
            </div>

            {/* Project cards grid */}
            {financialProjects.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                  <Briefcase size={28} className="text-slate-300" />
                </div>
                <h3 className="text-sm font-bold text-slate-600 mb-1">Nenhum projeto cadastrado</h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  Crie projetos para agrupar e rastrear gastos por categoria. Ex: "Reforma da Casa", "Viagem de Férias".
                </p>
                <button
                  onClick={() => {
                    setEditingFinancialProject(null);
                    setFpFormData({ name: '', description: '', color: '#22c55e', budget: '', start_date: '', end_date: '' });
                    setShowFinancialProjectModal(true);
                  }}
                  className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary-dark transition-all shadow-md shadow-primary/20"
                >
                  <Plus size={14} /> Criar primeiro projeto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {fpStats.map(({ fp, income, expense, paidExpense, net, count }) => {
                  const budgetPct = fp.budget && fp.budget > 0 ? Math.min(100, (paidExpense / fp.budget) * 100) : null;
                  const isOver = fp.budget ? paidExpense > fp.budget : false;
                  return (
                    <div
                      key={fp.id}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                    >
                      {/* Color bar */}
                      <div className="h-1.5 w-full" style={{ backgroundColor: fp.color }} />

                      <div className="p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: fp.color + '22', border: `1.5px solid ${fp.color}44` }}
                            >
                              <Briefcase size={15} style={{ color: fp.color }} />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-800 leading-tight">{fp.name}</h4>
                              {fp.description && (
                                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{fp.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditFp(fp)}
                              className="p-1.5 text-slate-300 hover:text-blue-500 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <FileText size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteFp(fp.id)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-rose-50/60 rounded-xl p-3">
                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">Total Gasto</p>
                            <p className="text-sm font-black text-rose-700">{formatCurrency(expense)}</p>
                          </div>
                          <div className="bg-emerald-50/60 rounded-xl p-3">
                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">Receitas</p>
                            <p className="text-sm font-black text-emerald-700">{formatCurrency(income)}</p>
                          </div>
                        </div>

                        {/* Net balance */}
                        <div className={`rounded-xl p-3 mb-4 ${net >= 0 ? 'bg-blue-50/60' : 'bg-rose-50/60'}`}>
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Líquido</span>
                            <span className={`text-sm font-black ${net >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>{formatCurrency(net)}</span>
                          </div>
                        </div>

                        {/* Budget bar */}
                        {fp.budget && fp.budget > 0 && (
                          <div className="mb-4">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Orçamento</span>
                              <span className={`text-[10px] font-black ${isOver ? 'text-rose-600' : 'text-slate-600'}`}>
                                {formatCurrency(paidExpense)} / {formatCurrency(fp.budget)}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-500' : 'bg-primary'}`}
                                style={{ width: `${budgetPct}%` }}
                              />
                            </div>
                            {isOver && (
                              <p className="text-[9px] text-rose-500 font-bold mt-1">
                                ⚠ Orçamento excedido em {formatCurrency(paidExpense - fp.budget)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Dates and action */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                          <div className="flex items-center gap-2">
                            {fp.start_date && (
                              <span className="text-[9px] text-slate-400 font-bold">
                                {fp.start_date.slice(0, 7)} {fp.end_date ? `→ ${fp.end_date.slice(0, 7)}` : ''}
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400">{count} lançamento{count !== 1 ? 's' : ''}</span>
                          </div>
                          <button
                            onClick={() => {
                              setFinancialProjectFilter(fp.id);
                              setActiveTab('FLUXO');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all text-white hover:opacity-90 shadow-sm"
                            style={{ backgroundColor: fp.color }}
                          >
                            <Filter size={10} /> Ver lançamentos
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
        activeTab === 'DRE' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/40 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ano de Exercício</label>
                  <select
                    value={dreYear}
                    onChange={(e) => setDreYear(e.target.value)}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                  >
                    {[2023, 2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y.toString()}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Escopo</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    {(['ALL', 'Empresa', 'Pessoal'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setDreScope(s)}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${dreScope === s ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
                      >
                        {s === 'ALL' ? 'Todos' : s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultado do Exercício</p>
                  <p className={`text-xl font-black ${dreData.structure.revenueBruta.reduce((a, b) => a + b, 0) - dreData.structure.deductions.reduce((a, b) => a + b, 0) - dreData.structure.costs.reduce((a, b) => a + b, 0) - dreData.structure.operatingExpenses.reduce((a, b) => a + b, 0) - dreData.structure.personnel.reduce((a, b) => a + b, 0) >= 0 ? 'text-primary' : 'text-rose-600'}`}>
                    {formatCurrency(
                      dreData.structure.revenueBruta.reduce((a, b) => a + b, 0) -
                      dreData.structure.deductions.reduce((a, b) => a + b, 0) -
                      dreData.structure.costs.reduce((a, b) => a + b, 0) -
                      dreData.structure.operatingExpenses.reduce((a, b) => a + b, 0) -
                      dreData.structure.personnel.reduce((a, b) => a + b, 0) +
                      dreData.structure.otherIncome.reduce((a, b) => a + b, 0) -
                      dreData.structure.otherExpenses.reduce((a, b) => a + b, 0)
                    )}
                  </p>
                </div>
                <PDFDownloadLink
                  document={<DREPDF
                    dreData={dreData}
                    year={dreYear}
                    scope={dreScope}
                  />}
                  fileName={`DRE_${dreYear}_${dreScope === 'ALL' ? 'Todos' : dreScope}_${new Date().toISOString().split('T')[0]}.pdf`}
                >
                  {({ loading }) => (
                    <button
                      className="px-6 py-2 bg-primary text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/10 hover:bg-primary-dark transition-all flex items-center justify-center gap-2 text-[10px]"
                      disabled={loading}
                    >
                      <FileText size={16} />
                      {loading ? '...' : 'Exportar PDF'}
                    </button>
                  )}
                </PDFDownloadLink>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4 min-w-[200px] sticky left-0 bg-slate-50 z-10">Descrição</th>
                    {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map(m => (
                      <th key={m} className="px-4 py-4 text-right">{m}</th>
                    ))}
                    <th className="px-6 py-4 text-right bg-slate-100/50">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* RECEITA BRUTA */}
                  <DRERow label="(+) RECEITA BRUTA" values={dreData.structure.revenueBruta} isHeader />
                  {Object.entries(dreData.details.revenue).map(([cat, vals]) => (
                    <DRERow key={cat} label={cat} values={vals} isSubItem />
                  ))}

                  <DRERow label="(-) DEDUÇÕES (Taxas/Impostos)" values={dreData.structure.deductions} isNegative />

                  {/* RECEITA LÍQUIDA */}
                  <DRERow
                    label="(=) RECEITA LÍQUIDA"
                    values={dreData.structure.revenueBruta.map((v, i) => v - dreData.structure.deductions[i])}
                    isTotal
                  />

                  <DRERow label="(-) CUSTOS DOS SERVIÇOS (Insumos/Logística)" values={dreData.structure.costs} isNegative />

                  {/* LUCRO BRUTO */}
                  <DRERow
                    label="(=) LUCRO BRUTO"
                    values={dreData.structure.revenueBruta.map((v, i) => v - dreData.structure.deductions[i] - dreData.structure.costs[i])}
                    isTotal
                  />

                  {/* DESPESAS OPERACIONAIS */}
                  <DRERow label="(-) DESPESAS OPERACIONAIS" values={dreData.structure.operatingExpenses.map((v, i) => v + dreData.structure.personnel[i])} isHeader isNegative />
                  {Object.entries(dreData.details.operating).map(([cat, vals]) => (
                    <DRERow key={cat} label={cat} values={vals} isSubItem isNegative />
                  ))}
                  <DRERow label="Despesas com Pessoal" values={dreData.structure.personnel} isSubItem isNegative />

                  {/* RESULTADO OPERACIONAL (EBITDA) */}
                  <DRERow
                    label="(=) RESULTADO OPERACIONAL"
                    values={dreData.structure.revenueBruta.map((v, i) =>
                      v - dreData.structure.deductions[i] - dreData.structure.costs[i] - dreData.structure.operatingExpenses[i] - dreData.structure.personnel[i]
                    )}
                    isTotal
                  />

                  <DRERow label="(+/-) RESULTADO FINANCEIRO / OUTROS" values={dreData.structure.otherIncome.map((v, i) => v - dreData.structure.otherExpenses[i] - dreData.structure.financial[i])} />

                  {/* RESULTADO LÍQUIDO */}
                  <DRERow
                    label="(=) RESULTADO LÍQUIDO DO EXERCÍCIO"
                    values={dreData.structure.revenueBruta.map((v, i) =>
                      v - dreData.structure.deductions[i] - dreData.structure.costs[i] - dreData.structure.operatingExpenses[i] - dreData.structure.personnel[i] +
                      dreData.structure.otherIncome[i] - dreData.structure.otherExpenses[i] - dreData.structure.financial[i]
                    )}
                    isFinal
                  />
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
              <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                Este DRE é gerado automaticamente com base nas categorias das suas transações efetivadas.
                Para garantir a precisão, certifique-se de categorizar corretamente seus lançamentos como 'Serviços' para receitas,
                'Impostos' para deduções e 'Escritório' ou 'Administrativo' para despesas operacionais.
              </p>
            </div>
          </div>
        )
      }

      {/* ── ORÇAMENTO (Sistema dos Potes) ─────────────────────────────────── */}
      {activeTab === 'ORCAMENTO' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* ── CATEGORIAS ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                  <Tag size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Categorias</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Gerencie as categorias de receitas e despesas</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {categories.length === 0 && (
                  <button
                    onClick={handleSeedDefaultCategories}
                    disabled={isSavingCategory}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    {isSavingCategory ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
                    {isSavingCategory ? 'Criando...' : 'Adicionar Padrões'}
                  </button>
                )}
                <button
                  onClick={handleOpenNewCategory}
                  className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 shadow-md shadow-violet-200/50 transition-all"
                >
                  <Plus size={14} /> Nova Categoria
                </button>
              </div>
            </div>

            {categories.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Tag size={24} className="text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-500">Nenhuma categoria criada</p>
                <p className="text-[11px] text-slate-400 mt-1">Crie categorias para organizar seus lançamentos e configurar o orçamento por potes.</p>
                <button
                  onClick={handleSeedDefaultCategories}
                  disabled={isSavingCategory}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-700 transition-all shadow-md shadow-violet-200 disabled:opacity-60"
                >
                  {isSavingCategory
                    ? <><Loader2 size={14} className="animate-spin" /> Criando categorias...</>
                    : <><Plus size={14} /> Criar categorias padrão</>
                  }
                </button>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map(cat => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ backgroundColor: cat.color + '22' }}>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{cat.name}</p>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                          cat.type === 'Receita' ? 'bg-emerald-50 text-emerald-600'
                          : cat.type === 'Despesa' ? 'bg-rose-50 text-rose-600'
                          : 'bg-violet-50 text-violet-600'
                        }`}>
                          {cat.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditCategory(cat)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── MEUS POTES (Budget System) ─────────────────────────────────── */}
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <Wallet size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Meus Potes</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Orçamento mensal por categoria</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mês</label>
                <input
                  type="month"
                  value={budgetMonth}
                  onChange={e => setBudgetMonth(e.target.value)}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Summary row */}
            {budgetSummary.count > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Orçamento Total</p>
                  <p className="text-lg font-black text-slate-800 mt-1">{formatCurrency(budgetSummary.totalLimit)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Utilizado</p>
                  <p className={`text-lg font-black mt-1 ${budgetSummary.totalUsed > budgetSummary.totalLimit ? 'text-rose-600' : 'text-slate-800'}`}>
                    {formatCurrency(budgetSummary.totalUsed)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Disponível</p>
                  <p className={`text-lg font-black mt-1 ${budgetSummary.totalRemaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatCurrency(budgetSummary.totalRemaining)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alertas</p>
                  <p className="text-lg font-black text-rose-500 mt-1">{budgetSummary.overBudget} acima</p>
                  <p className="text-[10px] text-amber-500 font-bold">{budgetSummary.nearLimit} próx. limite</p>
                </div>
              </div>
            )}

            {categories.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <Wallet size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">Crie categorias primeiro</p>
                <p className="text-[11px] text-slate-400 mt-1">Para usar os potes, crie suas categorias na seção acima.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {budgetStats.map(({ cat, budget, used, limit, percentage, remaining }) => {
                  const hasLimit = limit > 0;
                  const isOverBudget = hasLimit && percentage > 100;
                  const isNearLimit = hasLimit && percentage >= 75 && !isOverBudget;
                  const barColor = isOverBudget ? '#ef4444' : isNearLimit ? '#f59e0b' : cat.color;
                  const barWidth = hasLimit ? Math.min(percentage, 100) : 0;

                  return (
                    <div
                      key={cat.id}
                      className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-4 transition-all hover:shadow-md ${
                        isOverBudget ? 'border-rose-200 bg-rose-50/30' : isNearLimit ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200/60'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + '22' }}>
                            <Wallet size={16} style={{ color: cat.color }} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800">{cat.name}</p>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                              cat.type === 'Receita' ? 'text-emerald-500'
                              : cat.type === 'Despesa' ? 'text-rose-500'
                              : 'text-violet-500'
                            }`}>{cat.type}</span>
                          </div>
                        </div>
                        {isOverBudget && (
                          <div className="flex items-center gap-1 bg-rose-100 text-rose-600 px-2 py-1 rounded-lg">
                            <AlertCircle size={10} />
                            <span className="text-[9px] font-black uppercase">Excedido</span>
                          </div>
                        )}
                        {isNearLimit && (
                          <div className="flex items-center gap-1 bg-amber-100 text-amber-600 px-2 py-1 rounded-lg">
                            <Info size={10} />
                            <span className="text-[9px] font-black uppercase">Atenção</span>
                          </div>
                        )}
                      </div>

                      {/* Amounts */}
                      {hasLimit ? (
                        <>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500 font-medium">Utilizado</span>
                              <span className={`font-black ${isOverBudget ? 'text-rose-600' : 'text-slate-800'}`}>{formatCurrency(used)}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${barWidth}%`, backgroundColor: barColor }}
                              ></div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 font-medium">
                                {percentage.toFixed(0)}% de {formatCurrency(limit)}
                              </span>
                              <span className={`text-[10px] font-black ${remaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {remaining < 0 ? `+${formatCurrency(Math.abs(remaining))} excedido` : `${formatCurrency(remaining)} restante`}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                            <button
                              onClick={() => handleOpenBudgetModal(cat)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-lg transition-all"
                            >
                              <Target size={10} /> Ajustar Limite
                            </button>
                            <button
                              onClick={() => handleDeleteBudgetForCategory(cat)}
                              className="flex items-center justify-center gap-1 py-1.5 px-2.5 text-[9px] font-black uppercase text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400 font-medium">Sem limite definido</span>
                            <span className="font-bold text-slate-600">{formatCurrency(used)} gasto</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="h-full w-full bg-slate-200 rounded-full"></div>
                          </div>
                          <button
                            onClick={() => handleOpenBudgetModal(cat)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-primary/5 border border-dashed border-slate-200 hover:border-primary/30 text-primary rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                          >
                            <Target size={11} /> Definir Orçamento
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Info card */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                O <strong>Sistema dos Potes</strong> funciona como envelopes mensais: defina um limite para cada categoria e acompanhe
                quanto já foi gasto. Quando um pote atinge <strong>75%</strong>, você recebe um aviso de atenção.
                Ao ultrapassar <strong>100%</strong>, o pote fica em vermelho. Os valores são calculados com base nos lançamentos
                efetivados e pendentes no mês selecionado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: escolha de escopo para edição de parcelas */}
      {showInstallmentChoice && editingTransaction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-black text-slate-800">Editar lançamento parcelado</h3>
              <p className="text-xs text-slate-500">
                Este lançamento é a parcela{' '}
                <span className="font-bold text-slate-700">
                  {editingTransaction.occurrence_number}/{editingTransaction.total_occurrences}
                </span>{' '}
                de uma série. O que deseja alterar?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => doSave('single')}
                disabled={isSaving}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm text-left transition-colors disabled:opacity-50"
              >
                <span className="block text-sm font-black">Apenas esta parcela</span>
                <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                  Altera somente a parcela {editingTransaction.occurrence_number}
                </span>
              </button>
              <button
                onClick={() => doSave('all')}
                disabled={isSaving}
                className="w-full py-3 px-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-bold text-sm text-left transition-colors disabled:opacity-50"
              >
                <span className="block text-sm font-black">Todas as parcelas</span>
                <span className="block text-[10px] text-primary/70 font-normal mt-0.5">
                  Altera todas as {editingTransaction.total_occurrences} parcelas da série (mantém as datas originais)
                </span>
              </button>
            </div>
            <button
              onClick={() => setShowInstallmentChoice(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest self-center transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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

                {/* Categoria */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                    <Tag size={10} /> Categoria
                  </label>
                  {categories.filter(c =>
                    formData.type === TransactionType.INCOME
                      ? c.type === 'Receita' || c.type === 'Ambos'
                      : formData.type === TransactionType.EXPENSE
                        ? c.type === 'Despesa' || c.type === 'Ambos'
                        : true
                  ).length > 0 ? (
                    <select
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories
                        .filter(c =>
                          formData.type === TransactionType.INCOME
                            ? c.type === 'Receita' || c.type === 'Ambos'
                            : formData.type === TransactionType.EXPENSE
                              ? c.type === 'Despesa' || c.type === 'Ambos'
                              : true
                        )
                        .map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Ex: Alimentação, Salário..."
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input required type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="Valor" />
                  <input required type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
                </div>

                {formData.type === TransactionType.TRANSFER ? (
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
                ) : (
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
                )}

                <div className="grid grid-cols-2 gap-4">
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

                {financialProjects.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Projeto Financeiro</label>
                    <select
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                      value={formData.financial_project_id}
                      onChange={e => setFormData({ ...formData, financial_project_id: e.target.value })}
                    >
                      <option value="">Nenhum</option>
                      {financialProjects.map(fp => (
                        <option key={fp.id} value={fp.id}>{fp.name}</option>
                      ))}
                    </select>
                  </div>
                )}

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

                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-dark shadow-lg shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processando...
                    </>
                  ) : 'Confirmar'}
                </button>
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
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-dark shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : 'Salvar'}
              </button>
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
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex-1 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-dark shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Lançando...
                    </>
                  ) : 'Lançar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )
      }
      {showFinancialProjectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-400/10 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300 relative my-auto">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                {editingFinancialProject ? 'Editar Projeto' : 'Novo Projeto Financeiro'}
              </h3>
              <button onClick={() => { setShowFinancialProjectModal(false); setEditingFinancialProject(null); }} className="p-2 text-slate-400 hover:text-rose-500 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleFpSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nome do Projeto *</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary"
                    placeholder="Ex: Reforma da Casa, Viagem de Férias..."
                    value={fpFormData.name}
                    onChange={e => setFpFormData({ ...fpFormData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Descrição</label>
                  <textarea
                    rows={2}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary resize-none"
                    placeholder="Descrição opcional..."
                    value={fpFormData.description}
                    onChange={e => setFpFormData({ ...fpFormData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Orçamento (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary"
                      placeholder="0,00"
                      value={fpFormData.budget}
                      onChange={e => setFpFormData({ ...fpFormData, budget: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Cor</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-1 bg-slate-50"
                        value={fpFormData.color}
                        onChange={e => setFpFormData({ ...fpFormData, color: e.target.value })}
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setFpFormData({ ...fpFormData, color: c })}
                            className="w-5 h-5 rounded-full border-2 transition-all"
                            style={{ backgroundColor: c, borderColor: fpFormData.color === c ? '#1e293b' : 'transparent' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Data Início</label>
                    <input
                      type="date"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary"
                      value={fpFormData.start_date}
                      onChange={e => setFpFormData({ ...fpFormData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Data Fim</label>
                    <input
                      type="date"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary"
                      value={fpFormData.end_date}
                      onChange={e => setFpFormData({ ...fpFormData, end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowFinancialProjectModal(false); setEditingFinancialProject(null); }}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-dark shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                >
                  {isSaving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : (editingFinancialProject ? 'Salvar Alterações' : 'Criar Projeto')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 size={16} className="animate-spin" />}
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Nova / Editar Categoria ─────────────────────────────────── */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }} className="p-2 text-slate-400 hover:text-rose-500 rounded-full transition-all">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome *</label>
                <input
                  required
                  type="text"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-400"
                  placeholder="Ex: Alimentação, Salário..."
                  value={categoryFormData.name}
                  onChange={e => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo *</label>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                  {(['Despesa', 'Receita', 'Ambos'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCategoryFormData({ ...categoryFormData, type: t })}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                        categoryFormData.type === t
                          ? t === 'Despesa' ? 'bg-rose-500 text-white shadow-sm'
                            : t === 'Receita' ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-violet-500 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cor</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-1 bg-slate-50"
                    value={categoryFormData.color}
                    onChange={e => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-2">
                    {['#f97316','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#ec4899','#f59e0b','#22c55e','#06b6d4','#64748b'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategoryFormData({ ...categoryFormData, color: c })}
                        className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                        style={{ backgroundColor: c, borderColor: categoryFormData.color === c ? '#1e293b' : 'transparent' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-violet-700 shadow-md shadow-violet-200 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                >
                  {isSavingCategory ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : (editingCategory ? 'Salvar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Definir Orçamento do Pote ───────────────────────────────── */}
      {showBudgetModal && budgetModalCategory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: budgetModalCategory.color + '22' }}>
                  <Wallet size={16} style={{ color: budgetModalCategory.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">{budgetModalCategory.name}</h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Limite para {new Date(budgetMonth + '-01').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowBudgetModal(false); setBudgetModalCategory(null); }} className="p-2 text-slate-400 hover:text-rose-500 rounded-full transition-all">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveBudget} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  <Target size={10} className="inline mr-1" />
                  {budgetModalCategory.type === 'Receita' ? 'Meta de Receita (R$)' : 'Limite de Gasto (R$)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">R$</span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-lg font-black text-slate-800"
                    placeholder="0,00"
                    value={budgetFormAmount}
                    onChange={e => setBudgetFormAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
                  {budgetModalCategory.type === 'Receita'
                    ? 'Define a meta de receita que deseja atingir nesta categoria.'
                    : 'Define o valor máximo que pode ser gasto nesta categoria no mês.'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowBudgetModal(false); setBudgetModalCategory(null); }}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingBudget}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl font-black uppercase tracking-widest hover:bg-primary-dark shadow-md shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                >
                  {isSavingBudget ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Definir Limite'}
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

interface DRERowProps {
  label: string;
  values: number[];
  isHeader?: boolean;
  isSubItem?: boolean;
  isTotal?: boolean;
  isFinal?: boolean;
  isNegative?: boolean;
}

const DRERow: React.FC<DRERowProps> = ({ label, values, isHeader, isSubItem, isTotal, isFinal, isNegative }) => {
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <tr className={`
      ${isHeader ? 'bg-slate-50/50 font-black text-slate-800' : ''}
      ${isTotal ? 'bg-slate-100/30 font-bold border-t border-slate-200' : ''}
      ${isFinal ? 'bg-primary/5 font-black text-primary border-t-2 border-primary/20' : ''}
      hover:bg-slate-50 transition-colors
    `}>
      <td className={`px-6 py-3 text-xs truncate max-w-[250px] sticky left-0 bg-white z-10 ${isSubItem ? 'pl-10 text-slate-500 font-medium italic' : ''}`}>
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className={`px-4 py-3 text-right text-[11px] font-medium ${isNegative && v !== 0 ? 'text-rose-600' : ''} ${isFinal || isTotal ? 'font-bold' : ''}`}>
          {Math.abs(v) < 0.01 ? '-' : formatCurrency(v)}
        </td>
      ))}
      <td className={`px-6 py-3 text-right text-xs font-black ${isFinal ? 'text-primary' : isNegative && total !== 0 ? 'text-rose-700' : 'text-slate-800'} bg-slate-50/50`}>
        {Math.abs(total) < 0.01 ? '-' : formatCurrency(total)}
      </td>
    </tr>
  );
};

export default FinancialModule;
