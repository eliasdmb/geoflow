import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const GREEN = '#16a34a';
const GREEN_LIGHT = '#dcfce7';
const DARK = '#0f172a';
const GRAY = '#64748b';
const BORDER = '#e2e8f0';

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingLeft: 24,
    paddingRight: 24,
    fontFamily: 'Helvetica',
    fontSize: 8,
    backgroundColor: '#ffffff',
  },
  accentBar: {
    height: 5,
    backgroundColor: GREEN,
    marginBottom: 14,
    borderRadius: 2,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
  },
  companyBlock: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DARK,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  companySub: {
    fontSize: 8,
    fontWeight: 'bold',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 7,
    color: GRAY,
  },
  docTitleBlock: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: DARK,
    textAlign: 'right',
    marginBottom: 3,
  },
  docSubtitle: {
    fontSize: 8,
    color: GRAY,
    textAlign: 'right',
    marginBottom: 2,
  },
  badge: {
    backgroundColor: GREEN_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: BORDER,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderRadius: 4,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  headerRow: {
    backgroundColor: DARK,
  },
  sectionRow: {
    backgroundColor: '#f1f5f9',
  },
  totalRow: {
    backgroundColor: GREEN_LIGHT,
  },
  finalRow: {
    backgroundColor: GREEN,
  },
  tableColLabel: {
    width: '15%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: BORDER,
    padding: 4,
  },
  tableCol: {
    width: '6.5%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: BORDER,
    padding: 3,
    textAlign: 'right',
  },
  tableColTotal: {
    width: '7%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: BORDER,
    padding: 3,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  cellText: {
    fontSize: 7,
    color: '#334155',
  },
  cellTextBold: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#334155',
  },
  cellTextHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cellTextFinal: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cellTextSection: {
    fontSize: 7,
    fontWeight: 'bold',
    color: DARK,
  },
  cellTextTotal: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#166534',
  },
  negative: {
    color: '#dc2626',
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 6,
    color: '#94a3b8',
  },
  footerBrand: {
    fontSize: 6,
    color: GREEN,
    fontWeight: 'bold',
  },
});

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

interface DREPDFProps {
  dreData: {
    structure: Record<string, number[]>;
    details: {
      revenue: Record<string, number[]>;
      operating: Record<string, number[]>;
    };
  };
  year: string;
  scope: string;
}

interface DRERowPDFProps {
  label: string;
  values: number[];
  style?: any;
  isNegative?: boolean;
  isSubItem?: boolean;
}

const DRERowPDF: React.FC<DRERowPDFProps> = ({ label, values, style = {} as any, isNegative = false, isSubItem = false }) => {
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <View style={[styles.tableRow, style]}>
      <View style={styles.tableColLabel}>
        <Text style={[styles.cellText, isSubItem ? { paddingLeft: 10, fontStyle: 'italic' } : {}]}>{label}</Text>
      </View>
      {values.map((v, i) => (
        <View key={i} style={styles.tableCol}>
          <Text style={[styles.cellText, isNegative && v !== 0 ? styles.negative : {}]}>
            {Math.abs(v) < 0.01 ? '-' : formatCurrency(v).replace('R$', '').trim()}
          </Text>
        </View>
      ))}
      <View style={styles.tableColTotal}>
        <Text style={[styles.cellTextBold, isNegative && total !== 0 ? styles.negative : {}]}>
          {Math.abs(total) < 0.01 ? '-' : formatCurrency(total).replace('R$', '').trim()}
        </Text>
      </View>
    </View>
  );
};

const DREPDF: React.FC<DREPDFProps> = ({ dreData, year, scope }) => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Barra de destaque verde */}
        <View style={styles.accentBar} />

        {/* Cabeçalho com dados da empresa */}
        <View style={styles.headerSection}>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>Metrica Agro</Text>
            <Text style={styles.companySub}>Serviços Agronômicos e Geomensura</Text>
            <Text style={styles.companyInfo}>CNPJ: 22.827.795/0001-49 | metrica.agro@gmail.com | (64) 99994-0677</Text>
          </View>
          <View style={styles.docTitleBlock}>
            <Text style={styles.docTitle}>DRE — Demonstração do Resultado</Text>
            <Text style={styles.docSubtitle}>Ano: {year} | Escopo: {scope === 'ALL' ? 'Todos' : scope}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Relatório Financeiro Anual</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.headerRow]}>
            <View style={styles.tableColLabel}><Text style={styles.cellTextHeader}>Descrição</Text></View>
            {months.map(m => (
              <View key={m} style={styles.tableCol}><Text style={styles.cellTextHeader}>{m}</Text></View>
            ))}
            <View style={styles.tableColTotal}><Text style={styles.cellTextHeader}>Total</Text></View>
          </View>

          {/* DRE Rows */}
          <DRERowPDF label="(+) RECEITA BRUTA" values={dreData.structure.revenueBruta} style={styles.headerRow} />
          {Object.entries(dreData.details.revenue).map(([cat, vals]) => (
            <DRERowPDF key={cat} label={cat} values={vals as number[]} isSubItem />
          ))}

          <DRERowPDF label="(-) DEDUÇÕES" values={dreData.structure.deductions} isNegative />

          <DRERowPDF 
            label="(=) RECEITA LÍQUIDA" 
            values={dreData.structure.revenueBruta.map((v, i) => v - dreData.structure.deductions[i])} 
            style={styles.totalRow} 
          />

          <DRERowPDF label="(-) CUSTOS DOS SERVIÇOS" values={dreData.structure.costs} isNegative />

          <DRERowPDF 
            label="(=) LUCRO BRUTO" 
            values={dreData.structure.revenueBruta.map((v, i) => v - dreData.structure.deductions[i] - dreData.structure.costs[i])} 
            style={styles.totalRow} 
          />

          <DRERowPDF label="(-) DESPESAS OPERACIONAIS" values={dreData.structure.operatingExpenses.map((v, i) => v + dreData.structure.personnel[i])} isNegative style={styles.sectionRow} />
          {Object.entries(dreData.details.operating).map(([cat, vals]) => (
            <DRERowPDF key={cat} label={cat} values={vals as number[]} isSubItem isNegative />
          ))}
          <DRERowPDF label="Despesas com Pessoal" values={dreData.structure.personnel} isSubItem isNegative />

          <DRERowPDF 
            label="(=) RESULTADO OPERACIONAL" 
            values={dreData.structure.revenueBruta.map((v, i) => 
               v - dreData.structure.deductions[i] - dreData.structure.costs[i] - dreData.structure.operatingExpenses[i] - dreData.structure.personnel[i]
            )} 
            style={styles.totalRow} 
          />

          <DRERowPDF label="(+/-) RESULTADO FINANCEIRO / OUTROS" values={dreData.structure.otherIncome.map((v, i) => v - dreData.structure.otherExpenses[i] - dreData.structure.financial[i])} />

          <DRERowPDF 
            label="(=) RESULTADO LÍQUIDO DO EXERCÍCIO" 
            values={dreData.structure.revenueBruta.map((v, i) => 
               v - dreData.structure.deductions[i] - dreData.structure.costs[i] - dreData.structure.operatingExpenses[i] - dreData.structure.personnel[i] + 
               dreData.structure.otherIncome[i] - dreData.structure.otherExpenses[i] - dreData.structure.financial[i]
            )} 
            style={styles.finalRow} 
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>* Valores em Reais (BRL). Gerado automaticamente em {new Date().toLocaleDateString('pt-BR')}</Text>
          <Text style={styles.footerBrand}>Metrica Agro — GeoFlow</Text>
        </View>
      </Page>
    </Document>
  );
};

export default DREPDF;
