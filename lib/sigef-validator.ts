/* SIGEF/INCRA validation rules */

export interface SigefVertex {
  name: string;
  e: number;
  n: number;
  type: 'M' | 'V';  // Marco (physical monument) or Virtual
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  vertexIndex?: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  closureError?: number;      // meters
  perimeter?: number;         // meters
  area?: number;              // hectares
  orientation?: 'CW' | 'CCW';
}

/* INCRA precision standards (NBR 13133 / IN-02/2022) */
const MARCO_PRECISION_M = 0.50;   // 50 cm for physical monuments
const VIRTUAL_PRECISION_M = 3.00; // 3 m for virtual vertices
const MIN_VERTICES = 3;
const MIN_AREA_HA = 0.0001;       // 1 m²

function dist(a: { e: number; n: number }, b: { e: number; n: number }): number {
  return Math.sqrt((a.e - b.e) ** 2 + (a.n - b.n) ** 2);
}

function signedArea2(verts: SigefVertex[]): number {
  let sum = 0;
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    sum += verts[i].e * verts[j].n - verts[j].e * verts[i].n;
  }
  return sum; // positive = CCW, negative = CW
}

function segmentsIntersect(
  p1: { e: number; n: number }, p2: { e: number; n: number },
  p3: { e: number; n: number }, p4: { e: number; n: number }
): boolean {
  const d1e = p2.e - p1.e, d1n = p2.n - p1.n;
  const d2e = p4.e - p3.e, d2n = p4.n - p3.n;
  const denom = d1e * d2n - d1n * d2e;
  if (Math.abs(denom) < 1e-10) return false;
  const dx = p3.e - p1.e, dy = p3.n - p1.n;
  const t = (dx * d2n - dy * d2e) / denom;
  const u = (dx * d1n - dy * d1e) / denom;
  return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9;
}

export function validateSigef(verts: SigefVertex[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  /* 1. Minimum vertices */
  if (verts.length < MIN_VERTICES) {
    issues.push({ severity: 'error', code: 'MIN_VERTS', message: `Mínimo ${MIN_VERTICES} vértices necessários (atual: ${verts.length}).` });
    return { valid: false, issues };
  }

  /* 2. Duplicate coordinates */
  for (let i = 0; i < verts.length; i++) {
    for (let j = i + 1; j < verts.length; j++) {
      if (dist(verts[i], verts[j]) < 0.001) {
        issues.push({ severity: 'error', code: 'DUPLICATE', message: `Vértices duplicados: ${verts[i].name} e ${verts[j].name}.`, vertexIndex: i });
      }
    }
  }

  /* 3. Precision check */
  verts.forEach((v, i) => {
    const precision = v.type === 'M' ? MARCO_PRECISION_M : VIRTUAL_PRECISION_M;
    // Check coordinate decimal places (proxy for precision)
    const eDecimals = (v.e.toString().split('.')[1] ?? '').length;
    const nDecimals = (v.n.toString().split('.')[1] ?? '').length;
    if (eDecimals < 2 || nDecimals < 2) {
      issues.push({ severity: 'warning', code: 'LOW_PRECISION', message: `Vértice ${v.name}: coordenadas com pouca precisão decimal.`, vertexIndex: i });
    }
  });

  /* 4. Segment lengths */
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    const d = dist(verts[i], verts[j]);
    if (d < 0.01) {
      issues.push({ severity: 'error', code: 'ZERO_LENGTH', message: `Segmento quase nulo entre ${verts[i].name} e ${verts[j].name} (${d.toFixed(3)} m).`, vertexIndex: i });
    }
    if (d > 5000) {
      issues.push({ severity: 'warning', code: 'LONG_SEGMENT', message: `Segmento muito longo entre ${verts[i].name} e ${verts[j].name} (${d.toFixed(1)} m). Verifique se não faltam vértices.`, vertexIndex: i });
    }
  }

  /* 5. Self-intersection */
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const i2 = (i + 1) % n;
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // shared endpoint
      const j2 = (j + 1) % n;
      if (segmentsIntersect(verts[i], verts[i2], verts[j], verts[j2])) {
        issues.push({ severity: 'error', code: 'SELF_INTERSECT', message: `Auto-interseção entre segmentos ${verts[i].name}-${verts[i2].name} e ${verts[j].name}-${verts[j2].name}.`, vertexIndex: i });
      }
    }
  }

  /* 6. Orientation — SIGEF requires CCW (positive signed area) */
  const sa2 = signedArea2(verts);
  const area = Math.abs(sa2) / 2 / 10000; // ha
  const orientation: 'CW' | 'CCW' = sa2 >= 0 ? 'CCW' : 'CW';
  if (orientation === 'CW') {
    issues.push({ severity: 'warning', code: 'ORIENTATION_CW', message: 'Polígono no sentido horário (CW). SIGEF exige sentido anti-horário (CCW).' });
  }

  /* 7. Minimum area */
  if (area < MIN_AREA_HA) {
    issues.push({ severity: 'error', code: 'MIN_AREA', message: `Área muito pequena: ${area.toFixed(6)} ha (mínimo ${MIN_AREA_HA} ha).` });
  }

  /* 8. Perimeter */
  let perimeter = 0;
  for (let i = 0; i < verts.length; i++) {
    perimeter += dist(verts[i], verts[(i + 1) % verts.length]);
  }

  /* 9. Closure error (first ≡ last check) */
  const closureError = dist(verts[0], verts[verts.length - 1]);
  // For open polygons: closure error is 0 conceptually since we close automatically

  const errors = issues.filter(i => i.severity === 'error').length;
  return {
    valid: errors === 0,
    issues,
    closureError,
    perimeter,
    area,
    orientation,
  };
}

export function reorderCCW(verts: SigefVertex[]): SigefVertex[] {
  const sa2 = signedArea2(verts);
  if (sa2 >= 0) return verts; // already CCW
  return [...verts].reverse();
}
