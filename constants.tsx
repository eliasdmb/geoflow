
import React from 'react';
import {
  WorkflowStepId,
  ProjectStatus,
  WorkflowStep,
  Client,
  RuralProperty,
  Professional,
  Service,
  BudgetItemTemplate,
  Registry
} from './types';
import {
  FileText,
  FileSignature,
  ClipboardList,
  ShieldCheck,
  Files,
  CheckCircle,
  Users,
  Map,
  Landmark,
  Stamp,
  Receipt,
  MapPin
} from 'lucide-react';

export const WORKFLOW_STEPS_DEFINITION: { id: WorkflowStepId; label: string; hasDocument: boolean; icon: React.ReactNode }[] = [
  { id: WorkflowStepId.BUDGET, label: 'Orçamento', hasDocument: true, icon: <FileText size={18} /> },
  { id: WorkflowStepId.CONTRACT, label: 'Contrato de Trabalho', hasDocument: true, icon: <FileSignature size={18} /> },
  { id: WorkflowStepId.SERVICE_ORDER, label: 'Ordem de Serviço', hasDocument: true, icon: <ClipboardList size={18} /> },
  { id: WorkflowStepId.ART_CREA, label: 'ART para o CREA-GO', hasDocument: false, icon: <ShieldCheck size={18} /> },
  { id: WorkflowStepId.DOCUMENTATION, label: 'Documentação (Checklist)', hasDocument: false, icon: <Files size={18} /> },
  { id: WorkflowStepId.SIGEF, label: 'Certificação no SIGEF', hasDocument: false, icon: <CheckCircle size={18} /> },
  { id: WorkflowStepId.CONFRONTANTS, label: 'Anuência dos Confrontantes', hasDocument: false, icon: <Users size={18} /> },
  { id: WorkflowStepId.GEO_REPORT, label: 'Laudo de Georreferenciamento', hasDocument: true, icon: <Map size={18} /> },
  { id: WorkflowStepId.CARTORY_REQ, label: 'Requerimento para o Cartório', hasDocument: true, icon: <Landmark size={18} /> },
  { id: WorkflowStepId.CRI_REGISTRATION, label: 'Registro no CRI', hasDocument: false, icon: <Stamp size={18} /> },
  { id: WorkflowStepId.POINT_CONTROL, label: 'Controle de Pontos', hasDocument: false, icon: <MapPin size={18} /> },
  { id: WorkflowStepId.RECEIPT, label: 'RECIBO', hasDocument: true, icon: <Receipt size={18} /> },
];

export const CAR_WORKFLOW_STEPS_DEFINITION: { id: WorkflowStepId; label: string; hasDocument: boolean; icon: React.ReactNode }[] = [
  { id: WorkflowStepId.BUDGET, label: 'Orçamento', hasDocument: true, icon: <FileText size={18} /> },
  { id: WorkflowStepId.CONTRACT, label: 'Contrato de Trabalho', hasDocument: true, icon: <FileSignature size={18} /> },
  { id: WorkflowStepId.SERVICE_ORDER, label: 'Ordem de Serviço', hasDocument: true, icon: <ClipboardList size={18} /> },
  { id: WorkflowStepId.DOCUMENTATION, label: 'Documentação (Checklist)', hasDocument: false, icon: <Files size={18} /> },
  { id: WorkflowStepId.SIGEF, label: 'Cadastro no SICAR/SIGCAR', hasDocument: false, icon: <CheckCircle size={18} /> },
  { id: WorkflowStepId.RECEIPT, label: 'RECIBO', hasDocument: true, icon: <Receipt size={18} /> },
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'João da Silva',
    // Fix: Changed maritalStatus to marital_status to match type definition
    marital_status: 'Casado',
    profession: 'Produtor Rural',
    // Fix: Changed cpfCnpj to cpf_cnpj to match type definition
    cpf_cnpj: '123.456.789-00',
    rg: '1234567 SPT-GO',
    email: 'joao@example.com',
    phone: '(62) 99999-9999',
    address: {
      street: 'Rua das Palmeiras',
      block: '12',
      lot: '05',
      number: 'S/N',
      sector: 'Zona Rural',
      city: 'Anápolis',
      cep: '75000-000'
    }
  },
  {
    id: '2',
    name: 'Maria Oliveira',
    // Fix: Changed maritalStatus to marital_status to match type definition
    marital_status: 'Divorciada',
    profession: 'Engenheira Agrônoma',
    // Fix: Changed cpfCnpj to cpf_cnpj to match type definition
    cpf_cnpj: '98.765.432/0001-99',
    rg: '7654321 DGPC-GO',
    email: 'contato@agropec.com.br',
    phone: '(62) 3333-3333',
    address: {
      street: 'Av. T-63',
      block: 'A',
      lot: '10',
      number: '1200',
      sector: 'Setor Bueno',
      city: 'Goiânia',
      cep: '74230-100'
    }
  },
];

