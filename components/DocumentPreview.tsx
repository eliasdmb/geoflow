
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Download,
  Loader2,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Globe
} from 'lucide-react';
import {
  Project,
  WorkflowStep,
  Client,
  RuralProperty,
  Professional,
  SigefCertification,
  Service,
  BudgetItemTemplate,
  ProjectStatus,
  Registry,
  WorkflowStepId,
  FinancialTransaction,
  TransactionType,
  TransactionStatus,
  PaymentMethod
} from '../types';

const RIO_VERDE_CNS = '02.648-4';

const CHECKLIST_RIO_VERDE = [
  { id: '1', label: '1. REQUERIMENTO DO INTERESSADO solicitando a AVERBAÇÃO da CERTIFICAÇÃO do GEORREFERENCIAMENTO, assinado pelo(a)(s) proprietário(a)(s), com a(s) firma(s) reconhecida(s).' },
  { id: '2', label: '2. CERTIFICAÇÃO emitida pelo INCRA/SIGEF.' },
  { id: '3', label: '3. ANUÊNCIA / DECLARAÇÃO DE RESPEITO DE LIMITES de todos os confrontantes indicados no memorial descritivo e planta, com as respectivas firmas reconhecidas.' },
  { id: '4', label: '4. MAPA expedido pelo SIGEF.' },
  { id: '5', label: '5. PROVA DE ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA (ART) no Conselho Regional de Engenharia, quitada, com as firmas reconhecidas.' },
  { id: '6', label: '6. LAUDO TÉCNICO do engenheiro responsável.' },
  { id: '7', label: '7. CCIR do imóvel ou imóveis atualizado (último).' },
  { id: '8', label: '8. ITR – últimos 05 anos pagos ou Certidão expedida pela Receita Federal.' },
  { id: '9', label: '9. Procuração ou termo de inventariante, se for o caso, de todos os representantes que comparecem no processo ou nas cartas de anuência das confrontações.' },
  { id: '10', label: '10. CAR (Cadastro Ambiental Rural), juntamente com o requerimento para averbação, caso ainda não esteja averbado na matrícula do imóvel.' },
];

const RIO_VERDE_2_CNS = '02.612-0';

const CHECKLIST_RIO_VERDE_2 = [
  { id: '1', label: 'Certificação a ser emitida pelo INCRA.' },
  { id: '2', label: 'Memorial descritivo assinado pelo técnico responsável, contendo o nº do CREA.' },
  { id: '3', label: 'Anuência de todos os confrontantes' },
  { id: '4', label: 'Planta do imóvel rural georreferenciado.' },
  { id: '5', label: 'Planta do imóvel feita pelo técnico responsável, mostrando os confrontantes e suas matrículas, devidamente assinado.' },
  { id: '6', label: 'Laudo Técnico assinado pelo técnico responsável, justificando todas as divergências existentes.' },
  { id: '7', label: 'Certidão do IBAMA.' },
  { id: '8', label: 'CCIR e ITR atualizados.' },
  { id: '9', label: 'ART do CREA' }
];

const CHECKLIST_CAR_GO = [
  { id: '1', label: 'Documentos Pessoais' },
  { id: '2', label: 'Comprovante de Endereço' },
  { id: '3', label: 'Certidão de Matrícula ou Escritura' },
  { id: '4', label: 'e-mail' }
];

interface BudgetItem {
  id: string;
  description: string;
  price: number;
  qty: number;
}

interface DocumentPreviewProps {
  project: Project;
  step: WorkflowStep;
  client: Client;
  property: RuralProperty;
  professional: Professional;
  service: Service;
  allProjects: Project[];
  allClients: Client[];
  allProperties: RuralProperty[];
  allProfessionals: Professional[];
  allServices: Service[];
  allRegistries: Registry[];
  certifications: SigefCertification[];
  budgetItemTemplates: BudgetItemTemplate[];
  onClose: () => void;
  isAdmin?: boolean;
  onApprove?: (docNumber: string) => void;
  onReject?: () => void;
  onUpdateBudgetItems?: (items: BudgetItem[]) => void;
  userName?: string;
  onReceiptReceived?: (transaction: Partial<FinancialTransaction>) => void;
}

const numeroPorExtenso = (valor: number): string => {
  if (valor === 0) return "zero reais";
  const c = [
    ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenouve"],
    ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"],
    ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"]
  ];
  const [inteiroStr, decimalStr] = valor.toFixed(2).split('.');
  const n = parseInt(inteiroStr);
  const d = parseInt(decimalStr);
  let res = "";
  const getGroup = (val: number): string => {
    if (val === 100) return "cem";
    if (val < 20) return c[0][val];
    if (val < 100) return c[1][Math.floor(val / 10)] + (val % 10 ? " e " + c[0][val % 10] : "");
    return c[2][Math.floor(val / 100)] + (val % 100 ? " e " + getGroup(val % 100) : "");
  };
  const milhoes = Math.floor((n % 1000000000) / 1000000);
  if (milhoes > 0) res += getGroup(milhoes) + (milhoes === 1 ? " milhão" : " milhões");
  const mil = Math.floor((n % 1000000) / 1000);
  if (mil > 0) {
    if (res) res += (mil < 100 && (mil % 100 !== 0) ? " e " : ", ");
    res += (mil === 1 && !res ? "" : getGroup(mil)) + " mil";
  }
  const und = n % 1000;
  if (und > 0) {
    if (res && (und < 100 || und % 100 === 0)) res += " e ";
    else if (res) res += ", ";
    res += getGroup(und);
  }
  if (n > 0) {
    res += (n === 1 ? " real" : " reais");
    if (n % 1000000 === 0 && n > 1000) res = res.replace("reais", "de reais");
  }
  if (d > 0) {
    if (n > 0) res += " e ";
    res += getGroup(d) + (d === 1 ? " centavo" : " centavos");
  }
  return res;
};

