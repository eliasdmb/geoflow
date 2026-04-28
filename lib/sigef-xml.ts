/* SIGEF XML generator for INCRA certification */

import { utmToLatLon, decimalToDMS } from './utm';

export interface SigefConfig {
  nomeImovel: string;
  municipio: string;
  uf: string;
  codigoIncra?: string;
  area: number;           // ha
  utmZone: string;        // e.g. "22S"
  datum: string;          // "SIRGAS2000"
  responsavel: string;
  creaArt: string;
  dataLevantamento: string; // ISO date YYYY-MM-DD
}

export interface SigefVertex {
  name: string;
  e: number;
  n: number;
  type: 'M' | 'V';
  confrontante?: string;
}

export interface SigefConfrontante {
  nome: string;
  tipo: 'propriedade' | 'via' | 'rio' | 'reserva' | 'outros';
  verticeInicio: string;
  verticeFim: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function pad(n: number, digits = 2): string {
  return String(n).padStart(digits, '0');
}

function isoNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function generateSigefXML(
  config: SigefConfig,
  vertices: SigefVertex[],
  confrontantes: SigefConfrontante[] = []
): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<SIGEF xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
  lines.push('       xsi:noNamespaceSchemaLocation="sigef-shapefile.xsd"');
  lines.push('       versao="1.0">');

  // Cabeçalho
  lines.push('  <Cabecalho>');
  lines.push(`    <NomeImovel>${escapeXml(config.nomeImovel)}</NomeImovel>`);
  lines.push(`    <CodigoImovel>${escapeXml(config.codigoIncra ?? '')}</CodigoImovel>`);
  lines.push(`    <Municipio>${escapeXml(config.municipio)}</Municipio>`);
  lines.push(`    <UF>${escapeXml(config.uf)}</UF>`);
  lines.push(`    <Area>${config.area.toFixed(4)}</Area>`);
  lines.push(`    <Datum>${escapeXml(config.datum)}</Datum>`);
  lines.push(`    <Projecao>UTM</Projecao>`);
  lines.push(`    <Fuso>${escapeXml(config.utmZone)}</Fuso>`);
  lines.push(`    <DataLevantamento>${config.dataLevantamento}</DataLevantamento>`);
  lines.push(`    <Responsavel>${escapeXml(config.responsavel)}</Responsavel>`);
  lines.push(`    <CreaArt>${escapeXml(config.creaArt)}</CreaArt>`);
  lines.push(`    <DataGeracao>${isoNow()}</DataGeracao>`);
  lines.push('  </Cabecalho>');

  // Vértices
  lines.push('  <Vertices>');
  vertices.forEach((v, i) => {
    const [lat, lon] = utmToLatLon(v.e, v.n, config.utmZone);
    lines.push(`    <Vertice codigo="${escapeXml(v.name)}" ordem="${i + 1}" tipo="${v.type}">`);
    lines.push(`      <Coordenada>`);
    lines.push(`        <E>${v.e.toFixed(3)}</E>`);
    lines.push(`        <N>${v.n.toFixed(3)}</N>`);
    lines.push(`        <Latitude>${lat.toFixed(8)}</Latitude>`);
    lines.push(`        <Longitude>${lon.toFixed(8)}</Longitude>`);
    lines.push(`        <LatitudeDMS>${decimalToDMS(lat, true)}</LatitudeDMS>`);
    lines.push(`        <LongitudeDMS>${decimalToDMS(lon, false)}</LongitudeDMS>`);
    lines.push(`      </Coordenada>`);
    if (v.confrontante) {
      lines.push(`      <Confrontante>${escapeXml(v.confrontante)}</Confrontante>`);
    }
    lines.push(`    </Vertice>`);
  });
  lines.push('  </Vertices>');

  // Confrontantes
  if (confrontantes.length > 0) {
    lines.push('  <Confrontantes>');
    confrontantes.forEach((c, i) => {
      lines.push(`    <Confrontante ordem="${i + 1}">`);
      lines.push(`      <Nome>${escapeXml(c.nome)}</Nome>`);
      lines.push(`      <Tipo>${escapeXml(c.tipo)}</Tipo>`);
      lines.push(`      <VerticeInicio>${escapeXml(c.verticeInicio)}</VerticeInicio>`);
      lines.push(`      <VerticeFim>${escapeXml(c.verticeFim)}</VerticeFim>`);
      lines.push(`    </Confrontante>`);
    });
    lines.push('  </Confrontantes>');
  }

  // Perímetro (segments with azimuth and distance)
  lines.push('  <Perimetro>');
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const dE = b.e - a.e;
    const dN = b.n - a.n;
    const dist = Math.sqrt(dE * dE + dN * dN);
    const azRad = Math.atan2(dE, dN);
    const azDeg = ((azRad * 180 / Math.PI) + 360) % 360;
    lines.push(`    <Segmento ordem="${i + 1}">`);
    lines.push(`      <VerticeA>${escapeXml(a.name)}</VerticeA>`);
    lines.push(`      <VerticeB>${escapeXml(b.name)}</VerticeB>`);
    lines.push(`      <Distancia>${dist.toFixed(3)}</Distancia>`);
    lines.push(`      <Azimute>${azDeg.toFixed(4)}</Azimute>`);
    lines.push(`    </Segmento>`);
  }
  lines.push('  </Perimetro>');

  lines.push('</SIGEF>');

  return lines.join('\n');
}

export function downloadSigefXML(filename: string, xml: string): void {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xml') ? filename : filename + '.xml';
  a.click();
  URL.revokeObjectURL(url);
}
