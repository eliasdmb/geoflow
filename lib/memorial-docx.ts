/* Memorial Descritivo DOCX generator using docx ^9.6.1 */

import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
  VerticalAlign, Header, Footer, PageNumber, NumberFormat,
} from 'docx';
import { utmToLatLon, decimalToDMS } from './utm';

export interface MemorialConfig {
  nomeImovel: string;
  municipio: string;
  uf: string;
  codigoIncra?: string;
  area: number;
  perimetro: number;
  utmZone: string;
  datum: string;
  responsavel: string;
  creaArt: string;
  dataLevantamento: string;
  confrontantes: { lado: string; nome: string }[];
}

export interface MemorialVertex {
  name: string;
  e: number;
  n: number;
  h?: number;
  type: 'M' | 'V';
  confrontante?: string;
}

function cell(text: string, bold = false, width?: number): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold, size: 18 })] })],
    verticalAlign: VerticalAlign.CENTER,
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
  });
}

function headerRow(labels: string[]): TableRow {
  return new TableRow({
    children: labels.map(l => cell(l, true)),
    tableHeader: true,
  });
}

export async function generateMemorialDOCX(config: MemorialConfig, vertices: MemorialVertex[]): Promise<Blob> {
  const titlePara = new Paragraph({
    text: 'MEMORIAL DESCRITIVO',
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
  });

  const subtitlePara = new Paragraph({
    children: [new TextRun({ text: config.nomeImovel.toUpperCase(), bold: true, size: 28 })],
    alignment: AlignmentType.CENTER,
  });

  // Identification table
  const identRows = [
    ['Imóvel Rural', config.nomeImovel],
    ['Código INCRA', config.codigoIncra ?? 'Não informado'],
    ['Município/UF', `${config.municipio}/${config.uf}`],
    ['Área (ha)', config.area.toFixed(4)],
    ['Perímetro (m)', config.perimetro.toFixed(2)],
    ['Datum', config.datum],
    ['Projeção', `UTM – Fuso ${config.utmZone}`],
    ['Data Levantamento', config.dataLevantamento],
    ['Responsável Técnico', config.responsavel],
    ['CREA/ART', config.creaArt],
  ];

  const identTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: identRows.map(([k, v]) => new TableRow({
      children: [cell(k, true, 35), cell(v, false, 65)],
    })),
  });

  // Confrontantes table
  const confrontantesRows = config.confrontantes.length > 0
    ? config.confrontantes.map(c => new TableRow({ children: [cell(c.lado, false, 30), cell(c.nome, false, 70)] }))
    : [new TableRow({ children: [cell('Não informado', false, 100)] })];

  const confrontantesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      headerRow(['Lado', 'Confrontante']),
      ...confrontantesRows,
    ],
  });

  // Vertices table
  const vertexRows = vertices.map((v, i) => {
    const [lat, lon] = utmToLatLon(v.e, v.n, config.utmZone);
    const next = vertices[(i + 1) % vertices.length];
    const dE = next.e - v.e;
    const dN = next.n - v.n;
    const d = Math.sqrt(dE * dE + dN * dN);
    const azRad = Math.atan2(dE, dN);
    const azDeg = ((azRad * 180 / Math.PI) + 360) % 360;
    const azMin = Math.floor((azDeg % 1) * 60);
    const azSec = ((azDeg % 1) * 60 % 1) * 60;
    const azStr = `${Math.floor(azDeg)}°${String(azMin).padStart(2, '0')}'${azSec.toFixed(0).padStart(2, '0')}"`;

    return new TableRow({
      children: [
        cell(v.name),
        cell(v.type),
        cell(v.e.toFixed(3)),
        cell(v.n.toFixed(3)),
        cell(decimalToDMS(lat, true)),
        cell(decimalToDMS(lon, false)),
        cell(d.toFixed(3)),
        cell(azStr),
        cell(v.confrontante ?? '—'),
      ],
    });
  });

  const vertexTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      headerRow(['Vértice', 'Tipo', 'E (m)', 'N (m)', 'Latitude', 'Longitude', 'Dist. (m)', 'Azimute', 'Confrontante']),
      ...vertexRows,
    ],
  });

  // Declaration section
  const declarationPara = new Paragraph({
    children: [
      new TextRun({
        text: `Declaro que as informações constantes neste Memorial Descritivo são verdadeiras e foram obtidas por levantamento topográfico georreferenciado ao Sistema Geodésico Brasileiro – ${config.datum}, conforme normas técnicas do INCRA.`,
        size: 20,
      }),
    ],
    spacing: { before: 200 },
  });

  const signaturePara = new Paragraph({
    children: [
      new TextRun({ text: `\n\n${config.municipio}/${config.uf}, ${config.dataLevantamento}`, size: 20 }),
    ],
    alignment: AlignmentType.RIGHT,
  });

  const responsavelPara = new Paragraph({
    children: [
      new TextRun({ text: `\n\n_________________________________\n${config.responsavel}\nCREA/ART: ${config.creaArt}`, size: 20 }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
  });

  const doc = new Document({
    sections: [{
      properties: {},
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ text: `Memorial Descritivo – ${config.nomeImovel}`, italics: true, size: 18 })],
            alignment: AlignmentType.RIGHT,
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: 'Página ', size: 18 }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
              new TextRun({ text: ' de ', size: 18 }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 }),
            ],
            alignment: AlignmentType.CENTER,
          })],
        }),
      },
      children: [
        titlePara,
        subtitlePara,
        new Paragraph({ text: '' }),
        new Paragraph({ text: '1. IDENTIFICAÇÃO DO IMÓVEL', heading: HeadingLevel.HEADING_2 }),
        identTable,
        new Paragraph({ text: '' }),
        new Paragraph({ text: '2. CONFRONTAÇÕES', heading: HeadingLevel.HEADING_2 }),
        confrontantesTable,
        new Paragraph({ text: '' }),
        new Paragraph({ text: '3. DESCRIÇÃO PERIMÉTRICA', heading: HeadingLevel.HEADING_2 }),
        vertexTable,
        new Paragraph({ text: '' }),
        new Paragraph({ text: '4. DECLARAÇÃO DO RESPONSÁVEL TÉCNICO', heading: HeadingLevel.HEADING_2 }),
        declarationPara,
        signaturePara,
        responsavelPara,
      ],
    }],
  });

  return Packer.toBlob(doc);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
