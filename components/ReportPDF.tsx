import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { FinancialTransaction, TransactionType } from '../types';

// Register a font to support special characters if needed
// Font.register({ family: 'Open Sans', src: 'https://fonts.gstatic.com/s/opensans/v17/mem8YaGs126MiZpBA-UFVZ0e.ttf' });

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica', // Using a standard font for now
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  subheader: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    color: '#555',
  },
  table: {
    width: 'auto',
    marginBottom: 10,
    borderStyle: 'solid',
    borderColor: '#bfbfbf',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '20%',
    borderStyle: 'solid',
    borderColor: '#bfbfbf',
    borderBottomColor: '#000',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f0f0f0',
  },
  tableCol: {
    width: '20%',
    borderStyle: 'solid',
    borderColor: '#bfbfbf',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCellHeader: {
    margin: 5,
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableCell: {
    margin: 5,
    fontSize: 9,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#bfbfbf',
    paddingTop: 5,
  },
  totalText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 5,
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    width: '20%', // Align with the value column
    textAlign: 'right',
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Relatório Financeiro Personalizado</Text>
        <Text style={styles.subheader}>
          Período: {startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Início'} - {endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Fim'}
        </Text>
        {reportType !== 'ALL' && <Text style={styles.subheader}>Tipo: {reportType}</Text>}
        {reportCategory && <Text style={styles.subheader}>Categoria: {reportCategory}</Text>}

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Data</Text></View>
            <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Descrição</Text></View>
            <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Tipo</Text></View>
            <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Categoria</Text></View>
            <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Valor</Text></View>
          </View>
          {reportData.map((t) => (
            <View style={styles.tableRow} key={t.id}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{new Date(t.due_date).toLocaleDateString('pt-BR')}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{t.description}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{t.type}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{t.category}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>
                {t.type === TransactionType.INCOME ? '+' : t.type === TransactionType.EXPENSE ? '-' : '±'} {formatCurrency(t.amount)}
              </Text></View>
            </View>
          ))}
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>Total Receitas:</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalIncome)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>Total Despesas:</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalExpense)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>Saldo:</Text>
          <Text style={styles.totalValue}>{formatCurrency(balance)}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReportPDF;