export const INITIAL_PROPERTIES: RuralProperty[] = [
  {
    id: '1',
    name: 'Fazenda Santa Luzia',
    // Fix: Changed area to area_ha and registrationNumber to registration_number to match type definition
    area_ha: 450.5,
    registration_number: '45.231',
    municipality: 'Anápolis',
    uf: 'GO',
    cri: '1º Ofício de Registro de Imóveis',
    comarca: 'Anápolis',
    // Fix: Changed incraCode to incra_code to match type definition
    incra_code: '950.123.456.789-0'
  },
  {
    id: '2',
    name: 'Estância do Sol',
    // Fix: Changed area to area_ha and registrationNumber to registration_number to match type definition
    area_ha: 120.2,
    registration_number: '12.880',
    municipality: 'Trindade',
    uf: 'GO',
    cri: 'Registro de Imóveis de Trindade',
    comarca: 'Trindade',
    // Fix: Changed incraCode to incra_code to match type definition
    incra_code: '950.987.654.321-0'
  },
];

export const INITIAL_PROFESSIONALS: Professional[] = [
  {
    id: '1',
    name: 'Eng. Roberto Santos',
    crea: 'GO-12345/D',
    specialty: 'Engenheiro Agrimensor',
    professional_title: 'Engenheiro Agrimensor',
    credential_code: 'GO1',
    cpf: '111.222.333-44',
    phone: '(62) 98888-7777',
    email: 'roberto@geoflow.com.br',
    address: 'Rua 10, nº 100, Setor Oeste, Goiânia - GO',
    // Fix: Changed incraCode to incra_code to match type definition
    incra_code: 'XYZ1'
  },
  {
    id: '2',
    name: 'Dr. Fernando Lima',
    crea: 'GO-54321/D',
    specialty: 'Engenheiro Cartógrafo',
    professional_title: 'Engenheiro Cartógrafo',
    credential_code: 'GO2',
    cpf: '555.666.777-88',
    phone: '(62) 97777-6666',
    email: 'fernando@geoflow.com.br',
    address: 'Av. T-9, Ed. Business, Sala 202, Goiânia - GO',
    // Fix: Changed incraCode to incra_code to match type definition
    incra_code: 'ABC2'
  },
];

export const INITIAL_REGISTRIES: Registry[] = [
  {
    id: '1',
    name: 'Ofício de Registro de Imóveis de Montividiu',
    cns: '02.456-1',
    municipality: 'Montividiu',
    uf: 'GO'
  },
  {
    id: '2',
    name: '1º Ofício de Registro de Imóveis de Rio Verde',
    cns: '02.123-4',
    municipality: 'Rio Verde',
    uf: 'GO'
  }
];

export const INITIAL_SERVICES: Service[] = [
  {
    id: '1',
    name: 'Georreferenciamento de Imóvel Rural (Pacote Completo)',
    description: 'Prestação de serviços técnicos especializados de Georreferenciamento de Imóvel Rural, conforme normas do INCRA.',
    items: [
      'Levantamento planialtimétrico georreferenciado com GNSS',
      'Implantação e identificação dos vértices do perímetro',
      'Elaboração de planta e memorial descritivo padrão INCRA',
      'Certificação do imóvel junto ao SIGEF/INCRA',
      'Suporte para averbação no Cartório de Registro de Imóveis'
    ],
    base_price: 5000
  },
  {
    id: '2',
    name: 'CAR - Cadastro Ambiental Rural - SIGCAR GO',
    description: 'Elaboração e retificação do Cadastro Ambiental Rural no sistema SIGCAR do Estado de Goiás.',
    items: [
      'Análise de imagens de satélite e dados geoeconômicos',
      'Vetorização de APPs, Reserva Legal e Uso Consolidado',
      'Lançamento de dados no sistema SIGCAR/SEMAD',
      'Acompanhamento da análise técnica perante o órgão ambiental'
    ],
    base_price: 1500
  },
  {
    id: '3',
    name: 'Retificação de Área (Administrativa)',
    description: 'Processo administrativo para retificação de medidas e confrontações junto ao Registro de Imóveis.',
    items: [
      'Levantamento técnico de precisão',
      'Elaboração de plantas e memoriais descritivos',
      'Coleta de assinaturas de anuência dos confrontantes',
      'Montagem de processo para o Cartório'
    ],
    base_price: 3500
  },
  {
    id: '4',
    name: 'Desmembramento / Remembramento',
    description: 'Divisão ou unificação de matrículas de imóveis rurais.',
    items: [
      'Projeto técnico de divisão/unificação',
      'Elaboração de memoriais das novas áreas',
      'Certificação das parcelas no SIGEF (se aplicável)',
      'Protocolo na Prefeitura e INCRA'
    ],
    base_price: 4000
  }
];

export const INITIAL_BUDGET_TEMPLATES: BudgetItemTemplate[] = [
  // Fix: Changed defaultPrice to default_price to match type definition
  { id: '1', description: 'Levantamento com GNSS RTK/PPP', default_price: 2500, category: 'Campo' },
  { id: '2', description: 'Implantação de Marcos de Concreto (Unid)', default_price: 150, category: 'Materiais' },
  { id: '3', description: 'Elaboração de Planta e Memorial', default_price: 1200, category: 'Escritório' },
  { id: '4', description: 'Certificação SIGEF/INCRA', default_price: 800, category: 'Taxas/Processos' },
  { id: '5', description: 'Deslocamento Técnico (km)', default_price: 2.5, category: 'Logística' },
  { id: '6', description: 'Análise de Matrícula e Documentação', default_price: 300, category: 'Escritório' },
];
