/* Client-side DXF and LandXML parsers */

export interface CadParsedPoint {
  name: string;
  e: number;
  n: number;
  h?: number;
  type?: 'M' | 'V' | 'P';  // Marco, Virtual, Ponto
}

export interface ParseResult {
  points: CadParsedPoint[];
  datum?: string;
  zone?: string;
  warnings: string[];
  info: string;
}

/* ── DXF parser (R12 / R14 / 2000+) ── */
export function parseDXF(content: string): ParseResult {
  const lines = content.split(/\r?\n/).map(l => l.trim());
  const points: CadParsedPoint[] = [];
  const warnings: string[] = [];
  let i = 0;

  const next = () => { const v = lines[i]; i++; return v ?? ''; };
  const peek = () => lines[i] ?? '';

  function readEntityCodes(): Map<number, string[]> {
    const map = new Map<number, string[]>();
    while (i < lines.length) {
      const codeStr = next();
      if (codeStr === '' && i >= lines.length) break;
      const code = parseInt(codeStr, 10);
      if (isNaN(code)) { i--; break; }
      const value = next();
      if (!map.has(code)) map.set(code, []);
      map.get(code)!.push(value);
      // Stop at next entity start (code 0) after we've read at least something
      if (code === 0 && map.size > 1) { i -= 2; break; }
    }
    return map;
  }

  // Find ENTITIES section
  while (i < lines.length) {
    if (next() === '0' && peek() === 'SECTION') {
      next(); // consume SECTION
      if (next() === '2' && peek() === 'ENTITIES') {
        next(); // consume ENTITIES
        break;
      }
    }
  }

  let polyVertices: { x: number; y: number; z: number; name: string }[] = [];
  let inPolyline = false;
  let polyIdx = 0;

  while (i < lines.length) {
    const codeStr = next();
    if (codeStr === '0') {
      const entity = next();
      if (entity === 'ENDSEC' || entity === 'EOF') break;

      if (entity === 'POINT') {
        const codes = readEntityCodes();
        const x = parseFloat(codes.get(10)?.[0] ?? 'NaN');
        const y = parseFloat(codes.get(20)?.[0] ?? 'NaN');
        const z = parseFloat(codes.get(30)?.[0] ?? '0');
        const layerName = codes.get(8)?.[0] ?? '';
        if (!isNaN(x) && !isNaN(y)) {
          points.push({ name: `P${points.length + 1}`, e: x, n: y, h: z || undefined, type: 'P' });
        }
        i--;
      } else if (entity === 'LWPOLYLINE') {
        const codes = readEntityCodes();
        const xs = codes.get(10) ?? [];
        const ys = codes.get(20) ?? [];
        for (let k = 0; k < Math.min(xs.length, ys.length); k++) {
          const x = parseFloat(xs[k]);
          const y = parseFloat(ys[k]);
          if (!isNaN(x) && !isNaN(y)) {
            points.push({ name: `V${points.length + 1}`, e: x, n: y, type: 'V' });
          }
        }
        i--;
      } else if (entity === 'POLYLINE') {
        inPolyline = true;
        polyVertices = [];
        polyIdx = 0;
        i--;
      } else if (entity === 'VERTEX' && inPolyline) {
        const codes = readEntityCodes();
        const x = parseFloat(codes.get(10)?.[0] ?? 'NaN');
        const y = parseFloat(codes.get(20)?.[0] ?? 'NaN');
        const z = parseFloat(codes.get(30)?.[0] ?? '0');
        if (!isNaN(x) && !isNaN(y)) {
          polyVertices.push({ x, y, z, name: `V${++polyIdx}` });
        }
        i--;
      } else if (entity === 'SEQEND' && inPolyline) {
        polyVertices.forEach((v, k) => {
          points.push({ name: `V${points.length + 1}`, e: v.x, n: v.y, h: v.z || undefined, type: 'V' });
        });
        inPolyline = false;
        i--;
      } else if (entity === 'TEXT' || entity === 'MTEXT') {
        // skip
        i--;
      } else {
        i--;
      }
    }
  }

  if (points.length === 0) {
    warnings.push('Nenhum ponto ou polilinha encontrado no DXF.');
  }

  return {
    points,
    warnings,
    info: `DXF: ${points.length} pontos importados.`,
  };
}

/* ── LandXML parser ── */
export function parseLandXML(content: string): ParseResult {
  const points: CadParsedPoint[] = [];
  const warnings: string[] = [];
  let datum: string | undefined;
  let zone: string | undefined;

  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');

  const parseErr = doc.querySelector('parsererror');
  if (parseErr) {
    return { points, warnings: ['XML inválido: ' + parseErr.textContent?.slice(0, 100)], info: 'Falha ao parsear LandXML.' };
  }

  // Datum / coordinate system
  const cs = doc.querySelector('CoordinateSystem');
  if (cs) {
    datum = cs.getAttribute('datum') ?? cs.getAttribute('name') ?? undefined;
    const epsg = cs.getAttribute('epsgCode');
    if (epsg) zone = epsg;
    const desc = cs.getAttribute('desc') ?? '';
    const zoneMatch = desc.match(/\b(\d{1,2}[NS]?)\b/i);
    if (zoneMatch && !zone) zone = zoneMatch[1];
  }

  // CgPoints (COGO points)
  doc.querySelectorAll('CgPoint').forEach((el) => {
    const name = el.getAttribute('name') ?? el.getAttribute('oID') ?? `P${points.length + 1}`;
    const code = el.getAttribute('code') ?? '';
    const text = el.textContent?.trim() ?? '';
    const parts = text.split(/\s+/);
    if (parts.length >= 2) {
      // LandXML stores as northing easting or lat lon
      const first = parseFloat(parts[0]);
      const second = parseFloat(parts[1]);
      const third = parts[2] ? parseFloat(parts[2]) : undefined;
      if (!isNaN(first) && !isNaN(second)) {
        // Convention: if values > 1000, assume UTM (northing, easting); otherwise geographic
        const isUtm = Math.abs(first) > 90;
        points.push({
          name,
          e: isUtm ? second : second,  // easting is second in LandXML
          n: isUtm ? first : first,    // northing is first
          h: third !== undefined && !isNaN(third) ? third : undefined,
          type: /marco|M\d/i.test(code) ? 'M' : 'V',
        });
      }
    }
  });

  // Parcels — extract boundary points
  doc.querySelectorAll('Parcel').forEach((parcel) => {
    const pname = parcel.getAttribute('name') ?? '';
    parcel.querySelectorAll('Point').forEach((el, k) => {
      const text = el.textContent?.trim() ?? '';
      const parts = text.split(/\s+/);
      if (parts.length >= 2) {
        const first = parseFloat(parts[0]);
        const second = parseFloat(parts[1]);
        if (!isNaN(first) && !isNaN(second)) {
          points.push({ name: `${pname}_${k + 1}`, e: second, n: first, type: 'V' });
        }
      }
    });
  });

  if (points.length === 0) {
    warnings.push('Nenhum ponto encontrado no LandXML. Verifique o arquivo.');
  }

  return {
    points,
    datum,
    zone,
    warnings,
    info: `LandXML: ${points.length} pontos importados${datum ? ` (${datum})` : ''}.`,
  };
}

/* ── Generic file dispatcher ── */
export function parseCadFile(filename: string, content: string): ParseResult {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'dxf') return parseDXF(content);
  if (ext === 'xml' || ext === 'landxml') return parseLandXML(content);
  return { points: [], warnings: ['Formato não suportado: ' + ext], info: 'Nenhum dado importado.' };
}