import { logAudit } from '../lib/audit';
import { formatDate } from '../utils';

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  project,
  step,
  client,
  property,
  professional,
  service,
  allProjects,
  allClients,
  allProperties,
  allProfessionals,
  allServices,
  allRegistries,
  certifications,
  budgetItemTemplates,
  onClose,
  onApprove,
  onReject,
  onUpdateBudgetItems,
  userName,
  onReceiptReceived
}) => {
  const docRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');

  const LOGO_URL = 'https://lh3.googleusercontent.com/d/1xQfCG7HAQ6_LcrMn_1cINu5KSumlHdxT=s2000';

  const todayDate = new Date();
  const [customDate, setCustomDate] = useState(todayDate.toISOString().split('T')[0]);
  const today = new Date(customDate + 'T12:00:00').toLocaleDateString('pt-BR');
  const targetYear = new Date(customDate).getFullYear();

  const [docNumber, setDocNumber] = useState(step.document_number || `${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}/${targetYear}`);

  // Find the budget step to load/save items from
  const budgetStep = project.steps?.find(s => s.step_id === WorkflowStepId.BUDGET);

  const [items, setItems] = useState<BudgetItem[]>(() => {
    // 1. Tenta carregar itens salvos no passo de Orçamento (JSON)
    if (budgetStep?.notes) {
      try {
        const parsed = JSON.parse(budgetStep.notes);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && 'price' in parsed[0]) {
          return parsed;
        }
      } catch (e) {
        // Se não for JSON válido, cai para lógica padrão
      }
    }

    // 2. Se não houver itens salvos, usa a biblioteca de modelos de orçamento
    if (budgetItemTemplates && budgetItemTemplates.length > 0) {
      return budgetItemTemplates.map(t => ({
        id: t.id,
        description: t.description,
        price: t.default_price,
        qty: 1
      }));
    }

    // 3. Legado: se não houver modelos, usa itens definidos no serviço
    if (service && service.items && service.items.length > 0) {
      return service.items.map((item, index) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: item,
        price: index === 0 ? (service.base_price || 5000) : 0,
        qty: 1
      }));
    }

    // 4. Fallback genérico
    return [{ id: '1', description: `Serviços Técnicos - ${property?.name || 'Imóvel'}`, price: 5000, qty: 1 }];
  });

  const [adjustment, setAdjustment] = useState(0);
  const totalItems = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const totalFinal = Math.max(0, totalItems + adjustment);

  const [showEditor, setShowEditor] = useState(false);
  const [isSavingValues, setIsSavingValues] = useState(false);

  const isDocumentationStep = step.step_id === WorkflowStepId.DOCUMENTATION;
  const isCarService = service?.name?.toUpperCase().includes('CAR');
  const isReceiptStep = step.step_id === WorkflowStepId.RECEIPT || step.label === 'RECIBO';

  const handleUpdateItem = (id: string, updates: Partial<BudgetItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, { id: crypto.randomUUID(), description: 'Novo Item', price: 0, qty: 1 }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleSaveItems = async () => {
    if (!onUpdateBudgetItems) return;
    setIsSavingValues(true);
    try {
      await onUpdateBudgetItems(items);
    } finally {
      setIsSavingValues(false);
    }
  };

  const selectedRegistry = allRegistries?.find(r => r.id === project?.registry_id);
  const selectedCertification =
    certifications?.find(c => c.project_id === project?.id) ||
    certifications?.find(c => c.contract_number && (c.contract_number === project?.id || c.contract_number === project?.certification_number)) ||
    certifications?.find(c => c.cert_number && c.cert_number === project?.certification_number);

  // Compute next sequential document number per document type (step.label)
  const computeNextDocNumber = (label: string): string => {
    const currentYear = new Date().getFullYear();
    let maxSeq = 0;
    try {
      for (const p of allProjects || []) {
        for (const s of (p.steps || [])) {
          if (s.label === label && s.document_number) {
            // Expect format NNNN/YYYY or similar; extract leading number and year
            const match = /^(\d{1,6})\/(\d{4})/.exec(s.document_number.trim());
            if (match) {
              const seq = parseInt(match[1], 10);
              const year = parseInt(match[2], 10);
              if (year === currentYear && seq > maxSeq) maxSeq = seq;
            }
          }
        }
      }
    } catch { }
    const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
    return `${nextSeq}/${currentYear}`;
  };

  // Auto-assign number if missing for this step
  useEffect(() => {
    if (!step?.document_number) {
      setDocNumber(computeNextDocNumber(step.label));
    } else {
      setDocNumber(step.document_number);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, step?.label, step?.document_number]);

  const getPlainTextContent = (targetStep: WorkflowStep) => {
    if (!client || !property || !professional) {
      return "Carregando dados do documento...";
    }

    const formattedClientAddress = typeof client.address === 'string' 
      ? client.address 
      : `${client.address?.street || ''}, nº ${client.address?.number || 'S/N'}, ${client.address?.city || ''}`;
    const registryMunicipality = selectedRegistry?.municipality || 'Montividiu';

    switch (targetStep.label) {
      case 'Contrato de Trabalho':
        return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE GEORREFERENCIAMENTO DE IMÓVEL RURAL

Contrato nº ${project.id || 'S/N'}
Pelo presente instrumento particular, as partes abaixo identificadas:

CONTRATANTE:
Nome: ${client.name.toUpperCase()}
CPF/CNPJ: ${client.cpf_cnpj}
Endereço: ${formattedClientAddress}
Telefone: ${client.phone}
E-mail: ${client.email}

CONTRATADO:
Nome: ${professional.name.toUpperCase()}
CPF/CNPJ: ${professional.cpf}
CREA/ART: ${professional.crea}
Endereço: ${professional.address}
Telefone: ${professional.phone}
E-mail: ${professional.email}

CLÁUSULA PRIMEIRA – OBJETO
O presente contrato tem como objeto a prestação dos serviços técnicos de Levantamento Planialtimétrico Georreferenciado e Elaboração de Peças Técnicas para fins de Certificação no imóvel rural de propriedade do CONTRATANTE, conforme exigências da Lei nº 10.267/2001, do Decreto nº 4.449/2002, e das normas do SIGEF/INCRA.

CLÁUSULA SEGUNDA – DESCRIÇÃO DO IMÓVEL
O imóvel a ser georreferenciado está localizado no Município de ${property.municipality}, Estado de GO, com área de ${property.area_ha} hectares, denominado ${property.name.toUpperCase()}, registrado sob a matrícula nº ${property.registration_number}, no Cartório de Registro de Imóveis de ${property.comarca || property.municipality}.

CLÁUSULA TERCEIRA – OBRIGAÇÕES DO CONTRADO
O CONTRATADO obriga-se a:
${service.items && service.items.length > 0 ? service.items.map((item, index) => `${index + 1}. ${item}`).join('\n') : `1. Executar o levantamento planialtimétrico georreferenciado do imóvel, conforme exigências técnicas do INCRA/SIGEF;
2. Elaborar planta e memorial descritivo do imóvel com base nas coordenadas geodésicas obtidas;
3. Obter as anuências dos confrontantes.
4. Providenciar o envio dos dados ao sistema SIGEF para certificação;
5. Fornecer ao CONTRATANTE cópia digital e impressa dos documentos gerados.`}

CLÁUSULA QUARTA – OBRIGAÇÕES DO CONTRATANTE
O CONTRATANTE obriga-se a:
1. Fornecer os documentos necessários (matrícula, CPF/CNPJ, documentos do imóvel, etc.);
2. Permitir o acesso do CONTRATADO à propriedade para realização dos levantamentos de campo;
3. Realizar os pagamentos nos prazos estabelecidos neste contrato.

CLÁUSULA QUINTA – VALOR E CONDIÇÕES DE PAGAMENTO
Pelos serviços contratados, o CONTRATANTE pagará ao CONTRATADO a quantia de R$ ${totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${numeroPorExtenso(totalFinal)}), a serem pagos imediatamente após a entrega dos documentos para registro no CRI do imóvel rural.

CLÁUSULA SEXTA – PRAZO DE EXECUÇÃO
O prazo estimado para conclusão dos serviços é de 60 (sessenta) dias, contados a partir da data de assinatura deste contrato e entrega de todos os documentos necessários.

CLÁUSULA SÉTIMA – RESPONSABILIDADE TÉCNICA
O serviço será executado sob responsabilidade técnica do profissional habilitado, com emissão da Anotação de Responsabilidade Técnica (ART) junto ao CREA/CONFEA.

CLÁUSULA OITAVA – RESCISÃO
O presente contrato poderá ser rescindido por qualquer das partes, mediante notificação por escrito com antecedência mínima de 10 (dez) dias. Em caso de rescisão, o CONTRATADO terá direito ao recebimento proporcional dos serviços já executados.

CLÁUSULA NONA – CONDIÇÕES GERAIS
As partes elegem o foro da Comarca de ${property.comarca || property.municipality}, para dirimir eventuais dúvidas ou controvérsias oriundas deste contrato, renunciando a qualquer outro, por mais privilegiado que seja.

${clientAddr.city || 'Cidade'}, ${today}

CONTRATANTE:

CONTRATADO:

TESTEMUNHAS:

Nome:
CPF:
Nome:
CPF:`;

      case 'Ordem de Serviço':
        const serviceItemsList = service.items && service.items.length > 0
          ? service.items.map((item, index) => `${index + 1}. ${item}`).join('\n')
          : `1. Georreferenciamento de Imóvel Rural
2. Levantamento Planialtimétrico com GNSS
3. Elaboração de Plantas e Memoriais
4. Certificação junto ao SIGEF/INCRA`; // Fallback to original if no service items

        return `ORDEM DE SERVIÇO Nº ${docNumber}

CLIENTE: ${client.name.toUpperCase()}
CPF/CNPJ: ${client.cpf_cnpj}
ENDEREÇO: ${formattedClientAddress}

IMÓVEL: ${property.name.toUpperCase()}
MUNICÍPIO: ${property.municipality} - UF: GO
MATRÍCULA: ${property.registration_number}
ÁREA: ${property.area_ha} ha

DESCRIÇÃO DOS SERVIÇOS:
${serviceItemsList}

RESPONSÁVEL TÉCNICO:
${professional.name.toUpperCase()}
CREA: ${professional.crea}
ART nº: ${selectedCertification?.art_number || project.art_number || ''}

PRAZOS:
Início: Imediato
Previsão de Término: 60 dias

CONDIÇÕES GERAIS:
Serviço executado conforme Normas Técnicas do INCRA (3ª Edição).`;

      case 'Laudo Técnico':
      case 'Laudo de Georreferenciamento':
        return `LAUDO TÉCNICO DE GEORREFERENCIAMENTO DE IMÓVEL RURAL



1.\tIDENTIFICAÇÃO DO PROFISSIONAL RESPONSÁVEL
Nome:\t${professional.name}
CREA:\t${professional.crea}\tCPF:\t${professional.cpf}
Edereço:\t${professional.address}
Telefone:\t${professional.phone}\te-mail:\t${professional.email}

2.\tIDENTIFICAÇÃO DO IMÓVEL\t
Propriedade:\t${property.name}\t
Área Total(ha):\t${property.area_ha}
Município:\t${property.municipality}
NºMatrícula:\t${property.registration_number}
CRI:\t${selectedRegistry?.name || ''}
Comarca:\t${property.comarca || property.municipality}              Cód. Incra:\t${property.incra_code || ''}

3.\tIDENTIFICAÇÃO DO PROPRIETÁRIO
Nome:\t${client.name}
CPF:\t${client.cpf_cnpj}
Endereço:\t     ${formattedClientAddress}

4.\tDeclaração Técnica

Declaro, na qualidade de profissional legalmente habilitado, que realizei os serviços técnicos de levantamento planialtimétrico georreferenciado do perímetro do imóvel rural acima descrito, obedecendo aos preceitos da legislação vigente, especialmente a Lei nº 10.267/2001, o Decreto nº 4.449/2002 e a Norma Técnica do INCRA.
O levantamento foi executado com equipamentos GNSS, pelo método de Posicionamento por Ponto Preciso em tempo Real (RT-PPP), de precisão compatível com os padrões exigidos, e os vértices foram definidos conforme a Norma Técnica para Georreferenciamento de Imóveis Rurais. O imóvel encontra-se certificado junto ao SIGEF/INCRA, sob o número: ${selectedCertification?.cert_number || project.certification_number || ''}, emitida em ${formatDate(selectedCertification?.cert_date || project.certification_date)}.
Sob as penas da lei, declaro que:
1. Não houve alteração de divisas reais e efetivas do imóvel registrado;
2. Não houve alteração de medidas perimetrais, nem invasão de propriedades confinantes;
3. Todos os envolvidos estão cientes de que, não sendo verdadeiros os fatos constantes do memorial descritivo e planta, responderão pelos prejuízos causados, independentemente das sanções penais e disciplinares cabíveis.

5.\tConfrontações e Limites


Os limites do imóvel foram identificados em campo com a presença e ciência dos confrontantes, e estão representados na planta e no memorial descritivo georreferenciados, os quais acompanham este laudo. 



${property.municipality}, ${today}






${professional.name}
Engenheiro Agrônomo
 CREA: ${professional.crea}
CPF: ${professional.cpf}     
ART Nº ${selectedCertification?.art_number || project.art_number || ''}
Cód. Credenciado: ${professional.incra_code || ''}`;

      case 'RECIBO':
        const receiptTextPlain = isCarService
          ? `Recebemos de ${client.name.toUpperCase()}, a importância de R$ ${totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${numeroPorExtenso(totalFinal)}), referente à quitação parcial/total dos serviços técnicos de CAR do imóvel ${property.name.toUpperCase()}.`
          : `Recebi de ${client.name.toUpperCase()}, CPF/CNPJ ${client.cpf_cnpj}, a importância de R$ ${totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, (${numeroPorExtenso(totalFinal)}), referente à prestação de serviços técnicos de georreferenciamento do imóvel rural denominado ${property.name.toUpperCase()}, situado no município de ${property.municipality}/${property.uf || 'GO'}.`;

        return `RECIBO
 
${receiptTextPlain}
 
${registryMunicipality} - GO, ${today}.`;

      case 'Orçamento':
        return `ORÇAMENTO DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS\n\nResumo: Execução de Georreferenciamento para o imóvel ${property.name}.\nValor Total: R$ ${totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nEste documento detalhado está disponível na visualização formatada.`;

      case 'Requerimento para o Cartório':
        if (selectedRegistry?.cns === '02.612-0') {
          const certNumber = selectedCertification?.cert_number || project.certification_number || '______________';
          return `REQUERIMENTO PARA AVERBAÇÃO

Ilustríssimo Sr. Oficial do Registro de Imóveis da Comarca de Rio Verde, Estado de Goiás.

${client.name.toUpperCase()}, ${client.nationality || 'brasileiro'}, ${client.marital_status || 'casado'}, ${client.profession || 'agropecuarista'}, portador do CPF nº. ${client.cpf_cnpj}, residente e domiciliado em ${formattedClientAddress}, proprietário do imóvel rural denominado ${property.name.toUpperCase()}, localizado no município de Rio Verde/GO, devidamente inscrito no Serviço de Registro de Imóveis da comarca de Rio Verde/GO, sob a matrícula nº ${property.registration_number}, cadastrado no INCRA sob o nº ${property.incra_code || '________________'}, abaixo assinado, vem perante V. Sra., requerer a averbação do Georreferenciamento do referido imóvel acima descrito, conforme certificação no SIGEF/INCRA nº ${certNumber}, com a área de ${property.area_ha} ha de minha propriedade e declarar, sob pena de responsabilidade civil e criminal, que não houve alteração das divisas existentes dos imóveis confinantes especificados nas Plantas e memoriais descritivos em anexo e que foram respeitados os direitos dos confrontantes, conforme § 14 do artigo 213, da lei nº 6.015/73.

Rio Verde GO, ${today}.


${client.name.toUpperCase()}
CPF: ${client.cpf_cnpj}
Requerente`;
        }

        if (selectedRegistry?.cns === '02.648-4') {
          return `Ilma. Sra.
Oficial do Registro de Imóveis e Anexos de Montividiu/GO

Eu, ${client.name.toUpperCase()}, Brasileiro, ${client.marital_status || ''}, ${client.profession || ''}, CPF: ${client.cpf_cnpj}, residente e domiciliado na ${formattedClientAddress}, com e-mail: ${client.email} e telefone: ${client.phone}, venho requerer à V.S. que se digne a REGISTRAR/AVERBAR no Livro 02, matrícula(s): M. ${property.registration_number}, Registro Geral do SRI desta Comarca de Montividiu/GO, com emissão de certidão(ões), o(s) seguinte(s):

1.\tGeorreferenciamento de Imóvel Rural - ${property.name.toUpperCase()}.
Certificação SIGEF/INCRA: ${selectedCertification?.cert_number || project.certification_number || ''}
Data da Certificação: ${formatDate(selectedCertification?.cert_date || project.certification_date)}


Nestes Termos,
Pede Deferimento.

Montividiu GO, ${today}.`;
        }
        const genericRegistryName = selectedRegistry?.name || 'Registro de Imóveis competente';
        const genericRegistryCity = selectedRegistry?.municipality || property.municipality || '__________';
        const genericCertNumber = selectedCertification?.cert_number || project.certification_number || '______________';
        return `REQUERIMENTO PARA AVERBAÇÃO

Ilustríssimo(a) Sr(a). Oficial do ${genericRegistryName}, Comarca de ${genericRegistryCity}/GO.

${client.name.toUpperCase()}, ${client.nationality || 'brasileiro'}, ${client.marital_status || 'casado'}, ${client.profession || 'produtor rural'}, portador do CPF/CNPJ nº ${client.cpf_cnpj}, residente e domiciliado em ${formattedClientAddress}, proprietário do imóvel rural denominado ${property.name.toUpperCase()}, localizado no município de ${property.municipality}/GO, inscrito sob a matrícula nº ${property.registration_number}, cadastrado no INCRA sob o nº ${property.incra_code || '________________'}, vem, respeitosamente, requerer a Vossa Senhoria a averbação do georreferenciamento do imóvel acima descrito, conforme Certificação SIGEF/INCRA nº ${genericCertNumber}, com área de ${property.area_ha} ha.

Declara, sob as penas da lei, que não houve alteração das divisas reais e efetivas do imóvel registrado, bem como foram respeitados os direitos dos confrontantes especificados nas plantas e memoriais descritivos em anexo.

Nestes Termos,
Pede Deferimento.

${genericRegistryCity} - GO, ${today}.


${client.name.toUpperCase()}
CPF/CNPJ: ${client.cpf_cnpj}
Requerente`;

      case 'Capa do Processo':
        return `CAPA DO PROCESSO\n\nCLIENTE: ${client.name.toUpperCase()}\nIMÓVEL: ${property.name.toUpperCase()}\n\nItens do Processo:\n${(() => {
          try {
            const checklistState = step.notes ? JSON.parse(step.notes) : {};
            const registry = allRegistries?.find(r => r.id === project?.registry_id);
            const registryCns = registry?.cns;
            const isCarGo = service?.name === 'CAR - Cadastro ambiental Rural - SIGCAR GO';

            let activeChecklist = CHECKLIST_RIO_VERDE;
            if (isCarGo) {
              activeChecklist = CHECKLIST_CAR_GO;
            } else if (registryCns === RIO_VERDE_2_CNS) {
              activeChecklist = CHECKLIST_RIO_VERDE_2;
            } else if (registryCns === RIO_VERDE_CNS) {
              activeChecklist = CHECKLIST_RIO_VERDE;
            }
            return activeChecklist.map(item => `[${checklistState[item.id] ? 'X' : ' '}] ${item.label}`).join('\n');
          } catch {
            return "Erro ao carregar itens.";
          }
        })()
          }`;

      default:
        return `Documento de ${targetStep.label} para o projeto ${project?.title || 'Metrica Agro'}.\n\nCLIENTE: ${client.name.toUpperCase()}\nIMÓVEL: ${property.name.toUpperCase()}\nÁREA: ${property.area_ha} ha\nREGISTRO: ${property.registration_number}\n\nResponsável Técnico: ${professional.name}\nCREA: ${professional.crea}\nData: ${today}`;
    }
  };

  const [textContent, setTextContent] = useState(getPlainTextContent(step));

  useEffect(() => {
    setTextContent(getPlainTextContent(step));
  }, [step, client, property, professional, totalFinal]);

  const handleGeneratePDF = async () => {
    if (!docRef.current) return;
    const html2pdfLib = (window as any).html2pdf;
    if (!html2pdfLib) {
      alert("Sistema de PDF indisponível. Recarregue a página.");
      return;
    }
    setIsGenerating(true);
    const docElement = docRef.current;
    if (!docElement) return;

    // Salvar estilos originais
    const originalStyles = {
      width: docElement.style.width,
      minHeight: docElement.style.minHeight,
      paddingTop: docElement.style.paddingTop,
      paddingBottom: docElement.style.paddingBottom,
      paddingLeft: docElement.style.paddingLeft,
      paddingRight: docElement.style.paddingRight,
    };

    // Aplicar estilos de A4 temporariamente para a geração do PDF
    docElement.style.width = '210mm';
    docElement.style.minHeight = '297mm';
    docElement.style.paddingTop = '8mm';
    docElement.style.paddingBottom = '8mm';
    docElement.style.paddingLeft = '8mm';
    docElement.style.paddingRight = '8mm';

    try {
      setGenerationMessage("Iniciando geração...");
      setGenerationProgress(10);

      const opt = {
        margin: 0,
        filename: `${step.label}_${property?.name || 'doc'}.pdf`,
        image: { type: 'png', quality: 1.0 },
        html2canvas: {
          scale: 3,
          useCORS: true,
          letterRendering: true,
          scrollY: 0,
          scrollX: 0,
          logging: false,
          dpi: 300
        },
        pagebreak: { mode: ['css', 'legacy'] },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Simulação de progresso enquanto o PDF é processado
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) return prev;
          if (prev < 40) {
            setGenerationMessage("Capturando conteúdo...");
            return prev + 5;
          }
          if (prev < 70) {
            setGenerationMessage("Renderizando componentes...");
            return prev + 2;
          }
          setGenerationMessage("Finalizando arquivo...");
          return prev + 1;
        });
      }, 300);

      await html2pdfLib().set(opt).from(docElement).save();

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationMessage("Concluído!");

      // Delay pequeno para mostrar o "Concluído"
      await new Promise(resolve => setTimeout(resolve, 800));

    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
      // Restaurar estilos originais
      docElement.style.width = originalStyles.width;
      docElement.style.minHeight = originalStyles.minHeight;
      docElement.style.paddingTop = originalStyles.paddingTop;
      docElement.style.paddingBottom = originalStyles.paddingBottom;
      docElement.style.paddingLeft = originalStyles.paddingLeft;
      docElement.style.paddingRight = originalStyles.paddingRight;

      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        setGenerationMessage('');
      }, 300);
    }
  };

  if (!client || !property || !professional) {
    return (
      <div className="fixed inset-0 z-[100] flex bg-slate-400/10 backdrop-blur-md">
        <div className="bg-white rounded-2xl flex flex-col items-center p-8 shadow-2xl">
          <Loader2 className="animate-spin text-primary mb-4" size={40} />
          <p className="text-sm font-black text-slate-600 uppercase tracking-widest">Sincronizando Dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex bg-slate-400/10 backdrop-blur-md">
      <div className="bg-white w-full shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/5 text-primary flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div className="overflow-hidden">
              <h3 className="text-sm font-semibold text-slate-800 truncate">Visualização de Documento</h3>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider truncate">{step.label} • {property.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onReject && !isReceiptStep && (
              <button
                onClick={onReject}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-semibold rounded-lg hover:bg-rose-100 transition-all border border-rose-100 uppercase tracking-wider"
              >
                Recusar
              </button>
            )}
            {onApprove && (
              <button
                onClick={() => {
                  if (isReceiptStep && onReceiptReceived) {
                    const description = `Recebimento - ${project.title || property.name} (${client.name})`;
                    onReceiptReceived({
                      description,
                      amount: totalFinal,
                      type: TransactionType.INCOME,
                      category: 'Serviços',
                      status: TransactionStatus.PAID,
                      payment_method: PaymentMethod.PIX,
                      due_date: customDate,
                      payment_date: customDate,
                      project_id: project.id,
                      scope: 'Empresa'
                    });
                  }
                  onApprove(docNumber);
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white text-[10px] font-black rounded-lg hover:bg-primary-dark transition-all shadow-md shadow-primary/10 uppercase tracking-widest"
              >
                <CheckCircle2 size={14} />
                {isReceiptStep ? 'Recebido' : 'Aprovar'}
              </button>
            )}
            <button
              onClick={() => setShowEditor(!showEditor)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all shadow-sm uppercase tracking-widest ${showEditor ? 'bg-primary text-white shadow-primary/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <FileText size={14} /> {showEditor ? 'Fechar' : 'Editar'}
            </button>
            <button onClick={handleGeneratePDF} disabled={isGenerating} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 bg-primary text-white text-[10px] font-black rounded-lg hover:bg-primary-dark transition-all shadow-lg shadow-primary/10 disabled:opacity-50 uppercase tracking-widest">
              {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} PDF
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row bg-slate-100 overflow-hidden relative">
          {showEditor && (
            <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col animate-in slide-in-from-left duration-300 absolute md:relative inset-0 md:inset-auto z-10 shrink-0">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-4 bg-primary rounded-full"></div> Editor de Valores
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-tighter">Os valores serão sincronizados com todos os documentos.</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 group/item relative">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-rose-100 text-rose-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/item:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>

                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Descrição do Item</label>
                        <input
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Preço (R$)</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            value={item.price}
                            onChange={(e) => handleUpdateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            value={item.qty}
                            onChange={(e) => handleUpdateItem(item.id, { qty: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleAddItem}
                    className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all"
                  >
                    + Adicionar Item
                  </button>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Total Final</span>
                  <span className="text-xl font-black text-primary tracking-tighter">R$ {totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <button
                  onClick={handleSaveItems}
                  disabled={isSavingValues}
                  className="w-full py-3.5 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/10 hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
                >
                  {isSavingValues ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                  {isSavingValues ? 'Sincronizando...' : 'Confirmar e Sincronizar'}
                </button>
              </div>
            </div>
          )}

          {/* PROGRESS OVERLAY */}
          {isGenerating && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/10 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/40 w-full max-w-sm flex flex-col items-center animate-in zoom-in duration-300">
                <div className="relative w-24 h-24 mb-6">
                  {/* Outer Glow Ring */}
                  <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse"></div>

                  {/* Progress Circle (SVG) */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="transparent"
                      className="text-slate-100"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * generationProgress) / 100}
                      strokeLinecap="round"
                      className="text-primary transition-all duration-300 ease-out"
                    />
                  </svg>

                  {/* Percentage in Middle */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-black text-slate-800 tabular-nums">{generationProgress}%</span>
                  </div>
                </div>

                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">{generationMessage}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Estamos preparando seu arquivo</p>

                {/* Linear Bar Fallback/Alternative */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-6 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-out flex items-center justify-end pr-1"
                    style={{ width: `${generationProgress}%` }}
                  >
                    <div className="w-1 h-1 bg-white/50 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-slate-200/50 p-4 sm:p-8 flex justify-center">
            {/* DOCUMENT CONTAINER (A4 SIMULATION) */}
            <div
              ref={docRef}
              className="bg-white shadow-2xl relative text-black font-sans text-[11pt] leading-relaxed print:shadow-none mx-auto w-full max-w-[210mm] transition-all duration-300"
              style={{
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                color: '#000000',
                minHeight: '297mm',
                padding: '20mm'
              }}
            >
              {/* HEADER INSTITUCIONAL */}
              {step.label !== 'Requerimento para o Cartório' && (
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4 w-full" style={{ boxSizing: 'border-box' }}>
                  <div className="flex gap-4 items-center">
                    <img src={LOGO_URL} alt="Logo" className="h-24 w-auto object-contain" crossOrigin="anonymous" />
                    <div className="flex flex-col justify-center">
                      <h1 className="text-xl font-bold uppercase tracking-tighter text-slate-900 leading-none mb-1">Metrica Agro</h1>
                      <p className="text-[8pt] font-black uppercase tracking-widest text-primary mb-1">Serviços Agronomicos e Geomensura</p>
                      <div className="text-[6pt] text-slate-500 font-bold leading-tight">
                        <p>CNPJ: 22.827.795/0001-49</p>
                        <p>E-mail: metrica.agro@gmail.com | WA: 64 99994-0677</p>
                        {step.label !== 'RECIBO' && <p>REGISTRO CREA/GO: 12345/D</p>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col justify-center h-24">
                    <div className="bg-primary text-white px-4 py-1 rounded text-[8pt] font-black uppercase tracking-widest mb-2">Nº</div>
                    <p className="text-lg font-bold text-slate-900">{docNumber}</p>
                    <p className="text-[8pt] font-bold text-slate-400 uppercase">{today}</p>
                  </div>
                </div>
              )}

              {/* TÍTULO DO DOCUMENTO */}
              {step.label !== 'RECIBO' && step.label !== 'Requerimento para o Cartório' && (
                <div className="text-center mb-6">
                  <h2 className="text-lg font-bold uppercase border-y-2 border-slate-100 py-2 tracking-widest inline-block px-8">
                    {step.label}
                  </h2>
                </div>
              )}


              {/* CONTEÚDO PRINCIPAL */}
              {step.label === 'Orçamento' ? (
                <div className="space-y-4 leading-relaxed text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full" style={{ boxSizing: 'border-box' }}>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <h4 className="text-[7pt] font-black text-primary uppercase tracking-widest mb-0.5">Objeto do Orçamento</h4>
                      <p className="text-[10pt] font-bold text-slate-900 leading-tight">{service?.name || 'Serviços Técnicos de Georreferenciamento'}</p>
                      <p className="text-[8pt] font-medium text-slate-500 mt-0.5">{property.name} - {property.area_ha} ha</p>
                    </div>
                    <div className="text-right">
                      <h4 className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Validade</h4>
                      <p className="text-[9pt] font-bold text-slate-900">15 Dias</p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-100 break-inside-avoid page-break-inside-avoid avoid-break" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <table className="w-full text-[8pt]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 uppercase text-[6pt] font-bold tracking-widest">
                          <th className="px-5 py-3 text-left">Descrição do Item</th>
                          <th className="px-3 py-3 text-center">Quant.</th>
                          <th className="px-3 py-3 text-right">Unitário</th>
                          <th className="px-5 py-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item, idx) => (
                          <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="px-5 py-2 font-bold text-slate-700">{item.description}</td>
                            <td className="px-3 py-2 text-center text-slate-500">{item.qty}</td>
                            <td className="px-3 py-2 text-right text-slate-500">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-5 py-2 text-right font-bold text-slate-900">R$ {(item.price * item.qty).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-primary/5 border-t-2 border-primary/10">
                          <td colSpan={3} className="px-5 py-3 text-right">
                            <span className="text-[7pt] font-black text-primary-dark uppercase tracking-widest">Valor Investimento Total</span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="text-[11pt] font-black text-primary">R$ {totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-4 break-inside-avoid page-break-inside-avoid avoid-break" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="text-[7pt] font-bold text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <div className="w-1 h-3 bg-primary rounded-full"></div> Formas de Pagamento
                      </h4>
                      <ul className="space-y-1 text-[7pt] text-slate-600 font-medium">
                        <li className="flex items-center gap-2">✓ À vista com 5% de desconto no PIX</li>
                        <li className="flex items-center gap-2">✓ 50% entrada e 50% na certificação</li>
                        <li className="flex items-center gap-2">✓ Parcelamento via Cartão (até 12x)</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="text-[7pt] font-bold text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <div className="w-1 h-3 bg-primary rounded-full"></div> Prazos de Entrega
                      </h4>
                      <p className="text-[7pt] text-slate-600 font-medium leading-tight">
                        Estimativa de conclusão: <strong>30 a 60 dias</strong> úteis após a entrega técnica da documentação.
                      </p>
                    </div>
                  </div>

                  <div className="text-[7pt] text-slate-400 italic text-center mt-4 break-inside-avoid page-break-inside-avoid avoid-break" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    * Este orçamento é baseado nas informações fornecidas inicialmente e pode sofrer alterações após visita técnica in loco.
                  </div>
                </div>
              ) : step.label === 'Contrato de Trabalho' ? (
                <div className="space-y-8 leading-relaxed text-slate-900 w-full" style={{ boxSizing: 'border-box' }}>

                  {/* PREÂMBULO */}
                  <div className="text-justify text-[11pt]">
                    <p className="indent-8 mb-4">
                      <strong className="uppercase">Contratante:</strong> {client.name.toUpperCase()}, portador do CPF/CNPJ {client.cpf_cnpj}, residente e domiciliado em {typeof client.address === 'string' ? client.address.toUpperCase() : `${client.address?.street || ''}, nº ${client.address?.number || 'S/N'}, ${client.address?.city || ''}`.toUpperCase()}.
                    </p>
                    <p className="indent-8">
                      <strong className="uppercase">Contratado:</strong> {professional.name.toUpperCase()}, Engenheiro portador do CREA {professional.crea} e CPF {professional.cpf}, com endereço profissional em {professional.address.toUpperCase()}.
                    </p>
                  </div>

                  {/* CLÁUSULAS */}
                  <div className="space-y-6 text-justify text-[11pt]">
                    <div className="space-y-2">
                      <h3 className="text-[11pt] font-bold uppercase text-slate-900 border-b border-slate-900 pb-1 mb-3">
                        Cláusula Primeira – Do Objeto
                      </h3>
                      <p className="indent-8">
                        O presente instrumento tem como objeto a prestação de serviços técnicos de engenharia de agrimensura, especificamente o <strong className="uppercase">Georreferenciamento</strong> do imóvel rural denominado <strong>"{property.name.toUpperCase()}"</strong>, com área aproximada de <strong>{property.area_ha} hectares</strong>, registrado sob a matrícula <strong>{property.registration_number}</strong> do {selectedRegistry?.name || 'CRI competente'}.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-[11pt] font-bold uppercase text-slate-900 border-b border-slate-900 pb-1 mb-3">
                        Cláusula Segunda – Das Etapas do Serviço
                      </h3>
                      <p className="indent-8">O trabalho será desenvolvido seguindo rigorosamente as Normas Técnicas do INCRA e legislação vigente, compreendendo as seguintes etapas:</p>
                      <ul className="list-disc pl-12 space-y-1 mt-2">
                        <li>Levantamento planimétrico com tecnologia GNSS;</li>
                        <li>Processamento e ajustamento de dados;</li>
                        <li>Elaboração de plantas e memoriais descritivos;</li>
                        <li>Certificação junto ao SIGEF/INCRA.</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-[11pt] font-bold uppercase text-slate-900 border-b border-slate-900 pb-1 mb-3">
                        Cláusula Terceira – Dos Honorários e Pagamento
                      </h3>
                      <p className="indent-8">
                        Pelos serviços descritos na Cláusula Primeira, o <strong className="uppercase">Contratante</strong> pagará ao <strong className="uppercase">Contratado</strong> a importância total de:
                      </p>
                      <p className="text-center font-bold text-[12pt] my-6">
                        R$ {totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({numeroPorExtenso(totalFinal)})
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-[11pt] font-bold uppercase text-slate-900 border-b border-slate-900 pb-1 mb-3">
                        Cláusula Quarta – Dos Prazos
                      </h3>
                      <p className="indent-8">
                        O prazo estimado para conclusão dos trabalhos de campo e escritório é de <strong>60 (sessenta) dias</strong>, contados a partir da data de assinatura deste contrato e da confirmação de acesso ao imóvel, ressalvados atrasos decorrentes de condições climáticas adversas, impedimentos de acesso ou morosidade de órgãos públicos.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-[11pt] font-bold uppercase text-slate-900 border-b border-slate-900 pb-1 mb-3">
                        Cláusula Quinta – Do Foro
                      </h3>
                      <p className="indent-8">
                        Fica eleito o foro da comarca de <strong>{selectedRegistry?.municipality || 'Situação do Imóvel'} - GO</strong> para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
                      </p>
                    </div>
                  </div>

                  <div className="mt-12 text-justify text-[11pt] break-inside-avoid">
                    <p className="indent-8">E por estarem assim justos e contratados, assinam o presente instrumento em 02 (duas) vias de igual teor e forma, na presença de duas testemunhas.</p>
                  </div>

                  <div className="mt-8 text-right text-[11pt] break-inside-avoid">
                    <p>{selectedRegistry?.municipality} - GO, {today}.</p>
                  </div>

                </div>
              ) : step.label === 'Ordem de Serviço' ? (
                <div className="space-y-6 leading-relaxed text-slate-900 w-full" style={{ boxSizing: 'border-box' }}>

                  {/* IDENTIFICAÇÃO DO CLIENTE E IMÓVEL */}
                  <div className="border border-slate-900 divide-y divide-slate-900 text-[10pt]">
                    <div className="grid grid-cols-1 divide-y divide-slate-900">
                      <div className="bg-slate-100 p-2 font-bold uppercase text-center border-b border-slate-900">Identificação do Cliente</div>
                      <div className="p-3 grid grid-cols-[auto_1fr] gap-4">
                        <span className="font-bold uppercase">Nome/Razão Social:</span> <span className="uppercase">{client.name}</span>
                        <span className="font-bold uppercase">CPF/CNPJ:</span> <span>{client.cpf_cnpj}</span>
                        <span className="font-bold uppercase">Endereço:</span> <span className="uppercase">{typeof client.address === 'string' ? client.address : `${client.address?.street || ''}, ${client.address?.number || 'S/N'}, ${client.address?.city || ''}`}</span>
                        <div className="grid grid-cols-2 gap-4 col-span-2">
                          <div><span className="font-bold uppercase">Telefone:</span> {client.phone}</div>
                          <div><span className="font-bold uppercase">E-mail:</span> {client.email}</div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 divide-y divide-slate-900">
                      <div className="bg-slate-100 p-2 font-bold uppercase text-center border-b border-slate-900">Dados do Imóvel Rural</div>
                      <div className="p-3 grid grid-cols-2 gap-4">
                        <div className="col-span-2"><span className="font-bold uppercase">Denominação:</span> <span className="uppercase">{property.name}</span></div>
                        <div><span className="font-bold uppercase">Município/UF:</span> <span className="uppercase">{property.municipality} - GO</span></div>
                        <div><span className="font-bold uppercase">Matrícula:</span> {property.registration_number}</div>
                        <div><span className="font-bold uppercase">Área Aproximada:</span> {property.area_ha} ha</div>
                        <div><span className="font-bold uppercase">Cartório:</span> {selectedRegistry?.name || 'CRI Local'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-900 text-[10pt] break-inside-avoid">
                    <div className="bg-slate-100 p-2 font-bold uppercase text-center border-b border-slate-900">Descrição dos Serviços</div>
                    <div className="p-4">
                      <p className="font-bold uppercase mb-2">{(service?.name || 'Georreferenciamento de Imóvel Rural').toUpperCase()}</p>
                      <ul className="list-disc pl-6 space-y-1">
                        {(service?.items && service.items.length > 0
                          ? service.items
                          : [
                            'Levantamento planimétrico perimétrico com tecnologia GNSS (GPS) de alta precisão;',
                            'Processamento, ajustamento e cálculos de dados geodésicos;',
                            'Elaboração de plantas topográficas e memoriais descritivos conforme Normas do INCRA;',
                            'Certificação do imóvel junto ao SIGEF (Sistema de Gestão Fundiária);',
                            'Entrega de peças técnicas (Mapas e Memoriais) impressas e digitais.'
                          ]
                        ).map((desc, idx) => (
                          <li key={idx}>{desc}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* RESPONSÁVEIS TÉCNICOS */}
                  <div className="border border-slate-900 text-[10pt] break-inside-avoid">
                    <div className="bg-slate-100 p-2 font-black uppercase text-center border-b border-slate-900">Responsável Técnico</div>
                    <div className="p-3 grid grid-cols-2 gap-4">
                      <div className="col-span-2"><span className="font-bold uppercase">Nome Profissional:</span> <span className="uppercase">{professional.name}</span></div>
                      <div><span className="font-bold uppercase">CREA/Visto:</span> {professional.crea}</div>
                      <div><span className="font-bold uppercase">ART nº:</span> {selectedCertification?.art_number || project.art_number || '__________________________'}</div>
                    </div>
                  </div>

                  {/* PRAZOS */}
                  <div className="border border-slate-900 text-[10pt] break-inside-avoid">
                    <div className="bg-slate-100 p-2 font-black uppercase text-center border-b border-slate-900">Prazos e Vigência</div>
                    <div className="p-3 grid grid-cols-2 gap-4">
                      <div><span className="font-bold uppercase">Data de Início:</span> Imediato (após assinatura)</div>
                      <div><span className="font-bold uppercase">Previsão de Término:</span> 60 (sessenta) dias</div>
                    </div>
                  </div>

                  {/* CONDIÇÕES GERAIS */}
                  <div className="border border-slate-900 text-[10pt] break-inside-avoid">
                    <div className="bg-slate-100 p-2 font-black uppercase text-center border-b border-slate-900">Condições Gerais e Observações</div>
                    <div className="p-3 text-justify space-y-2">
                      <p>1. O serviço será executado em conformidade com a Lei 10.267/01 e Norma Técnica para Georreferenciamento de Imóveis Rurais (3ª Ed. INCRA).</p>
                      <p>2. O CONTRATANTE compromete-se a fornecer livre acesso à propriedade e disponibilizar a documentação necessária (Matrículas, CCIR, ITR, CPF/RG).</p>
                      <p>3. A responsabilidade técnica limita-se à exatidão das medidas e conformidade legal do trabalho topográfico.</p>
                    </div>
                  </div>

                  <div className="mt-8 text-right text-[10pt]">
                    <p>{selectedRegistry?.municipality} - GO, {today}.</p>
                  </div>

                </div>
              ) : (step.label === 'Laudo Técnico' || step.label === 'Laudo de Georreferenciamento') ? (
                <div className="space-y-2 leading-tight text-slate-900 w-full" style={{ boxSizing: 'border-box' }}>

                  {/* 1. IDENTIFICAÇÃO DO PROFISSIONAL */}
                  <div className="border border-slate-900 page-break-inside-avoid avoid-break" style={{ pageBreakInside: 'avoid' }}>
                    <div className="bg-slate-100 p-1.5 font-bold uppercase border-b border-slate-900 text-[10pt]">1. Identificação do Profissional Responsável</div>
                    <div className="p-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[10pt]">
                      <span className="font-bold">Nome:</span> <span>{professional.name}</span>
                      <div className="col-span-2 grid grid-cols-2 gap-4">
                        <div><span className="font-bold">CREA:</span> {professional.crea}</div>
                        <div><span className="font-bold">CPF:</span> {professional.cpf}</div>
                      </div>
                      <span className="font-bold">Endereço:</span> <span>{professional.address}</span>
                      <div className="col-span-2 grid grid-cols-2 gap-4">
                        <div><span className="font-bold">Telefone:</span> {professional.phone}</div>
                        <div><span className="font-bold">E-mail:</span> {professional.email}</div>
                      </div>
                    </div>
                  </div>

                  {/* 2. IDENTIFICAÇÃO DO IMÓVEL */}
                  <div className="border border-slate-900 break-inside-avoid page-break-inside-avoid avoid-break" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <div className="bg-slate-100 p-1.5 font-bold uppercase border-b border-slate-900 text-[10pt]">2. Identificação do Imóvel</div>
                    <div className="p-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[10pt]">
                      <span className="font-bold">Propriedade:</span> <span>{property.name}</span>
                      <span className="font-bold">Área Total(ha):</span> <span>{property.area_ha}</span>
                      <span className="font-bold">Município:</span> <span>{property.municipality}</span>
                      <span className="font-bold">Nº Matrícula:</span> <span>{property.registration_number}</span>
                      <div className="col-span-2 grid grid-cols-2 gap-4">
                        <div><span className="font-bold">CRI:</span> {selectedRegistry?.name || 'CRI Local'}</div>
                        <div><span className="font-bold">Comarca:</span> {property.comarca || property.municipality}</div>
                      </div>
                      <span className="font-bold">Cód. Incra:</span> <span>{property.incra_code || '---'}</span>
                    </div>
                  </div>

                  {/* 3. IDENTIFICAÇÃO DO PROPRIETÁRIO */}
                  <div className="border border-slate-900 break-inside-avoid page-break-inside-avoid avoid-break" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <div className="bg-slate-100 p-1.5 font-bold uppercase border-b border-slate-900 text-[10pt]">3. Identificação do Proprietário</div>
                    <div className="p-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[10pt]">
                      <span className="font-bold">Nome:</span> <span>{client.name}</span>
                      <span className="font-bold">CPF:</span> <span>{client.cpf_cnpj}</span>
                      <span className="font-bold">Endereço:</span> <span>{typeof client.address === 'string' ? client.address : `${client.address?.street || ''}, ${client.address?.number || 'S/N'}, ${client.address?.city || ''}`}</span>
                    </div>
                  </div>

                  {/* 4. DECLARAÇÃO TÉCNICA */}
                  <div className="border border-slate-900 break-inside-avoid page-break-inside-avoid avoid-break" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <div className="bg-slate-100 p-1.5 font-bold uppercase border-b border-slate-900 text-[10pt]">4. Declaração Técnica</div>
                    <div className="p-2 text-justify text-[9pt] space-y-1">
                      <p className="indent-6">
                        Declaro, na qualidade de profissional legalmente habilitado, que realizei os serviços técnicos de levantamento planialtimétrico georreferenciado do perímetro do imóvel rural acima descrito, obedecendo aos preceitos da legislação vigente, especialmente a Lei nº 10.267/2001, o Decreto nº 4.449/2002 e a Norma Técnica do INCRA.
                      </p>
                      <p className="indent-6">
                        O levantamento foi executado com equipamentos GNSS, pelo método de Posicionamento por Ponto Preciso em tempo Real (RT-PPP), de precisão compatível com os padrões exigidos, e os vértices foram definidos conforme a Norma Técnica para Georreferenciamento de Imóveis Rurais. O imóvel encontra-se certificado junto ao SIGEF/INCRA, sob o número: <strong>{selectedCertification?.cert_number || project.certification_number || '____________'}</strong>, emitida em <strong>{formatDate(selectedCertification?.cert_date || project.certification_date) || '___/___/____'}</strong>.
                      </p>
                      <p>Sob as penas da lei, declaro que:</p>
                      <ol className="list-decimal pl-10 space-y-0.5">
                        <li>Não houve alteração de divisas reais e efetivas do imóvel registrado;</li>
                        <li>Não houve alteração de medidas perimetrais, nem invasão de propriedades confinantes;</li>
                        <li>Todos os envolvidos estão cientes de que, não sendo verdadeiros os fatos constantes do memorial descritivo e planta, responderão pelos prejuízos causados, independentemente das sanções penais e disciplinares cabíveis.</li>
                      </ol>
                    </div>
                  </div>

                  {/* 5. CONFRONTAÇÕES E LIMITES */}
                  <div className="border border-slate-900 break-inside-avoid page-break-inside-avoid avoid-break" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <div className="bg-slate-100 p-1.5 font-bold uppercase border-b border-slate-900 text-[10pt]">5. Confrontações e Limites</div>
                    <div className="p-2 text-justify text-[9pt]">
                      <p className="indent-6">
                        Os limites do imóvel foram identificados em campo com a presença e ciência dos confrontantes, e estão representados na planta e no memorial descritivo georreferenciados, os quais acompanham este laudo.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 mb-8 text-right text-[9pt]">
                    <p>{property.municipality}, {today}</p>
                  </div>

                  {/* ASSINATURA PROFISSIONAL */}
                  <div className="mt-4 flex flex-col items-center text-center break-inside-avoid page-break-inside-avoid avoid-break" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <div className="w-80 border-t border-slate-900 mb-1"></div>
                    <p className="font-black uppercase text-[9pt]">{professional.name}</p>
                    <p className="text-[8pt] leading-tight">Engenheiro Agrônomo</p>
                    <div className="text-[8pt] mt-1 space-y-0.5">
                      <p>CREA: {professional.crea} | CPF: {professional.cpf}</p>
                      <p>ART Nº {selectedCertification?.art_number || project.art_number || '________________'}</p>
                      <p>Cód. Credenciado: {professional.incra_code || '___'}</p>
                    </div>
                  </div>

                </div>
              ) : step.label === 'RECIBO' ? (
                <div className="space-y-8 leading-relaxed text-slate-900" style={{ paddingLeft: '20mm', paddingRight: '20mm', paddingBottom: '10mm', boxSizing: 'border-box' }}>

                  {/* TÍTULO DO RECIBO */}
                  <div className="text-center mb-12">
                    <h2 className="text-2xl font-black uppercase tracking-wider text-slate-900">RECIBO</h2>
                    <div className="w-32 h-0.5 bg-slate-900 mx-auto mt-4"></div>
                  </div>

                  {/* CONTEÚDO DO RECIBO */}
                  <div className="text-justify text-[12pt] leading-relaxed space-y-6">
                    <p className="indent-8">
                      {isCarService ? (
                        <>Recebemos de <strong className="uppercase">{client.name}</strong>, a importância de <strong>R$ {totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({numeroPorExtenso(totalFinal)})</strong>, referente à quitação dos serviços de CAR do imóvel <strong className="uppercase">{property.name}</strong>.</>
                      ) : (
                        <>Recebi de <strong className="uppercase">{client.name}</strong>, CPF/CNPJ <strong>{client.cpf_cnpj}</strong>, a importância de <strong>R$ {totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, (<strong>{numeroPorExtenso(totalFinal)}</strong>), referente à prestação de serviços técnicos de georreferenciamento do imóvel rural denominado <strong className="uppercase">{property.name}</strong>, situado no município de <strong>{property.municipality}/{property.uf || 'GO'}</strong>.</>
                      )}
                    </p>

                    <div className="mt-8 overflow-hidden border border-slate-200 rounded-xl">
                      <table className="w-full text-[10pt] border-collapse bg-white">
                        <tbody className="divide-y divide-slate-100">
                          <tr className="bg-slate-50/50">
                            <td className="px-6 py-3 font-bold text-slate-600 w-1/3 border-r border-slate-100 uppercase tracking-tight">Cliente / CPF:</td>
                            <td className="px-6 py-3 font-black text-slate-900 uppercase">{client.name} - {client.cpf_cnpj}</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-3 font-bold text-slate-600 border-r border-slate-100 uppercase tracking-tight">Imóvel:</td>
                            <td className="px-6 py-3 font-black text-slate-900 uppercase">{property.name}</td>
                          </tr>
                          <tr className="bg-slate-50/50">
                            <td className="px-6 py-3 font-bold text-slate-600 border-r border-slate-100 uppercase tracking-tight">Área:</td>
                            <td className="px-6 py-3 font-black text-slate-900">{property.area_ha} ha</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-3 font-bold text-slate-600 border-r border-slate-100 uppercase tracking-tight">Matrícula:</td>
                            <td className="px-6 py-3 font-black text-slate-900">{property.registration_number}</td>
                          </tr>
                          <tr className="bg-slate-50/50">
                            <td className="px-6 py-3 font-bold text-slate-600 border-r border-slate-100 uppercase tracking-tight">Município:</td>
                            <td className="px-6 py-3 font-black text-slate-900">{property.municipality} - GO</td>
                          </tr>
                          {project.certification_number && (
                            <tr>
                              <td className="px-6 py-3 font-bold text-slate-600 border-r border-slate-100 uppercase tracking-tight">Certificação (SIGEF):</td>
                              <td className="px-6 py-3 font-black text-slate-900">{project.certification_number}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* DATA E ASSINATURA */}
                  <div className="mt-16 text-right">
                    <p className="text-[11pt] font-medium text-slate-700">{selectedRegistry?.municipality || property.municipality} - GO, {today}.</p>
                  </div>

                  {/* ASSINATURAS */}
                  <div className="mt-48 flex justify-center text-center">
                    <div className="flex flex-col items-center w-80">
                      <div className="w-full border-t border-slate-900 mb-2"></div>
                      <p className="text-[9pt] font-black uppercase text-slate-900">{professional.name}</p>
                      <p className="text-[7pt] text-slate-500 font-bold uppercase tracking-widest">Responsável Técnico</p>
                      <p className="text-[7pt] text-slate-400 font-bold">CREA: {professional.crea} | CPF: {professional.cpf}</p>
                    </div>
                  </div>

                </div>
              ) : step.label === 'Requerimento para o Cartório' ? (
                <div className="flex-1 px-[10mm] py-[5mm]">
                  <div
                    className="whitespace-pre-wrap text-slate-900 text-[12pt] text-justify leading-relaxed border border-slate-900 p-[10mm] min-h-[200mm] flex flex-col"
                    style={{
                      boxSizing: 'border-box'
                    }}
                  >
                    <div className="text-center mb-10">
                      <h2 className="text-2xl font-black uppercase tracking-widest text-slate-900">REQUERIMENTO</h2>
                    </div>

                    <div className="flex-1">
                      {textContent}
                    </div>

                    <div className="mt-20 pt-8 flex justify-center text-center mb-10 break-inside-avoid">
                      <div className="flex flex-col items-center w-80">
                        <div className="w-full border-t border-slate-900 mb-1"></div>
                        <p className="text-[10pt] font-black uppercase text-slate-900 leading-tight">{client.name}</p>
                        <p className="text-[8pt] text-slate-500 font-bold uppercase tracking-widest">Proprietário do Imóvel</p>
                        <p className="text-[8pt] text-slate-400 font-bold">CPF/CNPJ: {client.cpf_cnpj}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : step.label === 'Capa do Processo' ? (
                <div className="space-y-8 leading-relaxed text-slate-900 w-full" style={{ boxSizing: 'border-box' }}>

                  <div className="text-center mb-12">
                    <h2 className="text-2xl font-black uppercase tracking-widest text-slate-900 border-b-4 border-primary inline-block px-8 py-2">
                      DOCUMENTAÇÃO (CHECKLIST)
                    </h2>
                  </div>

                  {/* IDENTIFICAÇÃO */}
                  <div className="grid grid-cols-1 gap-6 mb-10">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 pb-1">Interessado</h3>
                      <p className="text-lg font-bold text-slate-900 uppercase">{client.name}</p>
                      <p className="text-sm text-slate-600">CPF/CNPJ: {client.cpf_cnpj}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 pb-1">Imóvel Rural</h3>
                        <p className="text-sm font-bold text-slate-900 uppercase">{property.name}</p>
                        <p className="text-xs text-slate-600">Matrícula: {property.registration_number}</p>
                        <p className="text-xs text-slate-600">{property.municipality} - GO</p>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 pb-1">Responsável Técnico</h3>
                        <p className="text-sm font-bold text-slate-900 uppercase">{professional.name}</p>
                        <p className="text-xs text-slate-600">CREA: {professional.crea}</p>
                        <p className="text-xs text-slate-600">ART: {selectedCertification?.art_number || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* CHECKLIST */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="text-primary" size={24} />
                      <h3 className="text-lg font-bold uppercase text-slate-900">Documentos Apresentados</h3>
                    </div>

                    <div className="space-y-3">
                      {(() => {
                        try {
                          const checklistState = step.notes ? JSON.parse(step.notes) : {};
                          const registry = allRegistries?.find(r => r.id === project?.registry_id);
                          const registryCns = registry?.cns;
                          const isCarGo = service?.name === 'CAR - Cadastro ambiental Rural - SIGCAR GO';

                          let items = CHECKLIST_RIO_VERDE;
                          if (isCarGo) {
                            items = CHECKLIST_CAR_GO;
                          } else if (registryCns === RIO_VERDE_2_CNS) {
                            items = CHECKLIST_RIO_VERDE_2;
                          } else if (registryCns === RIO_VERDE_CNS) {
                            items = CHECKLIST_RIO_VERDE;
                          }
                          return items.map(item => (
                            <div key={item.id} className="flex items-start gap-3 p-3 border-b border-slate-100 last:border-0">
                              <div className={`w-5 h-5 border-2 rounded flex items-center justify-center shrink-0 mt-0.5 ${checklistState[item.id] ? 'bg-primary border-primary text-white' : 'border-slate-300'}`}>
                                {checklistState[item.id] && <CheckCircle2 size={14} />}
                              </div>
                              <p className={`text-sm leading-relaxed ${checklistState[item.id] ? 'font-bold text-slate-900' : 'text-slate-400'}`}>
                                {item.label}
                              </p>
                            </div>
                          ));
                        } catch {
                          return <p className="text-rose-500">Erro ao carregar lista de documentos.</p>;
                        }
                      })()}
                    </div>
                  </div>

                  {/* OBSERVAÇÃO */}
                  <div className="mt-12 p-4 bg-slate-100 rounded-xl text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Protocolo para {selectedRegistry?.name || 'Registro de Imóveis'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {selectedRegistry?.municipality || 'Local'} - GO, {today}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-slate-800 text-[10pt] text-justify leading-relaxed">
                  {textContent}
                </div>
              )}

              {/* ASSINATURAS GLOBAIS */}
              {step.label !== 'RECIBO' && step.label !== 'Requerimento para o Cartório' && (
                <div className="mt-10 pt-8 grid grid-cols-2 gap-16 text-center mb-10 break-inside-avoid page-break-inside-avoid">
                  <div className="flex flex-col items-center">
                    <div className="w-full border-t border-slate-900 mb-1"></div>
                    <p className="text-[8pt] font-black uppercase text-slate-900 leading-tight">{professional.name}</p>
                    <p className="text-[6pt] text-slate-500 font-bold uppercase tracking-widest">Responsável Técnico</p>
                    <p className="text-[6pt] text-slate-400 font-bold">CREA: {professional.crea}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-full border-t border-slate-900 mb-1"></div>
                    <p className="text-[8pt] font-black uppercase text-slate-900 leading-tight">{client.name}</p>
                    <p className="text-[6pt] text-slate-500 font-bold uppercase tracking-widest">Contratante / Proprietário</p>
                    <p className="text-[6pt] text-slate-400 font-bold">CPF/CNPJ: {client.cpf_cnpj}</p>
                  </div>
                </div>
              )}


              {/* FOOTER INSTITUCIONAL */}
              <div className="w-full py-6 border-t border-slate-200 mt-auto grid grid-cols-3 items-center text-[7pt] text-slate-400 font-bold" style={{ boxSizing: 'border-box' }}>
                <div className="text-left">
                  <p>Página 1</p>
                </div>
                <div className="text-center uppercase tracking-tighter">
                  <p>Impresso por: <span className="text-slate-500">{userName || 'Administrador'}</span></p>
                </div>
                <div className="text-right uppercase tracking-widest">
                  {/* Espaço em branco conforme solicitado */}
                </div>
              </div>

            </div>
          </div>

          {/* PAINEL LATERAL DE EDIÇÃO DE VALORES (Apenas visual) */}
          <div className="hidden lg:flex w-80 bg-white border-l border-slate-200 p-6 flex-col space-y-6 overflow-y-auto shrink-0 shadow-inner">
            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                <ShieldCheck size={14} className="text-primary-light" /> Composição Financeira
              </h4>
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1.5">{item.description}</p>
                    <p className="text-xs font-black text-slate-700">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
              <div className="p-5 bg-primary rounded-2xl text-white shadow-xl shadow-primary/10">
                <p className="text-[9px] font-black uppercase tracking-widest opacity-80">Valor Total Contratado</p>
                <h3 className="text-xl font-black mt-1 leading-none">R$ {totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-[8px] font-medium leading-tight opacity-90 italic">
                    *Valor sujeito a ajustes conforme alterações na área do levantamento.
                  </p>
                </div>
              </div>
            </section>

            <section className="pt-6 border-t border-slate-100 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} className="text-primary-light" /> Configurações do Documento
              </h4>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Data do Documento</label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Número do Documento</label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Ex: 0001/2024"
                />
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-[10px] font-black text-amber-800 uppercase mb-1">Atenção</p>
                <p className="text-[9px] text-amber-700 font-medium leading-relaxed">
                  Ao salvar o PDF, o documento será gerado com as informações atuais do banco de dados e do cálculo acima.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
