import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const GREEN = '#16a34a';
const DARK = '#0f172a';
const GRAY = '#64748b';
const BORDER = '#cbd5e1';
const LIGHT = '#f8fafc';

const styles = StyleSheet.create({
  page: { paddingTop: 20, paddingBottom: 24, paddingHorizontal: 24, fontFamily: 'Helvetica', fontSize: 8, backgroundColor: '#fff' },
  accentBar: { height: 4, backgroundColor: GREEN, marginBottom: 10, borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  companyName: { fontSize: 13, fontWeight: 'bold', color: DARK, marginBottom: 2 },
  companySub: { fontSize: 7, color: GREEN, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.8 },
  companyInfo: { fontSize: 6.5, color: GRAY, marginTop: 2 },
  docTitle: { fontSize: 11, fontWeight: 'bold', color: DARK, textAlign: 'right', marginBottom: 2 },
  docSub: { fontSize: 7, color: GRAY, textAlign: 'right' },
  badge: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginTop: 3, alignSelf: 'flex-end' },
  badgeText: { fontSize: 6.5, fontWeight: 'bold', color: GREEN, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 7.5, fontWeight: 'bold', color: DARK, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 8, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: BORDER },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  infoItem: { backgroundColor: LIGHT, borderWidth: 1, borderColor: BORDER, borderRadius: 3, padding: 4, minWidth: '30%', flex: 1 },
  infoLabel: { fontSize: 6, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 1 },
  infoValue: { fontSize: 7.5, color: DARK, fontWeight: 'bold' },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 3, marginBottom: 6 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: DARK },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER },
  tableRowAlt: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: LIGHT },
  thCell: { padding: '3 4', flex: 1 },
  tdCell: { padding: '3 4', flex: 1, borderRightWidth: 1, borderRightColor: BORDER },
  thText: { fontSize: 6.5, fontWeight: 'bold', color: '#fff', textTransform: 'uppercase' },
  tdText: { fontSize: 7, color: '#334155' },
  summaryRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 6 },
  summaryCard: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, alignItems: 'flex-end' },
  summaryLabel: { fontSize: 6, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  summaryValue: { fontSize: 10, fontWeight: 'bold' },
  declarationBox: { marginTop: 8, padding: 8, borderWidth: 1, borderColor: BORDER, borderRadius: 3, backgroundColor: LIGHT },
  declarationText: { fontSize: 7, color: '#475569', lineHeight: 1.6, textAlign: 'justify' },
  signaturesGrid: { flexDirection: 'row', gap: 16, marginTop: 12 },
  sigBox: { flex: 1, borderTopWidth: 1, borderTopColor: DARK, paddingTop: 4 },
  sigLabel: { fontSize: 6.5, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.3 },
  sigName: { fontSize: 7.5, fontWeight: 'bold', color: DARK, marginTop: 1 },
  sigSub: { fontSize: 6.5, color: GRAY },
  footer: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 5.5, color: '#94a3b8' },
  footerBrand: { fontSize: 5.5, color: GREEN, fontWeight: 'bold' },
});

const fmt = (v: number, dec = 4) => v.toFixed(dec).replace('.', ',');
const fmtDist = (v: number) => v.toFixed(2).replace('.', ',');

interface SegmentInfo {
  fromName: string;
  toName: string;
  azimuth: string;
  distance: number;
  confrontante: string;
  situation: string;
}

interface VertexInfo {
  name: string;
  e: number;
  n: number;
  h: number;
}

interface ConfrontacaoPDFProps {
  propertyName: string;
  ownerName: string;
  municipality: string;
  uf: string;
  incraCode: string;
  sigefCode: string;
  datum: string;
  zone: string;
  areaHa: number;
  perimeter: number;
  vertices: VertexInfo[];
  segments: SegmentInfo[];
  technicianName: string;
  technicianCrea: string;
  date: string;
}

