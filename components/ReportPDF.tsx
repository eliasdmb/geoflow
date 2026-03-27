import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { FinancialTransaction, TransactionType } from '../types';

const GREEN = '#16a34a';
const GREEN_LIGHT = '#dcfce7';
const DARK = '#0f172a';
const GRAY = '#64748b';
const BORDER = '#e2e8f0';

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingLeft: 30,
    paddingRight: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
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
    width: 'auto',
    marginBottom: 10,
    borderStyle: 'solid',
    borderColor: BORDER,
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderRadius: 4,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '20%',
    borderStyle: 'solid',
    borderColor: BORDER,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: DARK,
  },
  tableColAlt: {
    width: '20%',
    borderStyle: 'solid',
    borderColor: BORDER,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f8fafc',
  },
  tableCol: {
    width: '20%',
    borderStyle: 'solid',
    borderColor: BORDER,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCellHeader: {
    margin: 6,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCell: {
    margin: 6,
    fontSize: 8,
    color: '#334155',
  },
  incomeValue: {
    margin: 6,
    fontSize: 8,
    color: '#16a34a',
    fontWeight: 'bold',
  },
  expenseValue: {
    margin: 6,
    fontSize: 8,
    color: '#dc2626',
    fontWeight: 'bold',
  },
  summarySection: {
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: BORDER,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  summaryCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'flex-end',
  },
  summaryLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: 'bold',
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

interface ReportPDFProps {
  reportData: FinancialTransaction[];
  startDate?: string;
  endDate?: string;
  reportType?: 'ALL' | TransactionType;
  reportCategory?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const ReportPDF: React.FC<ReportPDFProps> = ({ reportData, startDate, endDate, reportType, reportCategory }) => {
  const totalIncome = reportData
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = reportData
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const periodo = `${startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Início'} — ${endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Fim'}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
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
            <Text style={styles.docTitle}>Relatório Financeiro</Text>
            <Text style={styles.docSubtitle}>{periodo}</Text>
            {reportType && reportType !== 'ALL' && <Text style={styles.docSubtitle}>Tipo: {reportType}</Text>}
            {reportCategory && <Text style={styles.docSubtitle}>Categoria: {reportCategory}</Text>}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Financeiro</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Data</Text></View>
            <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Descrição</Text></View>
            <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Tipo</Text></View>
            <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Categoria</Text></View>
            <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Valor</Text></View>
          </View>
          {reportData.map((t, idx) => (
            <View style={[styles.tableRow, idx % 2 === 0 ? {} : { backgroundColor: '#f8fafc' }]} key={t.id}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{new Date(t.due_date).toLocaleDateString('pt-BR')}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{t.description}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{t.type}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{t.category}</Text></View>
              <View style={styles.tableCol}>
                <Text style={t.type === TransactionType.INCOME ? styles.incomeValue : styles.expenseValue}>
                  {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Resumo */}
        <View style={styles.summarySection}>
          <View style={[styles.summaryCard, { backgroundColor: '#dcfce7' }]}>
            <Text style={[styles.summaryLabel, { color: '#16a34a' }]}>Receitas</Text>
            <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{formatCurrency(totalIncome)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.summaryLabel, { color: '#dc2626' }]}>Despesas</Text>
            <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{formatCurrency(totalExpense)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: balance >= 0 ? '#dbeafe' : '#fee2e2' }]}>
            <Text style={[styles.summaryLabel, { color: balance >= 0 ? '#1d4ed8' : '#dc2626' }]}>Saldo</Text>
            <Text style={[styles.summaryValue, { color: balance >= 0 ? '#1d4ed8' : '#dc2626' }]}>{formatCurrency(balance)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>* Valores em Reais (BRL). Gerado automaticamente em {new Date().toLocaleDateString('pt-BR')}</Text>
          <Text style={styles.footerBrand}>Metrica Agro — GeoFlow</Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReportPDF;
