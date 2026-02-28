
export enum ProjectStatus {
  NOT_STARTED = 'Não Iniciado',
  IN_PROGRESS = 'Em Andamento',
  PENDING = 'Pendente',
  WAITING_APPROVAL = 'Aguardando Aprovação',
  REJECTED = 'Rejeitado',
  COMPLETED = 'Concluído'
}

export enum WorkflowStepId {
  BUDGET = 0,
  CONTRACT = 1,
  SERVICE_ORDER = 2,
  ART_CREA = 3,
  DOCUMENTATION = 4,
  SIGEF = 5,
  CONFRONTANTS = 6,
  GEO_REPORT = 7,
  CARTORY_REQ = 8,
  CRI_REGISTRATION = 9,
  POINT_CONTROL = 10,
  RECEIPT = 11
}

export enum TransactionType {
  INCOME = 'Receita',
  EXPENSE = 'Despesa',
  TRANSFER = 'Transferência'
}

export enum TransactionStatus {
  PAID = 'Pago',
  PENDING = 'Pendente'
}

export enum PaymentMethod {
  PIX = 'PIX',
  BOLETO = 'Boleto',
  CREDIT_CARD = 'Cartão de Crédito',
  DEBIT_CARD = 'Cartão de Débito',
  TRANSFER = 'Transferência',
  CASH = 'Dinheiro',
  OTHER = 'Outro'
}

export interface FinancialTransaction {
  id: string;
  user_id: string;
  project_id?: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  status: TransactionStatus;
  payment_method?: PaymentMethod;
  account?: string; // Conta principal para receitas/despesas
  from_account_id?: string; // Conta de origem para transferências
  to_account_id?: string; // Conta de destino para transferências
  scope?: 'Pessoal' | 'Empresa';
  notes?: string;
  due_date: string;
  payment_date?: string;
  parent_id?: string;
  occurrence_number?: number;
  total_occurrences?: number;
  is_recurring?: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  user_id?: string;
  name: string;
  cpf_cnpj: string;
  address: string | {
    street: string;
    block: string;
    lot: string;
    number: string;
    sector: string;
    city: string;
    cep: string;
  };
  // Optional fields preserved for document template compatibility
  marital_status?: string;
  profession?: string;
  rg?: string;
  email?: string;
  phone?: string;
  nationality?: string;
}

export interface RuralProperty {
  id: string;
  user_id?: string;
  client_id?: string;
  name: string;
  area_ha: number;
  registration_number: string;
  municipality: string;
  uf: string;
  cri: string;
  comarca: string;
  incra_code: string;
}

export interface Professional {
  id: string;
  user_id?: string;
  name: string;
  crea: string;
  cpf: string;
  address: string;
  phone: string;
  email: string;
  professional_title: string;
  credential_code: string;
  // Kept for document template compatibility
  specialty?: string;
  incra_code?: string;
}

export interface Registry {
  id: string;
  user_id?: string;
  name: string;
  cns: string;
  municipality: string;
  uf: string;
}

export interface SigefCertification {
  id: string;
  user_id?: string;
  project_id?: string;
  cert_number: string;
  cert_date: string;
  art_number: string;
  contract_number: string;
  contract_value: number;
  is_registered: boolean;
}

export interface Service {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  items: string[];
  base_price?: number;
  // Legacy technical fields (consider removing if no longer used in projects)
  professional_id?: string;
  property_id?: string;
  sigef_cert?: string;
  sigef_date?: string;
  art_number?: string;
}

export interface BudgetItemTemplate {
  id: string;
  user_id?: string;
  description: string;
  default_price: number;
  category: string;
}

export interface WorkflowStep {
  id?: string;
  user_id?: string;
  step_id: WorkflowStepId;
  label: string;
  status: ProjectStatus;
  completed_at?: string;
  notes?: string;
  has_document: boolean;
  document_url?: string;
  document_number?: string;
}

export interface PointControlData {
  m: string;
  p: string;
  v: string;
}

export interface Project {
  id: string;
  user_id: string;
  client_id: string;
  property_id: string;
  professional_id: string;
  service_id: string;
  registry_id: string;
  certification_number?: string;
  certification_date?: string;
  art_number?: string;
  project_number?: string;
  title: string;
  current_step_index: number;
  steps?: WorkflowStep[];
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  client_id?: string;
  project_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  type: 'visit' | 'delivery' | 'meeting' | 'office' | 'other';
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  created_at: string;
}

export interface CreditCardExpense {
  id: string;
  user_id: string;
  card_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  installments: number;
  current_installment?: number; // For virtual installment display
  project_id?: string;
  created_at: string;
}

export enum AccountType {
  CHECKING = 'Conta Corrente',
  SAVINGS = 'Conta Poupança',
  INVESTMENT = 'Investimento',
  CASH = 'Dinheiro Físico',
  OTHER = 'Outro'
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  created_at: string;
}

export type ViewState = 'DASHBOARD' | 'PROJECTS' | 'CLIENTS' | 'PROPERTIES' | 'PROFESSIONALS' | 'REGISTRIES' | 'SIGEF_CERTIFICATIONS' | 'SERVICES' | 'BUDGET_TEMPLATES' | 'PROJECT_DETAILS' | 'FINANCIAL' | 'CALENDAR' | 'FINANCIAL_REPORT';