const ConfrontacaoPDF: React.FC<ConfrontacaoPDFProps> = ({
  propertyName, ownerName, municipality, uf, incraCode, sigefCode,
  datum, zone, areaHa, perimeter, vertices, segments,
  technicianName, technicianCrea, date,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.accentBar} />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <View>
          <Text style={styles.companyName}>Metrica Agro</Text>
          <Text style={styles.companySub}>Serviços Agronômicos e Geomensura</Text>
          <Text style={styles.companyInfo}>CNPJ: 22.827.795/0001-49  |  metrica.agro@gmail.com  |  (64) 99994-0677</Text>
        </View>
        <View>
          <Text style={styles.docTitle}>Memorial Descritivo de Confrontação</Text>
          <Text style={styles.docSub}>Georreferenciamento de Imóvel Rural — INCRA/SIGEF</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>Georreferenciamento</Text></View>
        </View>
      </View>

      {/* Identificação */}
      <Text style={styles.sectionTitle}>1. Identificação do Imóvel</Text>
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}><Text style={styles.infoLabel}>Denominação</Text><Text style={styles.infoValue}>{propertyName || '—'}</Text></View>
        <View style={styles.infoItem}><Text style={styles.infoLabel}>Proprietário</Text><Text style={styles.infoValue}>{ownerName || '—'}</Text></View>
        <View style={styles.infoItem}><Text style={styles.infoLabel}>Município/UF</Text><Text style={styles.infoValue}>{municipality || '—'}/{uf || '—'}</Text></View>
        <View style={styles.infoItem}><Text style={styles.infoLabel}>Código INCRA/SNCR</Text><Text style={styles.infoValue}>{incraCode || '—'}</Text></View>
        <View style={styles.infoItem}><Text style={styles.infoLabel}>Certificação SIGEF</Text><Text style={styles.infoValue}>{sigefCode || '—'}</Text></View>
        <View style={styles.infoItem}><Text style={styles.infoLabel}>Datum / Zona UTM</Text><Text style={styles.infoValue}>{datum || 'SIRGAS 2000'} / {zone || '—'}</Text></View>
      </View>

      {/* Quadro de Vértices */}
      <Text style={styles.sectionTitle}>2. Quadro de Coordenadas dos Vértices</Text>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <View style={[styles.thCell, { flex: 0.6 }]}><Text style={styles.thText}>Vértice</Text></View>
          <View style={[styles.thCell, { flex: 1.2 }]}><Text style={styles.thText}>E (m)</Text></View>
          <View style={[styles.thCell, { flex: 1.2 }]}><Text style={styles.thText}>N (m)</Text></View>
          <View style={[styles.thCell, { flex: 0.8 }]}><Text style={styles.thText}>Alt. (m)</Text></View>
        </View>
        {vertices.map((v, i) => (
          <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <View style={[styles.tdCell, { flex: 0.6 }]}><Text style={[styles.tdText, { fontWeight: 'bold' }]}>{v.name}</Text></View>
            <View style={[styles.tdCell, { flex: 1.2 }]}><Text style={styles.tdText}>{fmt(v.e, 3)}</Text></View>
            <View style={[styles.tdCell, { flex: 1.2 }]}><Text style={styles.tdText}>{fmt(v.n, 3)}</Text></View>
            <View style={[styles.tdCell, { flex: 0.8 }]}><Text style={styles.tdText}>{fmt(v.h, 2)}</Text></View>
          </View>
        ))}
      </View>

      {/* Memorial Descritivo */}
      <Text style={styles.sectionTitle}>3. Memorial Descritivo — Confrontação</Text>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <View style={[styles.thCell, { flex: 0.5 }]}><Text style={styles.thText}>De</Text></View>
          <View style={[styles.thCell, { flex: 0.5 }]}><Text style={styles.thText}>Para</Text></View>
          <View style={[styles.thCell, { flex: 0.9 }]}><Text style={styles.thText}>Azimute</Text></View>
          <View style={[styles.thCell, { flex: 0.7 }]}><Text style={styles.thText}>Dist. (m)</Text></View>
          <View style={[styles.thCell, { flex: 1.8 }]}><Text style={styles.thText}>Confrontante</Text></View>
          <View style={[styles.thCell, { flex: 0.8 }]}><Text style={styles.thText}>Situação</Text></View>
        </View>
        {segments.map((seg, i) => (
          <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <View style={[styles.tdCell, { flex: 0.5 }]}><Text style={[styles.tdText, { fontWeight: 'bold' }]}>{seg.fromName}</Text></View>
            <View style={[styles.tdCell, { flex: 0.5 }]}><Text style={[styles.tdText, { fontWeight: 'bold' }]}>{seg.toName}</Text></View>
            <View style={[styles.tdCell, { flex: 0.9 }]}><Text style={styles.tdText}>{seg.azimuth}</Text></View>
            <View style={[styles.tdCell, { flex: 0.7 }]}><Text style={styles.tdText}>{fmtDist(seg.distance)}</Text></View>
            <View style={[styles.tdCell, { flex: 1.8 }]}><Text style={styles.tdText}>{seg.confrontante || '—'}</Text></View>
            <View style={[styles.tdCell, { flex: 0.8 }]}><Text style={styles.tdText}>{seg.situation || 'Linha'}</Text></View>
          </View>
        ))}
      </View>

      {/* Resumo */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#dcfce7' }]}>
          <Text style={[styles.summaryLabel, { color: GREEN }]}>Área Total</Text>
          <Text style={[styles.summaryValue, { color: GREEN }]}>{fmt(areaHa, 4)} ha</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#dbeafe' }]}>
          <Text style={[styles.summaryLabel, { color: '#1d4ed8' }]}>Perímetro</Text>
          <Text style={[styles.summaryValue, { color: '#1d4ed8' }]}>{fmtDist(perimeter)} m</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: LIGHT, borderWidth: 1, borderColor: BORDER }]}>
          <Text style={[styles.summaryLabel, { color: GRAY }]}>Vértices</Text>
          <Text style={[styles.summaryValue, { color: DARK }]}>{vertices.length}</Text>
        </View>
      </View>

      {/* Declaração */}
      <View style={styles.declarationBox}>
        <Text style={styles.declarationText}>
          Declaramos, para os devidos fins de direito, que os confrontantes do imóvel denominado "{propertyName}",
          situado no Município de {municipality}/{uf}, foram devidamente notificados da realização do levantamento
          topográfico para fins de Georreferenciamento, conforme exigido pelo INCRA e pela NBR 14166/1998.
          O presente memorial descritivo foi elaborado de acordo com as normas técnicas vigentes do Sistema
          Nacional de Georreferenciamento (SIGEF/INCRA), utilizando o datum {datum || 'SIRGAS 2000'}.
        </Text>
      </View>

      {/* Assinaturas */}
      <View style={styles.signaturesGrid}>
        <View style={styles.sigBox}>
          <Text style={styles.sigLabel}>Responsável Técnico</Text>
          <Text style={styles.sigName}>{technicianName || '________________________'}</Text>
          <Text style={styles.sigSub}>{technicianCrea ? `CREA: ${technicianCrea}` : 'CREA: ________________'}</Text>
          <Text style={styles.sigSub}>{date}</Text>
        </View>
        <View style={styles.sigBox}>
          <Text style={styles.sigLabel}>Proprietário / Representante Legal</Text>
          <Text style={styles.sigName}>{ownerName || '________________________'}</Text>
          <Text style={styles.sigSub}>CPF/CNPJ: ___________________________</Text>
          <Text style={styles.sigSub}>{date}</Text>
        </View>
        <View style={styles.sigBox}>
          <Text style={styles.sigLabel}>Testemunha</Text>
          <Text style={styles.sigName}>________________________</Text>
          <Text style={styles.sigSub}>CPF: ___________________________</Text>
          <Text style={styles.sigSub}>{date}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>* Coordenadas em {datum || 'SIRGAS 2000'}, Zona {zone || '—'}, em metros. Gerado automaticamente em {date}.</Text>
        <Text style={styles.footerBrand}>Metrica Agro — GeoFlow CAD</Text>
      </View>
    </Page>
  </Document>
);

export default ConfrontacaoPDF;
