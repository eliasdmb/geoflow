/* DXF R12 ASCII exporter */

export interface DxfVertex { e: number; n: number; h?: number }

export interface DxfLayer {
  name: string;
  color: number;  // ACI color index
}

const LAYERS_DEFAULT: DxfLayer[] = [
  { name: 'PERIMETRO', color: 7 },
  { name: 'VERTICES', color: 2 },
  { name: 'TEXTOS', color: 3 },
];

function dxfHeader(): string {
  return [
    '0', 'SECTION',
    '2', 'HEADER',
    '9', '$ACADVER',
    '1', 'AC1009',
    '9', '$INSUNITS',
    '70', '6',  // meters
    '0', 'ENDSEC',
  ].join('\n');
}

function dxfTables(layers: DxfLayer[]): string {
  const layerDefs = layers.map(l => [
    '0', 'LAYER',
    '2', l.name,
    '70', '0',
    '62', String(l.color),
    '6', 'CONTINUOUS',
  ].join('\n')).join('\n');

  return [
    '0', 'SECTION',
    '2', 'TABLES',
    '0', 'TABLE',
    '2', 'LAYER',
    '70', String(layers.length),
    layerDefs,
    '0', 'ENDTAB',
    '0', 'ENDSEC',
  ].join('\n');
}

function dxfPolyline(verts: DxfVertex[], layer: string, closed: boolean): string {
  const flags = closed ? '1' : '0';
  const vertLines = verts.map(v => [
    '0', 'VERTEX',
    '8', layer,
    '10', v.e.toFixed(3),
    '20', v.n.toFixed(3),
    '30', (v.h ?? 0).toFixed(3),
  ].join('\n')).join('\n');

  return [
    '0', 'POLYLINE',
    '8', layer,
    '66', '1',
    '10', '0.000',
    '20', '0.000',
    '30', '0.000',
    '70', flags,
    vertLines,
    '0', 'SEQEND',
  ].join('\n');
}

function dxfLwPolyline(verts: DxfVertex[], layer: string, closed: boolean): string {
  const flag = closed ? '1' : '0';
  const coordLines = verts.map(v => [
    '10', v.e.toFixed(3),
    '20', v.n.toFixed(3),
  ].join('\n')).join('\n');

  return [
    '0', 'LWPOLYLINE',
    '8', layer,
    '90', String(verts.length),
    '70', flag,
    coordLines,
  ].join('\n');
}

function dxfPoint(v: DxfVertex, layer: string): string {
  return [
    '0', 'POINT',
    '8', layer,
    '10', v.e.toFixed(3),
    '20', v.n.toFixed(3),
    '30', (v.h ?? 0).toFixed(3),
  ].join('\n');
}

function dxfText(x: number, y: number, text: string, layer: string, height = 1.0): string {
  return [
    '0', 'TEXT',
    '8', layer,
    '10', x.toFixed(3),
    '20', y.toFixed(3),
    '30', '0.000',
    '40', height.toFixed(3),
    '1', text,
  ].join('\n');
}

export interface DxfExportOptions {
  imovelName: string;
  perimeterVerts: (DxfVertex & { name?: string })[];
  extraPolylines?: { verts: DxfVertex[]; layer: string; closed?: boolean }[];
  textHeight?: number;
}

export function generateDXF(opts: DxfExportOptions): string {
  const layers = [
    ...LAYERS_DEFAULT,
    ...(opts.extraPolylines ?? [])
      .map(p => p.layer)
      .filter((l, i, a) => a.indexOf(l) === i && !LAYERS_DEFAULT.some(d => d.name === l))
      .map(l => ({ name: l, color: 4 })),
  ];

  const entityLines: string[] = [];

  // Main perimeter polygon
  entityLines.push(dxfPolyline(opts.perimeterVerts, 'PERIMETRO', true));

  // Vertex points + labels
  opts.perimeterVerts.forEach((v, i) => {
    entityLines.push(dxfPoint(v, 'VERTICES'));
    if (v.name) {
      entityLines.push(dxfText(v.e + 0.5, v.n + 0.5, v.name, 'TEXTOS', opts.textHeight ?? 1.0));
    }
  });

  // Extra polylines
  (opts.extraPolylines ?? []).forEach(p => {
    entityLines.push(dxfPolyline(p.verts, p.layer, p.closed ?? false));
  });

  const dxf = [
    dxfHeader(),
    dxfTables(layers),
    '0', 'SECTION',
    '2', 'ENTITIES',
    entityLines.join('\n'),
    '0', 'ENDSEC',
    '0', 'EOF',
  ].join('\n');

  return dxf;
}

export function downloadDXF(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/dxf;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.dxf') ? filename : filename + '.dxf';
  a.click();
  URL.revokeObjectURL(url);
}
