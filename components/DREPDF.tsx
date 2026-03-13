import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 8,
  },
  header: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subheader: {
    fontSize: 10,
    marginBottom: 15,
    textAlign: 'center',
    color: '#666',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  headerRow: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  totalRow: {
    backgroundColor: '#f9f9f9',
    fontWeight: 'bold',
  },
  finalRow: {
    backgroundColor: '#e3f2fd',
    fontWeight: 'bold',
  },
  tableColLabel: {
    width: '15%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#bfbfbf',
    padding: 4,
  },
  tableCol: {
    width: '6.5%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#bfbfbf',
    padding: 2,
    textAlign: 'right',
  },
  tableColTotal: {
    width: '7%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#bfbfbf',
    padding: 2,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  cellText: {
    fontSize: 7,
  },
  cellTextBold: {
    fontSize: 7,
    fontWeight: 'bold',
  },
  negative: {
    color: '#d32f2f',
  }
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
        <Text style={styles.header}>Demonstração do Resultado do Exercício (DRE)</Text>
        <Text style={styles.subheader}>Ano: {year} | Escopo: {scope === 'ALL' ? 'Todos' : scope}</Text>

        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.headerRow]}>
            <View style={styles.tableColLabel}><Text style={styles.cellTextBold}>Descrição</Text></View>
            {months.map(m => (
              <View key={m} style={styles.tableCol}><Text style={styles.cellTextBold}>{m}</Text></View>
            ))}
            <View style={styles.tableColTotal}><Text style={styles.cellTextBold}>Total</Text></View>
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

          <DRERowPDF label="(-) DESPESAS OPERACIONAIS" values={dreData.structure.operatingExpenses.map((v, i) => v + dreData.structure.personnel[i])} isNegative style={styles.headerRow} />
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

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 6, color: '#999' }}>* Valores em Reais (BRL). Gerado automaticamente em {new Date().toLocaleDateString('pt-BR')}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default DREPDF;
