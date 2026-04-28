import React, { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import {
  Upload, Pencil, Trash2, ZoomIn, ZoomOut, RotateCcw,
  FileSpreadsheet, FileText, MapPin, Ruler, ChevronDown, Info,
  Crosshair, Layers, CheckCircle, AlertCircle, Loader2, Table2,
  MousePointer, PenLine, Eraser, Move, Maximize2, Undo2,
  Eye, RefreshCw, Navigation, Target, Calculator, X, Check,
  Grid3x3, Plus, Map, FileCode2, Shield, Download, AlertTriangle,
  PanelRight, Tag, Minimize2
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import ConfrontacaoPDF from './ConfrontacaoPDF';
import * as XLSX from 'xlsx';
import type { LeafletDrawnFeature } from './LeafletMapView';
import { parseCadFile } from '../lib/cad-parsers';
import { validateSigef, reorderCCW } from '../lib/sigef-validator';
import type { ValidationResult } from '../lib/sigef-validator';
import { generateSigefXML, downloadSigefXML } from '../lib/sigef-xml';
import { generateDXF, downloadDXF } from '../lib/dxf-exporter';
import { generateMemorialDOCX, downloadBlob } from '../lib/memorial-docx';

const LeafletMapView = lazy(() => import('./LeafletMapView'));

/* ─────────────── Types ─────────────── */
interface GnssPoint {
  id: string; name: string;
  e: number; n: number; h: number;
  coordType: 'UTM' | 'GEO';
  quality?: string; rmsE?: number; rmsN?: number; rmsH?: number; samples?: number;
}
interface ParseResult { points: GnssPoint[]; datum?: string; zone?: string }
interface Confrontante { key: string; nome: string; tipo: string }
interface CadState {
  propertyName: string; ownerName: string; municipality: string; uf: string;
  incraCode: string; sigefCode: string; datum: string; zone: string;
  technicianName: string; technicianCrea: string;
}
interface Viewport { centerE: number; centerN: number; ppm: number }
type DrawTool = 'select' | 'add' | 'delete' | 'measure' | 'pan' | 'polyline' | 'node' | 'erase-obj';
interface DispOpts {
  fill: boolean; labels: boolean; distances: boolean;
  arrows: boolean; grid: boolean; northArrow: boolean; scaleBar: boolean;
  areaLabel: boolean; gridCoords: boolean; snapGrid: boolean;
}
interface UndoSnap { points: GnssPoint[]; polygonOrder: string[] }
interface MeasurePt { e: number; n: number }
interface EditField { id: string; name: string; e: string; n: string; h: string }

/* ── Feições (vector drawing objects) ── */
type ObjType = 'polyline' | 'polygon-area';
interface DrawVertex { id: string; e: number; n: number }
interface DrawObject {
  id: string; name: string; type: ObjType;
  vertices: DrawVertex[]; color: string;
  strokeWidth: number; visible: boolean;
}
interface SelNode { objId: string; vtxId: string }

const OBJ_COLORS = ['#3b82f6','#ef4444','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316'];
const SITUATION_OPTS = ['Linha', 'Curva', 'Estrada Municipal', 'Estrada Estadual', 'Estrada Federal', 'Rio', 'Córrego', 'Ribeirão', 'Canal', 'Servidão de Passagem'];

/* ─────────────── Math ─────────────── */
const toRad = (d: number) => d * Math.PI / 180;
function geoToMeter(lat: number, lon: number) {
  const R = 6371000;
  return { e: toRad(lon) * R * Math.cos(toRad(lat)), n: toRad(lat) * R };
}
function effC(pts: GnssPoint[]) {
  return pts.map(p => p.coordType === 'GEO' ? geoToMeter(p.n, p.e) : { e: p.e, n: p.n });
}
function calcAreaHa(pts: GnssPoint[]): number {
  const c = effC(pts); if (c.length < 3) return 0;
  let a = 0; const n = c.length;
  for (let i = 0; i < n; i++) { const j = (i+1)%n; a += c[i].e*c[j].n - c[j].e*c[i].n; }
  return Math.abs(a) / 2 / 10000;
}
function calcPerimeter(pts: GnssPoint[]): number {
  const c = effC(pts); if (c.length < 2) return 0;
  let p = 0; const n = c.length;
  for (let i = 0; i < n; i++) { const j=(i+1)%n; const dE=c[j].e-c[i].e, dN=c[j].n-c[i].n; p+=Math.sqrt(dE*dE+dN*dN); }
  return p;
}
function segDist(a: GnssPoint, b: GnssPoint): number {
  const ca = a.coordType==='GEO'?geoToMeter(a.n,a.e):{e:a.e,n:a.n};
  const cb = b.coordType==='GEO'?geoToMeter(b.n,b.e):{e:b.e,n:b.n};
  const dE=cb.e-ca.e, dN=cb.n-ca.n; return Math.sqrt(dE*dE+dN*dN);
}
function calcAzStr(a: GnssPoint, b: GnssPoint): string {
  const ca = a.coordType==='GEO'?geoToMeter(a.n,a.e):{e:a.e,n:a.n};
  const cb = b.coordType==='GEO'?geoToMeter(b.n,b.e):{e:b.e,n:b.n};
  let az = Math.atan2(cb.e-ca.e, cb.n-ca.n)*180/Math.PI;
  if (az<0) az+=360;
  const d=Math.floor(az), mT=(az-d)*60, m=Math.floor(mT), s=(mT-m)*60;
  return `${String(d).padStart(3,'0')}°${String(m).padStart(2,'0')}'${s.toFixed(0).padStart(2,'0')}"`;
}
function calcAzDeg(a:{e:number,n:number}, b:{e:number,n:number}): number {
  let az = Math.atan2(b.e-a.e, b.n-a.n)*180/Math.PI;
  if (az<0) az+=360; return az;
}
function rawDist(a:{e:number,n:number}, b:{e:number,n:number}): number {
  const dE=b.e-a.e, dN=b.n-a.n; return Math.sqrt(dE*dE+dN*dN);
}
function polygonCentroid(pts: GnssPoint[]): {e:number;n:number} {
  if (!pts.length) return {e:0,n:0};
  const c = effC(pts); const n = c.length;
  let cx=0, cy=0, area=0;
  for (let i=0; i<n; i++) {
    const j=(i+1)%n, cross=c[i].e*c[j].n - c[j].e*c[i].n;
    area+=cross; cx+=(c[i].e+c[j].e)*cross; cy+=(c[i].n+c[j].n)*cross;
  }
  area/=2;
  if (Math.abs(area)<1e-10) return {e:c.reduce((s,p)=>s+p.e,0)/n, n:c.reduce((s,p)=>s+p.n,0)/n};
  return {e:cx/(6*area), n:cy/(6*area)};
}
function parseAzimuth(s: string): number {
  const clean = s.replace(',','.').trim();
  const dms = clean.match(/^(\d+)[°\s\-]+(\d+)['\s\-]+(\d+\.?\d*)[""]?$/);
  if (dms) return parseFloat(dms[1]) + parseFloat(dms[2])/60 + parseFloat(dms[3])/3600;
  return parseFloat(clean);
}
function traverseCalc(from: GnssPoint, azDeg: number, dist: number): {e:number;n:number} {
  const r = azDeg * Math.PI / 180;
  return { e: from.e + dist * Math.sin(r), n: from.n + dist * Math.cos(r) };
}

/* ─────────────── CSV Parser ─────────────── */
function splitCsv(line: string, delim: string): string[] {
  const r: string[] = []; let cur='', inQ=false;
  for (const ch of line) {
    if (ch==='"') { inQ=!inQ; continue; }
    if (ch===delim && !inQ) { r.push(cur.trim()); cur=''; continue; }
    cur+=ch;
  }
  r.push(cur.trim()); return r;
}
function parseGnssCsv(raw: string): ParseResult {
  const lines = raw.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').map(l=>l.trim()).filter(Boolean);
  if (!lines.length) return {points:[]};
  const first = lines[0];
  const delim = (first.match(/;/g)||[]).length >= (first.match(/,/g)||[]).length ? ';' : ',';
  const hasHeader = /[a-zA-Z]/.test(first) && !/^\s*\d/.test(first);
  const headers = hasHeader ? splitCsv(first,delim).map(h=>h.toLowerCase().trim()) : [];
  const dataStart = hasHeader ? 1 : 0;
  const col = (...keys: string[]) => { for(const k of keys){const i=headers.findIndex(h=>h===k||h.includes(k));if(i>=0)return i;}return -1; };
  const nameCol=col('name','nome','vertice','vértice','ponto','id','point','pt');
  const eastCol=col('easting','este','east',' e','utm_e','x');
  const northCol=col('northing','norte','north',' n','utm_n','y');
  const elevCol=col('elevation','altitude','elev','alt','z','h');
  const latCol=col('latitude','lat'); const lonCol=col('longitude','lon','long');
  const statusCol=col('solution status','status','solução','quality');
  const csCol=col('cs name','coordinate system','sistema','datum','projection');
  const rmsECol=col('easting rms','rms_e'); const rmsNCol=col('northing rms','rms_n');
  const rmsHCol=col('elevation rms','rms_h'); const samplesCol=col('samples','amostras');
  let datum: string|undefined, zone: string|undefined;
  if (csCol>=0 && lines.length>dataStart) {
    const cs = (splitCsv(lines[dataStart],delim)[csCol]||'').trim();
    if (/sirgas/i.test(cs)) datum='SIRGAS 2000';
    else if (/sad.?69/i.test(cs)) datum='SAD69';
    else if (/wgs.?84/i.test(cs)) datum='WGS 84';
    const zm = cs.match(/zone\s*(\d{1,2}[NS]?)/i)||cs.match(/\b(\d{2}[NS])\b/i);
    if (zm) zone=zm[1].toUpperCase().replace(/\s/g,'');
  }
  const points: GnssPoint[] = [];
  lines.slice(dataStart).forEach((line,idx) => {
    const norm = delim===';' ? line.replace(/(\d),(\d)/g,'$1.$2') : line;
    const p = splitCsv(norm,delim); if (p.length<2) return;
    let name: string, e: number, n: number, h: number;
    let quality: string|undefined, rmsE: number|undefined, rmsN: number|undefined, rmsH: number|undefined, samples: number|undefined;
    if (hasHeader && (eastCol>=0||latCol>=0)) {
      name = (nameCol>=0?p[nameCol]:'')||`P${idx+1}`;
      if (eastCol>=0&&northCol>=0) { e=parseFloat(p[eastCol]); n=parseFloat(p[northCol]); }
      else if (lonCol>=0&&latCol>=0) { e=parseFloat(p[lonCol]); n=parseFloat(p[latCol]); }
      else return;
      h=elevCol>=0?(parseFloat(p[elevCol])||0):0;
      if(statusCol>=0) quality=p[statusCol]?.trim()||undefined;
      if(rmsECol>=0) rmsE=parseFloat(p[rmsECol])||undefined;
      if(rmsNCol>=0) rmsN=parseFloat(p[rmsNCol])||undefined;
      if(rmsHCol>=0) rmsH=parseFloat(p[rmsHCol])||undefined;
      if(samplesCol>=0) samples=parseInt(p[samplesCol])||undefined;
    } else {
      name=p[0]||`P${idx+1}`; e=parseFloat(p[1]); n=parseFloat(p[2]); h=parseFloat(p[3]||'0');
    }
    if (isNaN(e)||isNaN(n)) return;
    const isUtm=Math.abs(e)>1000||Math.abs(n)>1000;
    points.push({id:String(idx),name,e,n,h:isNaN(h)?0:h,coordType:isUtm?'UTM':'GEO',quality:quality?.toUpperCase() as any,rmsE,rmsN,rmsH,samples});
  });
  return {points,datum,zone};
}

/* ─────────────── Viewport helpers ─────────────── */
const SVG_W = 1200, SVG_H = 700;
const SNAP_PX = 14;
const SEG_PX  = 10;

function u2s(e:number, n:number, vp:Viewport) {
  return { x: SVG_W/2 + (e-vp.centerE)*vp.ppm, y: SVG_H/2 - (n-vp.centerN)*vp.ppm };
}
function s2u(x:number, y:number, vp:Viewport) {
  return { e: vp.centerE+(x-SVG_W/2)/vp.ppm, n: vp.centerN-(y-SVG_H/2)/vp.ppm };
}
function fitViewport(pts: GnssPoint[]): Viewport {
  if (!pts.length) return {centerE:0,centerN:0,ppm:1};
  const es=pts.map(p=>p.e), ns=pts.map(p=>p.n);
  const minE=Math.min(...es),maxE=Math.max(...es),minN=Math.min(...ns),maxN=Math.max(...ns);
  const rE=maxE-minE||1, rN=maxN-minN||1;
  const ppm=Math.min((SVG_W*0.82)/rE,(SVG_H*0.82)/rN);
  return {centerE:(minE+maxE)/2,centerN:(minN+maxN)/2,ppm};
}
function findSnap(sx:number, sy:number, pts:GnssPoint[], vp:Viewport): GnssPoint|null {
  let best: GnssPoint|null=null, bestD=Infinity;
  for(const p of pts){const s=u2s(p.e,p.n,vp);const d=Math.hypot(s.x-sx,s.y-sy);if(d<SNAP_PX&&d<bestD){bestD=d;best=p;}}
  return best;
}
function findSegmentInsert(sx:number,sy:number,ordered:GnssPoint[],vp:Viewport):{idx:number;e:number;n:number}|null {
  if(ordered.length<2) return null;
  let best: {idx:number;e:number;n:number}|null=null, bestD=Infinity;
  for(let i=0;i<ordered.length;i++){
    const a=u2s(ordered[i].e,ordered[i].n,vp);
    const b=u2s(ordered[(i+1)%ordered.length].e,ordered[(i+1)%ordered.length].n,vp);
    const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;
    if(len2<0.001) continue;
    const t=Math.max(0,Math.min(1,((sx-a.x)*dx+(sy-a.y)*dy)/len2));
    const cx=a.x+t*dx,cy=a.y+t*dy;
    const d=Math.hypot(sx-cx,sy-cy);
    if(d<SEG_PX&&d<bestD){bestD=d;const u=s2u(cx,cy,vp);best={idx:i+1,e:u.e,n:u.n};}
  }
  return best;
}
function niceScale(meters:number):{value:number;label:string}{
  const mag=Math.pow(10,Math.floor(Math.log10(meters)));
  const n=Math.round(meters/mag)*mag;
  return {value:n,label:n>=1000?`${(n/1000).toFixed(1)} km`:`${n.toFixed(0)} m`};
}
function ptToSegDist(px:number,py:number,ax:number,ay:number,bx:number,by:number):number{
  const dx=bx-ax,dy=by-ay,len2=dx*dx+dy*dy;
  if(len2<0.001) return Math.hypot(px-ax,py-ay);
  const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len2));
  return Math.hypot(px-ax-t*dx,py-ay-t*dy);
}
function findNearestObj(sx:number,sy:number,objs:DrawObject[],vp:Viewport,maxPx=14):DrawObject|null{
  let best:DrawObject|null=null,bestD=Infinity;
  for(const obj of objs){
    if(!obj.visible||obj.vertices.length<2) continue;
    const n=obj.vertices.length;
    const segs=obj.type==='polygon-area'?n:n-1;
    for(let i=0;i<segs;i++){
      const a=obj.vertices[i],b=obj.vertices[(i+1)%n];
      const sa=u2s(a.e,a.n,vp),sb=u2s(b.e,b.n,vp);
      const d=ptToSegDist(sx,sy,sa.x,sa.y,sb.x,sb.y);
      if(d<maxPx&&d<bestD){bestD=d;best=obj;}
    }
  }
  return best;
}
function findNearestObjNode(sx:number,sy:number,objs:DrawObject[],vp:Viewport,maxPx=14):{objId:string;vtxId:string;e:number;n:number}|null{
  let best=null as {objId:string;vtxId:string;e:number;n:number}|null,bestD=Infinity;
  for(const obj of objs){
    if(!obj.visible) continue;
    for(const v of obj.vertices){
      const sp=u2s(v.e,v.n,vp),d=Math.hypot(sx-sp.x,sy-sp.y);
      if(d<maxPx&&d<bestD){bestD=d;best={objId:obj.id,vtxId:v.id,e:v.e,n:v.n};}
    }
  }
  return best;
}

/* ── OSnap ── */
type SnapType = 'vertex' | 'node' | 'midpoint' | 'nearest' | 'close' | 'grid';
interface SnapResult { e: number; n: number; type: SnapType }

function findOSnap(
  sx: number, sy: number,
  pts: GnssPoint[], objs: DrawObject[], vp: Viewport,
  snapGrid: boolean, drawingObjId: string | null
): SnapResult | null {
  // 1. Close snap (first vertex of active drawing, need ≥3 placed)
  if (drawingObjId) {
    const dobj = objs.find(o => o.id === drawingObjId);
    if (dobj && dobj.vertices.length >= 3) {
      const fv = dobj.vertices[0];
      const sfv = u2s(fv.e, fv.n, vp);
      if (Math.hypot(sx - sfv.x, sy - sfv.y) < SNAP_PX)
        return { e: fv.e, n: fv.n, type: 'close' };
    }
  }
  // 2. GNSS vertex
  const gsnap = findSnap(sx, sy, pts, vp);
  if (gsnap) return { e: gsnap.e, n: gsnap.n, type: 'vertex' };
  // 3. Draw object node
  const onode = findNearestObjNode(sx, sy, objs, vp);
  if (onode) return { e: onode.e, n: onode.n, type: 'node' };
  // 4. Midpoint of draw object segments
  for (const obj of objs) {
    if (!obj.visible || obj.vertices.length < 2) continue;
    const nn = obj.vertices.length;
    const segs = obj.type === 'polygon-area' ? nn : nn - 1;
    for (let i = 0; i < segs; i++) {
      const a = obj.vertices[i], b = obj.vertices[(i + 1) % nn];
      const me = (a.e + b.e) / 2, mn = (a.n + b.n) / 2;
      const ms = u2s(me, mn, vp);
      if (Math.hypot(sx - ms.x, sy - ms.y) < SNAP_PX)
        return { e: me, n: mn, type: 'midpoint' };
    }
  }
  // 5. Nearest point on segment
  let bE = 0, bN = 0, bD = SEG_PX, found = false;
  for (const obj of objs) {
    if (!obj.visible || obj.vertices.length < 2) continue;
    const nn = obj.vertices.length;
    const segs = obj.type === 'polygon-area' ? nn : nn - 1;
    for (let i = 0; i < segs; i++) {
      const a = obj.vertices[i], b = obj.vertices[(i + 1) % nn];
      const sa = u2s(a.e, a.n, vp), sb = u2s(b.e, b.n, vp);
      const dx = sb.x - sa.x, dy = sb.y - sa.y, len2 = dx * dx + dy * dy;
      if (len2 < 0.001) continue;
      const t = Math.max(0, Math.min(1, ((sx - sa.x) * dx + (sy - sa.y) * dy) / len2));
      const cx = sa.x + t * dx, cy = sa.y + t * dy;
      const d = Math.hypot(sx - cx, sy - cy);
      if (d < bD) { bD = d; const u = s2u(cx, cy, vp); bE = u.e; bN = u.n; found = true; }
    }
  }
  if (found) return { e: bE, n: bN, type: 'nearest' };
  // 6. Grid snap
  if (snapGrid) {
    const gs = niceScale(50 / vp.ppm).value;
    const utm = s2u(sx, sy, vp);
    return { e: Math.round(utm.e / gs) * gs, n: Math.round(utm.n / gs) * gs, type: 'grid' };
  }
  return null;
}

function calcDrawObjArea(vertices: DrawVertex[]): number {
  if (vertices.length < 3) return 0;
  let a = 0; const n = vertices.length;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; a += vertices[i].e * vertices[j].n - vertices[j].e * vertices[i].n; }
  return Math.abs(a) / 2 / 10000;
}
function drawObjCentroid(vertices: DrawVertex[]): { e: number; n: number } {
  if (!vertices.length) return { e: 0, n: 0 };
  const n = vertices.length; let cx = 0, cy = 0, area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, cross = vertices[i].e * vertices[j].n - vertices[j].e * vertices[i].n;
    area += cross; cx += (vertices[i].e + vertices[j].e) * cross; cy += (vertices[i].n + vertices[j].n) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-10) return { e: vertices.reduce((s, v) => s + v.e, 0) / n, n: vertices.reduce((s, v) => s + v.n, 0) / n };
  return { e: cx / (6 * area), n: cy / (6 * area) };
}

/* ─────────────── Component ─────────────── */
const CadModule: React.FC = () => {
  /* ── Data state ── */
  const [points, setPoints] = useState<GnssPoint[]>([]);
  const [polygonOrder, setPolygonOrder] = useState<string[]>([]);
  const [confrontantes, setConfrontantes] = useState<Record<string,Confrontante>>({});
  const [cadState, setCadState] = useState<CadState>({
    propertyName:'',ownerName:'',municipality:'',uf:'GO',
    incraCode:'',sigefCode:'',datum:'SIRGAS 2000',zone:'22S',
    technicianName:'',technicianCrea:'',
  });
  const [undoStack, setUndoStack] = useState<UndoSnap[]>([]);

  /* ── UI state ── */
  const [activeTab, setActiveTab] = useState<'pontos'|'desenho'|'confrontantes'|'relatorio'>('pontos');
  const [editingPoint, setEditingPoint] = useState<string|null>(null);
  const [editName, setEditName] = useState('');
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [toast, setToast] = useState<string|null>(null);

  /* ── Selected-point editing (right panel) ── */
  const [editField, setEditField] = useState<EditField|null>(null);
  const [editDirty, setEditDirty] = useState(false);

  /* ── Box selection ── */
  const [boxSel, setBoxSel] = useState<{x1:number;y1:number;x2:number;y2:number}|null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedIdsRef = useRef<Set<string>>(new Set());
  selectedIdsRef.current = selectedIds;
  const isBoxSelRef = useRef(false);
  const boxSelStartRef = useRef<{x:number;y:number}|null>(null);

  /* ── Add-by-coordinate modal ── */
  const [showCoordModal, setShowCoordModal] = useState(false);
  const [coordInput, setCoordInput] = useState({name:'', e:'', n:'', h:'0'});

  /* ── Traverse / Radiação modal ── */
  const [showTraverseModal, setShowTraverseModal] = useState(false);
  const [traverseInput, setTraverseInput] = useState({name:'', az:'', dist:'', h:'0', fromId:''});

  /* ── Draw objects (feições vetoriais) ── */
  const [drawObjects, setDrawObjects] = useState<DrawObject[]>([]);
  const [drawingId, setDrawingId] = useState<string|null>(null);
  const [rubberBand, setRubberBand] = useState<{e:number;n:number}|null>(null);
  const [selObjId, setSelObjId] = useState<string|null>(null);
  const [selNode, setSelNode] = useState<SelNode|null>(null);
  const [showFeicoesPanel, setShowFeicoesPanel] = useState(true);
  const [renamingObjId, setRenamingObjId] = useState<string|null>(null);
  const [renameObjVal, setRenameObjVal] = useState('');
  const [showMapView, setShowMapView] = useState(false);
  const drawObjectsRef = useRef(drawObjects);
  drawObjectsRef.current = drawObjects;
  const drawingIdRef = useRef(drawingId);
  drawingIdRef.current = drawingId;
  const selNodeRef = useRef(selNode);
  selNodeRef.current = selNode;
  const objColorIdxRef = useRef(0);
  const lastClickTimeRef = useRef(0);
  const isDragNodeRef = useRef(false);

  /* ── CAD viewport ── */
  const [viewport, setViewport] = useState<Viewport>({centerE:478060,centerN:8070814,ppm:0.08});
  const vpRef = useRef(viewport);
  vpRef.current = viewport;

  /* ── CAD tools ── */
  const [tool, setTool] = useState<DrawTool>('select');
  const toolRef = useRef<DrawTool>('select');
  toolRef.current = tool;

  /* ── Interaction refs ── */
  const isDraggingRef = useRef(false);
  const dragIdRef = useRef<string|null>(null);
  const panLastRef = useRef<{x:number,y:number}|null>(null);
  const isPanningRef = useRef(false);
  const ptCounterRef = useRef(0);
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const polyRef = useRef(polygonOrder);
  polyRef.current = polygonOrder;

  /* ── CAD display state ── */
  const [activeSnap, setActiveSnap] = useState<SnapResult|null>(null);
  const activeSnapRef = useRef<SnapResult|null>(null);
  activeSnapRef.current = activeSnap;
  const [cursorUTM, setCursorUTM] = useState<{e:number,n:number}|null>(null);
  const [measurePts, setMeasurePts] = useState<MeasurePt[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedId, setDraggedId] = useState<string|null>(null);

  /* ── Display options ── */
  const [disp, setDisp] = useState<DispOpts>({
    fill:true,labels:true,distances:true,arrows:true,grid:true,
    northArrow:true,scaleBar:true,areaLabel:true,gridCoords:false,snapGrid:false
  });
  const [showDispPanel, setShowDispPanel] = useState(false);

  /* ── Refs ── */
  const canvasRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cadFileInputRef = useRef<HTMLInputElement>(null);
  const dispRef = useRef(disp);
  dispRef.current = disp;

  /* ── SIGEF validation & extra export state ── */
  const [sigefValidation, setSigefValidation] = useState<ValidationResult | null>(null);
  const [isExportingDOCX, setIsExportingDOCX] = useState(false);

  /* ── AutoCAD-style UI state ── */
  const [openMenu, setOpenMenu] = useState<string|null>(null);
  const [leftPanelTab, setLeftPanelTab] = useState<'feicoes'|'pontos'>('feicoes');
  const [rightPanelTab, setRightPanelTab] = useState<'props'|'confrontantes'|'relatorio'>('props');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cmdHistory, setCmdHistory] = useState<string[]>(['GeoCAD GNSS pronto. Digite coordenadas E,N ou use os menus.']);
  const [cmdInput, setCmdInput] = useState('');
  const cmdInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg:string) => { setToast(msg); setTimeout(()=>setToast(null),3000); },[]);

  /* ── Derived ── */
  const orderedPoints = polygonOrder.map(id=>points.find(p=>p.id===id)!).filter(Boolean);
  const areaHa = calcAreaHa(orderedPoints);
  const perimeter = calcPerimeter(orderedPoints);
  const centroid = orderedPoints.length>=3 ? polygonCentroid(orderedPoints) : null;

  /* ── Sync editField when selectedId changes ── */
  useEffect(()=>{
    if(selectedId){
      const pt=points.find(p=>p.id===selectedId);
      if(pt){ setEditField({id:pt.id,name:pt.name,e:pt.e.toFixed(3),n:pt.n.toFixed(3),h:pt.h.toFixed(3)}); setEditDirty(false); }
    } else {
      setEditField(null); setEditDirty(false);
    }
  },[selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Undo ── */
  const pushUndo = useCallback(()=>{
    setUndoStack(prev=>[...prev.slice(-29),{points:[...pointsRef.current],polygonOrder:[...polyRef.current]}]);
  },[]);
  const undo = useCallback(()=>{
    setUndoStack(prev=>{
      if(!prev.length) return prev;
      const snap=prev[prev.length-1];
      setPoints(snap.points); setPolygonOrder(snap.polygonOrder);
      return prev.slice(0,-1);
    });
  },[]);

  /* ── Snap to grid ── */
  const snapToGrid = useCallback((e:number,n:number):{e:number;n:number}=>{
    if(!dispRef.current.snapGrid) return {e,n};
    const gs=niceScale(50/vpRef.current.ppm).value;
    return {e:Math.round(e/gs)*gs, n:Math.round(n/gs)*gs};
  },[]);

  /* ── Apply edited coordinates ── */
  const applyEditField = useCallback(()=>{
    if(!editField) return;
    const e=parseFloat(editField.e.replace(',','.'));
    const n=parseFloat(editField.n.replace(',','.'));
    const h=parseFloat(editField.h.replace(',','.'))||0;
    if(isNaN(e)||isNaN(n)){showToast('Coordenadas inválidas.');return;}
    pushUndo();
    setPoints(prev=>prev.map(p=>p.id===editField.id?{...p,name:editField.name||p.name,e,n,h,coordType:'UTM'}:p));
    setEditDirty(false);
    showToast('Coordenadas aplicadas.');
  },[editField,pushUndo,showToast]);

  /* ── Draw object helpers ── */
  const finishDrawing = useCallback(()=>{
    const id=drawingIdRef.current; if(!id) return;
    setDrawObjects(prev=>{
      const obj=prev.find(o=>o.id===id);
      if(!obj||obj.vertices.length<2) return prev.filter(o=>o.id!==id);
      return prev.map(o=>o.id===id?{...o,vertices:o.vertices.slice(0,-1)}:o);
    });
    setDrawingId(null); setRubberBand(null);
  },[]);

  const cancelDrawing = useCallback(()=>{
    const id=drawingIdRef.current; if(!id) return;
    setDrawObjects(prev=>prev.filter(o=>o.id!==id));
    setDrawingId(null); setRubberBand(null);
  },[]);

  const closeDrawing = useCallback(()=>{
    const id=drawingIdRef.current; if(!id) return;
    setDrawObjects(prev=>{
      const obj=prev.find(o=>o.id===id);
      if(!obj||obj.vertices.length<3) return prev.filter(o=>o.id!==id);
      return prev.map(o=>o.id===id?{...o,type:'polygon-area',vertices:o.vertices.slice(0,-1)}:o);
    });
    setDrawingId(null); setRubberBand(null);
    showToast('Polígono fechado.');
  },[showToast]);

  const deleteDrawObj = useCallback((id:string)=>{
    setDrawObjects(prev=>prev.filter(o=>o.id!==id));
    if(selObjId===id) setSelObjId(null);
    setSelNode(null);
  },[selObjId]);

  /* ── Sync features from Leaflet map → drawObjects ── */
  const handleLeafletFeatures = useCallback((features: LeafletDrawnFeature[]) => {
    setDrawObjects(prev => {
      // Keep existing non-leaflet objects; replace/add leaflet-sourced ones
      const nonLeaflet = prev.filter(o => !o.id.startsWith('lf_'));
      const leafletObjs = features.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        vertices: f.vertices,
        color: f.color,
        strokeWidth: 2,
        visible: true,
      }));
      return [...nonLeaflet, ...leafletObjs];
    });
  }, []);

  /* ── Add by coordinate ── */
  const addByCoord = useCallback(()=>{
    const e=parseFloat(coordInput.e.replace(',','.'));
    const n=parseFloat(coordInput.n.replace(',','.'));
    const h=parseFloat(coordInput.h.replace(',','.'))||0;
    if(isNaN(e)||isNaN(n)){showToast('Coordenadas inválidas.');return;}
    pushUndo();
    const newId=`pt_${Date.now()}_${ptCounterRef.current++}`;
    const name=coordInput.name.trim()||`P${ptCounterRef.current}`;
    setPoints(prev=>[...prev,{id:newId,name,e,n,h,coordType:'UTM'}]);
    setPolygonOrder(prev=>[...prev,newId]);
    setSelectedId(newId);
    setCoordInput({name:'',e:'',n:'',h:'0'});
    setShowCoordModal(false);
    setActiveTab('desenho');
    showToast(`Ponto ${name} adicionado (E:${e.toFixed(2)} N:${n.toFixed(2)})`);
  },[coordInput,pushUndo,showToast]);

  /* ── Add by traverse (radiação) ── */
  const addByTraverse = useCallback(()=>{
    const fromPt = traverseInput.fromId
      ? points.find(p=>p.id===traverseInput.fromId)
      : orderedPoints[orderedPoints.length-1];
    if(!fromPt){showToast('Selecione o ponto de origem.');return;}
    const az=parseAzimuth(traverseInput.az);
    const dist=parseFloat(traverseInput.dist.replace(',','.'));
    if(isNaN(az)||isNaN(dist)||dist<=0){showToast('Azimute ou distância inválidos.');return;}
    const h=parseFloat(traverseInput.h.replace(',','.'))||0;
    const {e,n}=traverseCalc(fromPt,az,dist);
    pushUndo();
    const newId=`pt_${Date.now()}_${ptCounterRef.current++}`;
    const name=traverseInput.name.trim()||`P${ptCounterRef.current}`;
    setPoints(prev=>[...prev,{id:newId,name,e,n,h,coordType:'UTM'}]);
    setPolygonOrder(prev=>[...prev,newId]);
    setSelectedId(newId);
    setTraverseInput({name:'',az:'',dist:'',h:'0',fromId:''});
    setShowTraverseModal(false);
    setActiveTab('desenho');
    showToast(`${name} adicionado — Az:${az.toFixed(4)}° Dist:${dist.toFixed(2)}m`);
  },[traverseInput,points,orderedPoints,pushUndo,showToast]);

  /* ── Import ── */
  const handleFileImport = (e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      const {points:parsed,datum,zone}=parseGnssCsv(ev.target?.result as string);
      if(!parsed.length){showToast('Nenhum ponto válido encontrado.');return;}
      setPoints(parsed); setPolygonOrder(parsed.map(p=>p.id));
      setConfrontantes({}); setSelectedId(null); setMeasurePts([]);
      ptCounterRef.current=parsed.length;
      if(datum||zone) setCadState(prev=>({...prev,...(datum?{datum}:{}),...(zone?{zone}:{})}));
      setViewport(fitViewport(parsed));
      const fx=parsed.filter(p=>p.quality==='FIX').length, fl=parsed.filter(p=>p.quality==='FLOAT').length;
      showToast(`${parsed.length} pontos importados${fx||fl?` (FIX:${fx} FLOAT:${fl})`:''}. Datum: ${datum||'?'} Zona: ${zone||'?'}`);
    };
    reader.readAsText(file,'UTF-8'); e.target.value='';
  };

  /* ── DXF / LandXML import ── */
  const handleCadFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const result = parseCadFile(file.name, content);
      if (!result.points.length) {
        showToast(result.warnings[0] || 'Nenhum ponto encontrado no arquivo.');
        return;
      }
      const imported: GnssPoint[] = result.points.map((p, i) => ({
        id: `pt_${Date.now()}_${i}`,
        name: p.name,
        e: p.e,
        n: p.n,
        h: p.h ?? 0,
        coordType: 'UTM' as const,
      }));
      pushUndo();
      setPoints(imported);
      setPolygonOrder(imported.map(p => p.id));
      setConfrontantes({});
      setSelectedId(null);
      setMeasurePts([]);
      ptCounterRef.current = imported.length;
      if (result.datum || result.zone) {
        setCadState(prev => ({ ...prev, ...(result.datum ? { datum: result.datum! } : {}), ...(result.zone ? { zone: result.zone! } : {}) }));
      }
      setViewport(fitViewport(imported));
      const warnStr = result.warnings.length ? ` ⚠ ${result.warnings.join('; ')}` : '';
      showToast(`${result.info}${warnStr}`);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  /* ── SIGEF validation ── */
  const runSigefValidation = useCallback(() => {
    if (orderedPoints.length < 3) { showToast('Mínimo 3 vértices para validar.'); return; }
    const sigefVerts = orderedPoints.map(p => ({ name: p.name, e: p.e, n: p.n, type: 'M' as 'M' | 'V' }));
    const result = validateSigef(sigefVerts);
    setSigefValidation(result);
    if (result.valid) showToast('Validação SIGEF: OK — sem erros críticos.');
    else showToast(`Validação SIGEF: ${result.issues.filter(i => i.severity === 'error').length} erro(s) encontrado(s).`);
  }, [orderedPoints, showToast]);

  /* ── SIGEF XML export ── */
  const exportSigefXml = useCallback(() => {
    if (orderedPoints.length < 3) { showToast('Mínimo 3 vértices para exportar SIGEF.'); return; }
    const sigefVerts = orderedPoints.map(p => ({ name: p.name, e: p.e, n: p.n, type: 'M' as 'M' | 'V' }));
    const ordered = reorderCCW(sigefVerts);
    const confrontantesArr = orderedPoints.map((pt, i) => {
      const next = orderedPoints[(i + 1) % orderedPoints.length];
      const key = `${pt.id}-${next.id}`;
      const conf = confrontantes[key];
      return conf?.nome ? { nome: conf.nome, tipo: 'propriedade' as const, verticeInicio: pt.name, verticeFim: next.name } : null;
    }).filter(Boolean) as import('../lib/sigef-xml').SigefConfrontante[];
    const xml = generateSigefXML(
      {
        nomeImovel: cadState.propertyName || 'Imóvel Rural',
        municipio: cadState.municipality || '—',
        uf: cadState.uf || 'GO',
        codigoIncra: cadState.incraCode || undefined,
        area: areaHa,
        utmZone: cadState.zone || '22S',
        datum: cadState.datum || 'SIRGAS2000',
        responsavel: cadState.technicianName || '—',
        creaArt: cadState.technicianCrea || '—',
        dataLevantamento: new Date().toISOString().slice(0, 10),
      },
      ordered,
      confrontantesArr,
    );
    downloadSigefXML(`sigef-${cadState.propertyName || 'imovel'}.xml`, xml);
    showToast('SIGEF XML exportado.');
  }, [orderedPoints, cadState, areaHa, confrontantes, showToast]);

  /* ── Memorial DOCX export ── */
  const exportMemorialDocx = useCallback(async () => {
    if (orderedPoints.length < 3) { showToast('Mínimo 3 vértices para exportar memorial.'); return; }
    setIsExportingDOCX(true);
    try {
      const confrontantesArr = orderedPoints.map((pt, i) => {
        const key = `${pt.id}-${orderedPoints[(i + 1) % orderedPoints.length].id}`;
        const conf = confrontantes[key];
        return conf?.nome ? { lado: `${pt.name}→${orderedPoints[(i + 1) % orderedPoints.length].name}`, nome: conf.nome } : null;
      }).filter(Boolean) as { lado: string; nome: string }[];
      const blob = await generateMemorialDOCX(
        {
          nomeImovel: cadState.propertyName || 'Imóvel Rural',
          municipio: cadState.municipality || '—',
          uf: cadState.uf || 'GO',
          codigoIncra: cadState.incraCode || undefined,
          area: areaHa,
          perimetro: perimeter,
          utmZone: cadState.zone || '22S',
          datum: cadState.datum || 'SIRGAS2000',
          responsavel: cadState.technicianName || '—',
          creaArt: cadState.technicianCrea || '—',
          dataLevantamento: new Date().toISOString().slice(0, 10),
          confrontantes: confrontantesArr,
        },
        orderedPoints.map(p => ({ name: p.name, e: p.e, n: p.n, h: p.h, type: 'M' as 'M' | 'V' })),
      );
      downloadBlob(blob, `memorial-${cadState.propertyName || 'imovel'}.docx`);
      showToast('Memorial DOCX exportado.');
    } catch (err) {
      showToast('Erro ao gerar DOCX.');
    } finally {
      setIsExportingDOCX(false);
    }
  }, [orderedPoints, cadState, areaHa, perimeter, confrontantes, showToast]);

  /* ── DXF export ── */
  const exportDxf = useCallback(() => {
    if (orderedPoints.length < 2) { showToast('Mínimo 2 vértices para exportar DXF.'); return; }
    const dxfContent = generateDXF({
      imovelName: cadState.propertyName || 'Imovel',
      perimeterVerts: orderedPoints.map(p => ({ e: p.e, n: p.n, h: p.h, name: p.name })),
      textHeight: Math.max(1, 50 / viewport.ppm),
    });
    downloadDXF(`perimetro-${cadState.propertyName || 'imovel'}.dxf`, dxfContent);
    showToast('DXF R12 exportado.');
  }, [orderedPoints, cadState, viewport.ppm, showToast]);

  /* ── SVG coordinate helper ── */
  const getSvgXY = (e:React.MouseEvent|MouseEvent):{x:number,y:number}=>{
    const rect=canvasRef.current!.getBoundingClientRect();
    return {x:(e.clientX-rect.left)/rect.width*SVG_W, y:(e.clientY-rect.top)/rect.height*SVG_H};
  };

  /* ── Wheel handler (non-passive) ── */
  useEffect(()=>{
    const el=canvasRef.current; if(!el) return;
    const handler=(e:WheelEvent)=>{
      e.preventDefault();
      const rect=el.getBoundingClientRect();
      const sx=(e.clientX-rect.left)/rect.width*SVG_W;
      const sy=(e.clientY-rect.top)/rect.height*SVG_H;
      const factor=e.deltaY<0?1.18:1/1.18;
      setViewport(prev=>{
        const newPpm=Math.max(0.00001,Math.min(1e7,prev.ppm*factor));
        const curE=prev.centerE+(sx-SVG_W/2)/prev.ppm;
        const curN=prev.centerN-(sy-SVG_H/2)/prev.ppm;
        return {centerE:curE-(sx-SVG_W/2)/newPpm, centerN:curN+(sy-SVG_H/2)/newPpm, ppm:newPpm};
      });
    };
    el.addEventListener('wheel',handler,{passive:false});
    return ()=>el.removeEventListener('wheel',handler);
  },[]);

  /* ── Keyboard shortcuts ── */
  useEffect(()=>{
    const handler=(e:KeyboardEvent)=>{
      if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement) return;
      if(e.key==='s'||e.key==='S') setTool('select');
      if(e.key==='a'||e.key==='A') setTool('add');
      if(e.key==='d'||e.key==='D') setTool('delete');
      if(e.key==='m'||e.key==='M') setTool('measure');
      if(e.key==='p'||e.key==='P') setTool('pan');
      if(e.key==='f'||e.key==='F') { if(pointsRef.current.length) setViewport(fitViewport(pointsRef.current)); }
      if(e.key==='r'||e.key==='R') { if(pointsRef.current.length) setShowTraverseModal(true); }
      if(e.key==='l'||e.key==='L') setTool('polyline');
      if(e.key==='n'||e.key==='N') setTool('node');
      if(e.key==='o'||e.key==='O') setTool('erase-obj');
      if((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K')){ e.preventDefault(); setShowCoordModal(true); }
      if((e.ctrlKey||e.metaKey)&&e.key==='z'){ e.preventDefault(); undo(); }
      if(e.key==='Enter'&&activeTab==='desenho'){
        if(editField&&editDirty) applyEditField();
        else if(drawingIdRef.current) finishDrawing();
      }
      if((e.key==='c'||e.key==='C')&&drawingIdRef.current) closeDrawing();
      if((e.key==='Delete'||e.key==='Backspace')&&activeTab==='desenho'){
        if(drawingIdRef.current){ cancelDrawing(); return; }
        // Delete selected survey vertex
        const sid=selectedId;
        if(sid){
          pushUndo();
          setPoints(prev=>prev.filter(p=>p.id!==sid));
          setPolygonOrder(prev=>prev.filter(id=>id!==sid));
          setSelectedId(null);
        }
        // Delete selected draw object node
        const sn=selNodeRef.current;
        if(sn){
          setDrawObjects(prev=>prev.map(o=>o.id===sn.objId?{...o,vertices:o.vertices.filter(v=>v.id!==sn.vtxId)}:o));
          setSelNode(null);
        }
      }
      if(e.key==='Escape'){
        if(drawingIdRef.current){cancelDrawing();return;}
        setMeasurePts([]); setSelectedId(null); setEditField(null);
        setSelNode(null); setSelObjId(null);
        setShowCoordModal(false); setShowTraverseModal(false);
        setBoxSel(null); isBoxSelRef.current=false;
        setIsFullscreen(false);
      }
      if(e.key==='F11'){ e.preventDefault(); setIsFullscreen(v=>!v); }
    };
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  },[activeTab,selectedId,editField,editDirty,undo,pushUndo,applyEditField,finishDrawing,cancelDrawing,closeDrawing]);

  /* ── Mouse handlers ── */
  const handleMouseDown = useCallback((e:React.MouseEvent<SVGSVGElement>)=>{
    if(e.button===2) return;
    const {x:sx,y:sy}=getSvgXY(e);
    const curTool=toolRef.current;
    const vp=vpRef.current;
    const snap=findSnap(sx,sy,pointsRef.current,vp);

    if(e.button===1||(e.button===0&&curTool==='pan')){
      isPanningRef.current=true; panLastRef.current={x:sx,y:sy};
      e.preventDefault(); return;
    }

    if(curTool==='select'){
      if(snap){
        if(e.shiftKey){
          setSelectedIds(prev=>{const n=new Set(prev);n.has(snap.id)?n.delete(snap.id):n.add(snap.id);return n;});
          return;
        }
        setSelectedId(snap.id);
        setSelectedIds(new Set([snap.id]));
        isDraggingRef.current=true; dragIdRef.current=snap.id;
        setIsDragging(true); setDraggedId(snap.id);
        pushUndo();
      } else if(e.shiftKey){
        isBoxSelRef.current=true;
        boxSelStartRef.current={x:sx,y:sy};
        setBoxSel({x1:sx,y1:sy,x2:sx,y2:sy});
      } else {
        setSelectedId(null);
        setSelectedIds(new Set());
      }
      return;
    }

    if(curTool==='add'){
      const utm=s2u(sx,sy,vp);
      const segIns=findSegmentInsert(sx,sy,polyRef.current.map(id=>pointsRef.current.find(p=>p.id===id)!).filter(Boolean),vp);
      pushUndo();
      const newId=`pt_${Date.now()}_${ptCounterRef.current++}`;
      const raw=snap?{e:snap.e,n:snap.n}:snapToGrid(utm.e,utm.n);
      const newPt:GnssPoint={id:newId,name:`P${ptCounterRef.current}`,e:raw.e,n:raw.n,h:0,coordType:'UTM'};
      setPoints(prev=>[...prev,newPt]);
      setPolygonOrder(prev=>{
        if(segIns&&!snap){const nx=[...prev];nx.splice(segIns.idx,0,newId);return nx;}
        return [...prev,newId];
      });
      setSelectedId(newId);
      return;
    }

    if(curTool==='delete'){
      if(snap){
        pushUndo();
        setPoints(prev=>prev.filter(p=>p.id!==snap.id));
        setPolygonOrder(prev=>prev.filter(id=>id!==snap.id));
        setSelectedId(null);
      }
      return;
    }

    if(curTool==='measure'){
      const utm=snap?{e:snap.e,n:snap.n}:s2u(sx,sy,vp);
      setMeasurePts(prev=>{if(prev.length>=2) return [utm]; return [...prev,utm];});
      return;
    }

    if(curTool==='polyline'){
      const now=Date.now();
      const isDouble=now-lastClickTimeRef.current<320;
      lastClickTimeRef.current=now;
      const polyOsnap=findOSnap(sx,sy,pointsRef.current,drawObjectsRef.current,vp,dispRef.current.snapGrid,drawingIdRef.current);
      const raw=polyOsnap?{e:polyOsnap.e,n:polyOsnap.n}:s2u(sx,sy,vp);
      if(isDouble){
        finishDrawing();
        return;
      }
      // Auto-close: snap to first vertex triggers polygon closure
      if(polyOsnap?.type==='close'){
        closeDrawing();
        return;
      }
      const vtxId=`v_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
      if(!drawingIdRef.current){
        const newObjId=`obj_${Date.now()}`;
        const color=OBJ_COLORS[objColorIdxRef.current%OBJ_COLORS.length];
        objColorIdxRef.current++;
        const objIdx=drawObjectsRef.current.filter(o=>!drawingIdRef.current||o.id!==drawingIdRef.current).length+1;
        setDrawObjects(prev=>[...prev,{id:newObjId,name:`Polilinha ${objIdx}`,type:'polyline',vertices:[{id:vtxId,e:raw.e,n:raw.n}],color,strokeWidth:2,visible:true}]);
        setDrawingId(newObjId);
        setSelObjId(newObjId);
      } else {
        setDrawObjects(prev=>prev.map(o=>o.id===drawingIdRef.current?{...o,vertices:[...o.vertices,{id:vtxId,e:raw.e,n:raw.n}]}:o));
      }
      return;
    }

    if(curTool==='node'){
      const objNode=findNearestObjNode(sx,sy,drawObjectsRef.current,vp);
      if(objNode){
        setSelNode({objId:objNode.objId,vtxId:objNode.vtxId});
        setSelObjId(objNode.objId);
        isDragNodeRef.current=true;
      } else {
        const nearObj=findNearestObj(sx,sy,drawObjectsRef.current,vp);
        setSelObjId(nearObj?.id||null);
        setSelNode(null);
        isDragNodeRef.current=false;
      }
      return;
    }

    if(curTool==='erase-obj'){
      const nearObj=findNearestObj(sx,sy,drawObjectsRef.current,vp);
      if(nearObj){ deleteDrawObj(nearObj.id); showToast(`"${nearObj.name}" removida.`); }
      return;
    }
  },[orderedPoints,pushUndo,snapToGrid,finishDrawing,deleteDrawObj,showToast]);

  const handleMouseMove = useCallback((e:React.MouseEvent<SVGSVGElement>)=>{
    const {x:sx,y:sy}=getSvgXY(e);
    const vp=vpRef.current;
    const utm=s2u(sx,sy,vp);
    setCursorUTM(utm);

    if(isPanningRef.current&&panLastRef.current){
      const dx=sx-panLastRef.current.x, dy=sy-panLastRef.current.y;
      setViewport(prev=>({...prev,centerE:prev.centerE-dx/prev.ppm,centerN:prev.centerN+dy/prev.ppm}));
      panLastRef.current={x:sx,y:sy};
      return;
    }

    if(isBoxSelRef.current&&boxSelStartRef.current){
      setBoxSel({x1:boxSelStartRef.current.x,y1:boxSelStartRef.current.y,x2:sx,y2:sy});
      return;
    }

    if(isDraggingRef.current&&dragIdRef.current){
      const other=pointsRef.current.filter(p=>p.id!==dragIdRef.current);
      const snap=findSnap(sx,sy,other,vp);
      const rawUtm=s2u(sx,sy,vp);
      const target=snap?{e:snap.e,n:snap.n}:snapToGrid(rawUtm.e,rawUtm.n);
      setPoints(prev=>prev.map(p=>p.id===dragIdRef.current?{...p,e:target.e,n:target.n}:p));
      setEditField(prev=>prev&&prev.id===dragIdRef.current?{...prev,e:target.e.toFixed(3),n:target.n.toFixed(3)}:prev);
      return;
    }

    // Drag draw object node (use full OSnap for precise placement)
    if(isDragNodeRef.current&&selNodeRef.current){
      const sn=selNodeRef.current;
      const dragOsnap=findOSnap(sx,sy,pointsRef.current,drawObjectsRef.current,vp,dispRef.current.snapGrid,null);
      const target=dragOsnap?{e:dragOsnap.e,n:dragOsnap.n}:s2u(sx,sy,vp);
      setDrawObjects(prev=>prev.map(o=>o.id===sn.objId?{...o,vertices:o.vertices.map(v=>v.id===sn.vtxId?{...v,e:target.e,n:target.n}:v)}:o));
      return;
    }

    // Compute OSnap (visual indicator + rubberband)
    const osnap=findOSnap(sx,sy,pointsRef.current,drawObjectsRef.current,vp,dispRef.current.snapGrid,drawingIdRef.current);
    setActiveSnap(osnap);
    activeSnapRef.current=osnap;

    // Rubberband for polyline drawing
    if(drawingIdRef.current){
      setRubberBand(osnap?{e:osnap.e,n:osnap.n}:s2u(sx,sy,vp));
    }
  },[]);

  const handleMouseUp = useCallback(()=>{
    if(isBoxSelRef.current){
      isBoxSelRef.current=false;
      const box=boxSel;
      if(box){
        const vp=vpRef.current;
        const x1=Math.min(box.x1,box.x2),x2=Math.max(box.x1,box.x2);
        const y1=Math.min(box.y1,box.y2),y2=Math.max(box.y1,box.y2);
        if(x2-x1>4&&y2-y1>4){
          const inside=new Set<string>();
          for(const p of pointsRef.current){
            const sp=u2s(p.e,p.n,vp);
            if(sp.x>=x1&&sp.x<=x2&&sp.y>=y1&&sp.y<=y2) inside.add(p.id);
          }
          setSelectedIds(inside);
          if(inside.size===1){const id=[...inside][0];setSelectedId(id);}
          else if(inside.size>1){setSelectedId(null);showToast(`${inside.size} vértices selecionados.`);}
        }
      }
      setBoxSel(null); boxSelStartRef.current=null;
      return;
    }
    isPanningRef.current=false; panLastRef.current=null;
    if(isDraggingRef.current){
      isDraggingRef.current=false; dragIdRef.current=null;
      setIsDragging(false); setDraggedId(null);
    }
    if(isDragNodeRef.current) isDragNodeRef.current=false;
  },[boxSel,showToast]);

  const handleCanvasLeave = useCallback(()=>{
    setCursorUTM(null); setActiveSnap(null); activeSnapRef.current=null; setRubberBand(null);
    isPanningRef.current=false; panLastRef.current=null;
    if(isBoxSelRef.current){isBoxSelRef.current=false;setBoxSel(null);}
    if(isDraggingRef.current){isDraggingRef.current=false;dragIdRef.current=null;setIsDragging(false);setDraggedId(null);}
    if(isDragNodeRef.current) isDragNodeRef.current=false;
  },[]);

  /* ── Point actions ── */
  const startRename=(id:string,name:string)=>{setEditingPoint(id);setEditName(name);};
  const commitRename=(id:string)=>{setPoints(prev=>prev.map(p=>p.id===id?{...p,name:editName}:p));setEditingPoint(null);};
  const deletePoint=(id:string)=>{pushUndo();setPoints(prev=>prev.filter(p=>p.id!==id));setPolygonOrder(prev=>prev.filter(pid=>pid!==id));if(selectedId===id)setSelectedId(null);};
  const moveInOrder=(pid:string,dir:-1|1)=>{
    const idx=polygonOrder.indexOf(pid); if(idx<0) return;
    const next=[...polygonOrder],swap=idx+dir;
    if(swap<0||swap>=next.length) return;
    [next[idx],next[swap]]=[next[swap],next[idx]]; setPolygonOrder(next);
  };
  const invertPolygon=()=>{pushUndo();setPolygonOrder(prev=>[...prev].reverse());showToast('Sentido do polígono invertido.');};
  const deleteSelectedGroup=()=>{
    if(!selectedIds.size) return;
    pushUndo();
    setPoints(prev=>prev.filter(p=>!selectedIds.has(p.id)));
    setPolygonOrder(prev=>prev.filter(id=>!selectedIds.has(id)));
    setSelectedIds(new Set()); setSelectedId(null);
    showToast(`${selectedIds.size} vértices removidos.`);
  };

  /* ── Segment helpers ── */
  const segmentKey=(i:number)=>{const n=orderedPoints.length;return `${orderedPoints[i].id}-${orderedPoints[(i+1)%n].id}`;};
  const getConf=(key:string):Confrontante=>confrontantes[key]||{key,nome:'',tipo:'Linha'};
  const setConf=(key:string,field:keyof Confrontante,val:string)=>setConfrontantes(prev=>({...prev,[key]:{...getConf(key),[field]:val}}));

  /* ── Fit all ── */
  const fitAll=()=>{if(points.length) setViewport(fitViewport(points));};

  /* ── Export ODS ── */
  const exportOds=()=>{
    if(!points.length){showToast('Importe pontos antes de exportar.');return;}
    const wb=XLSX.utils.book_new();
    const hasQ=orderedPoints.some(p=>p.quality),hasR=orderedPoints.some(p=>p.rmsE!=null),hasS=orderedPoints.some(p=>p.samples!=null);
    const hdr=['Vértice','E (m)','N (m)','Alt (m)','Tipo',...(hasQ?['Qualidade']:[]),(hasR?['RMS E','RMS N','RMS H']:[]).flat(),...(hasS?['Amostras']:[])];
    const rows=orderedPoints.map(p=>[p.name,p.e,p.n,p.h,p.coordType,...(hasQ?[p.quality??'']:[]),...(hasR?[p.rmsE??'',p.rmsN??'',p.rmsH??'']:[[]]),...(hasS?[p.samples??'']:[])].flat());
    const ws1=XLSX.utils.aoa_to_sheet([hdr,...rows]);
    ws1['!cols']=[{wch:12},{wch:16},{wch:16},{wch:12},{wch:8},{wch:10},{wch:10},{wch:10},{wch:8}];
    XLSX.utils.book_append_sheet(wb,ws1,'Coordenadas');
    const hm=['De','Para','Azimute','Dist. (m)','Confrontante','Tipo','Situação'];
    const rm=orderedPoints.map((_,i)=>{const n=orderedPoints.length,next=orderedPoints[(i+1)%n],key=segmentKey(i),c=getConf(key);return [orderedPoints[i].name,next.name,calcAzStr(orderedPoints[i],next),segDist(orderedPoints[i],next).toFixed(2),c.nome,c.tipo,'Linha'];});
    const ws2=XLSX.utils.aoa_to_sheet([hm,...rm]);
    ws2['!cols']=[{wch:10},{wch:10},{wch:14},{wch:12},{wch:28},{wch:14},{wch:14}];
    XLSX.utils.book_append_sheet(wb,ws2,'Memorial Descritivo');
    const ws3=XLSX.utils.aoa_to_sheet([['RESUMO'],['Denominação',cadState.propertyName],['Proprietário',cadState.ownerName],['Município',cadState.municipality],['UF',cadState.uf],['INCRA',cadState.incraCode],['SIGEF',cadState.sigefCode],['Datum',cadState.datum],['Zona',cadState.zone],['Área (ha)',areaHa.toFixed(4)],['Perímetro (m)',perimeter.toFixed(2)],['Vértices',orderedPoints.length],['Técnico',cadState.technicianName],['CREA',cadState.technicianCrea],['Data',new Date().toLocaleDateString('pt-BR')]]);
    ws3['!cols']=[{wch:22},{wch:30}];
    XLSX.utils.book_append_sheet(wb,ws3,'Resumo');
    XLSX.writeFile(wb,`memorial-${cadState.propertyName||'imovel'}.ods`,{bookType:'ods'});
    showToast('Planilha ODS exportada.');
  };

  /* ── Export PDF ── */
  const exportPdf=async()=>{
    if(orderedPoints.length<3){showToast('São necessários pelo menos 3 vértices.');return;}
    setIsExportingPDF(true);
    try{
      const vertices=orderedPoints.map(p=>({name:p.name,e:p.e,n:p.n,h:p.h}));
      const segments=orderedPoints.map((pt,i)=>{const n=orderedPoints.length,next=orderedPoints[(i+1)%n],key=`${pt.id}-${next.id}`,c=getConf(key);return{fromName:pt.name,toName:next.name,azimuth:calcAzStr(pt,next),distance:segDist(pt,next),confrontante:c.nome,situation:c.tipo||'Linha'};});
      const blob=await pdf(<ConfrontacaoPDF {...cadState} areaHa={areaHa} perimeter={perimeter} vertices={vertices} segments={segments} date={new Date().toLocaleDateString('pt-BR')} />).toBlob();
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`confrontacao-${cadState.propertyName||'imovel'}.pdf`;
      document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
      showToast('PDF gerado com sucesso.');
    } catch{showToast('Erro ao gerar PDF.');}
    finally{setIsExportingPDF(false);}
  };

  /* ── Command line processor ── */
  const processCmd = useCallback((raw: string) => {
    const cmd = raw.trim(); if (!cmd) return;
    const upper = cmd.toUpperCase();
    const addMsg = (m: string) => setCmdHistory(prev => [...prev.slice(-39), m]);
    addMsg(`> ${cmd}`);
    const coordMatch = cmd.replace(/\s+/g,',').match(/^([0-9.-]+),([0-9.-]+)(?:,([0-9.-]*))?$/);
    if (coordMatch) {
      const e = parseFloat(coordMatch[1]), n = parseFloat(coordMatch[2]), h = parseFloat(coordMatch[3]||'0')||0;
      if (!isNaN(e) && !isNaN(n)) {
        pushUndo();
        const newId = `pt_${Date.now()}_${ptCounterRef.current++}`;
        const name = `P${ptCounterRef.current}`;
        setPoints(prev => [...prev, {id:newId,name,e,n,h,coordType:'UTM'}]);
        setPolygonOrder(prev => [...prev, newId]);
        setSelectedId(newId);
        addMsg(`Ponto ${name} adicionado — E:${e.toFixed(3)} N:${n.toFixed(3)}`);
        setCmdInput(''); return;
      }
    }
    if (upper==='F'||upper==='FIT') { fitAll(); addMsg('Enquadrar tudo.'); }
    else if (upper==='U'||upper==='UNDO') { undo(); addMsg('Desfazer.'); }
    else if (upper==='S') { setTool('select'); addMsg('Ferramenta: Selecionar'); }
    else if (upper==='A') { setTool('add'); addMsg('Ferramenta: Adicionar Vértice'); }
    else if (upper==='D') { setTool('delete'); addMsg('Ferramenta: Apagar Vértice'); }
    else if (upper==='M') { setTool('measure'); addMsg('Ferramenta: Medir'); }
    else if (upper==='P') { setTool('pan'); addMsg('Ferramenta: Vista'); }
    else if (upper==='L') { setTool('polyline'); addMsg('Ferramenta: Polilinha'); }
    else if (upper==='N') { setTool('node'); addMsg('Ferramenta: Nó'); }
    else if (upper==='ESC'||upper==='CANCEL') { if(drawingIdRef.current) cancelDrawing(); addMsg('Cancelado.'); }
    else { addMsg(`Comando desconhecido: ${cmd}. Tente E,N ou S/A/D/M/P/L/N/F/U.`); }
    setCmdInput('');
  }, [fitAll, undo, pushUndo, cancelDrawing, showToast]);

  /* ── SVG drawing data ── */
  const svgPts = orderedPoints.map(p=>u2s(p.e,p.n,viewport));
  const polygonPath = svgPts.length>1 ? svgPts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')+(svgPts.length>2?' Z':'') : '';

  const targetMeters=(SVG_W*0.12)/viewport.ppm;
  const {value:niceM,label:scaleLabel}=niceScale(targetMeters);
  const barPxW=niceM*viewport.ppm;

  const cursorStyle: Record<DrawTool,string> = {select:'default',add:'crosshair',delete:'no-drop',measure:'crosshair',pan:'grab',polyline:'crosshair',node:'cell','erase-obj':'no-drop'};

  const measureResult = measurePts.length===2 ? (()=>{
    const d=rawDist(measurePts[0],measurePts[1]);
    const az=calcAzDeg(measurePts[0],measurePts[1]);
    const deg=Math.floor(az),mT=(az-deg)*60,min=Math.floor(mT),sec=(mT-min)*60;
    return {d,azStr:`${String(deg).padStart(3,'0')}°${String(min).padStart(2,'0')}'${sec.toFixed(0).padStart(2,'0')}"`};
  })() : null;

  const tools: {id:DrawTool;icon:React.ReactNode;label:string;shortcut:string;color:string;group:string}[] = [
    {id:'select',    icon:<MousePointer size={15}/>, label:'Selecionar', shortcut:'S', color:'text-blue-600 bg-blue-50 border-blue-200',      group:'survey'},
    {id:'add',       icon:<PenLine      size={15}/>, label:'Vértice',    shortcut:'A', color:'text-emerald-600 bg-emerald-50 border-emerald-200', group:'survey'},
    {id:'delete',    icon:<Eraser       size={15}/>, label:'Apagar V.',  shortcut:'D', color:'text-red-500 bg-red-50 border-red-200',          group:'survey'},
    {id:'measure',   icon:<Ruler        size={15}/>, label:'Medir',      shortcut:'M', color:'text-amber-600 bg-amber-50 border-amber-200',    group:'survey'},
    {id:'pan',       icon:<Move         size={15}/>, label:'Vista',      shortcut:'P', color:'text-slate-600 bg-slate-100 border-slate-200',   group:'survey'},
    {id:'polyline',  icon:<PenLine      size={15}/>, label:'Polilinha',  shortcut:'L', color:'text-violet-600 bg-violet-50 border-violet-200', group:'feat'},
    {id:'node',      icon:<Crosshair    size={15}/>, label:'Nó',         shortcut:'N', color:'text-cyan-600 bg-cyan-50 border-cyan-200',       group:'feat'},
    {id:'erase-obj', icon:<Trash2       size={15}/>, label:'Apagar Feição', shortcut:'O', color:'text-rose-600 bg-rose-50 border-rose-200',   group:'feat'},
  ];
  const surveyTools = tools.filter(t=>t.group==='survey');
  const featTools   = tools.filter(t=>t.group==='feat');
  const drawingObj = drawObjects.find(o=>o.id===drawingId);

  /* ── Render ── */
  return (
    <div className={isFullscreen ? 'fixed inset-0 z-[200] flex flex-col overflow-hidden' : 'flex flex-col h-full overflow-hidden'} style={{background:'#1c1c1e',userSelect:'none'}} onClick={()=>openMenu&&setOpenMenu(null)}>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-700 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl animate-in slide-in-from-bottom-4 duration-300 flex items-center gap-2 max-w-sm border border-slate-600">
          <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" /> {toast}
        </div>
      )}

      {/* ── Coordinate Input Modal ── */}
      {showCoordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setShowCoordModal(false)}/>
          <div className="relative rounded-xl shadow-2xl border border-[#3d3d3d] p-5 w-full max-w-sm animate-in zoom-in-95 duration-200" style={{background:'#252526'}}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#1a9fff]/20 text-[#1a9fff] rounded-lg flex items-center justify-center"><Target size={14}/></div>
                <h3 className="font-bold text-[#cccccc] text-sm">Adicionar por Coordenadas</h3>
              </div>
              <button onClick={()=>setShowCoordModal(false)} className="w-6 h-6 flex items-center justify-center rounded text-[#888] hover:text-[#ccc] hover:bg-[#333]"><X size={13}/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1">Nome do Vértice</label>
                <input autoFocus value={coordInput.name} onChange={e=>setCoordInput(p=>({...p,name:e.target.value}))} placeholder={`P${ptCounterRef.current+1}`} className="w-full px-3 py-2 border border-[#3d3d3d] rounded-lg text-xs outline-none focus:border-[#1a9fff] bg-[#1e1e1e] text-[#cccccc]"/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1">E — Leste (m)</label>
                  <input value={coordInput.e} onChange={e=>setCoordInput(p=>({...p,e:e.target.value}))} placeholder="478060.000" className="w-full px-3 py-2 border border-[#3d3d3d] rounded-lg text-xs font-mono outline-none focus:border-[#1a9fff] bg-[#1e1e1e] text-[#cccccc]"/>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1">N — Norte (m)</label>
                  <input value={coordInput.n} onChange={e=>setCoordInput(p=>({...p,n:e.target.value}))} placeholder="8070814.000" className="w-full px-3 py-2 border border-[#3d3d3d] rounded-lg text-xs font-mono outline-none focus:border-[#1a9fff] bg-[#1e1e1e] text-[#cccccc]"/>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1">Altitude (m)</label>
                <input value={coordInput.h} onChange={e=>setCoordInput(p=>({...p,h:e.target.value}))} placeholder="0.000" className="w-full px-3 py-2 border border-[#3d3d3d] rounded-lg text-xs font-mono outline-none focus:border-[#1a9fff] bg-[#1e1e1e] text-[#cccccc]"/>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setShowCoordModal(false)} className="flex-1 py-2 rounded-lg text-xs font-bold transition-colors text-[#aaa] hover:bg-[#333] border border-[#3d3d3d]">Cancelar</button>
              <button onClick={addByCoord} disabled={!coordInput.e||!coordInput.n} className="flex-1 py-2 rounded-lg text-xs font-bold bg-[#1a9fff] text-white hover:bg-[#0d8fe8] transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"><Plus size={12}/> Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Traverse / Radiação Modal ── */}
      {showTraverseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setShowTraverseModal(false)}/>
          <div className="relative rounded-xl shadow-2xl border border-[#3d3d3d] p-5 w-full max-w-sm animate-in zoom-in-95 duration-200" style={{background:'#252526'}}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center"><Navigation size={14}/></div>
                <h3 className="font-bold text-[#cccccc] text-sm">Radiação / Travessa</h3>
              </div>
              <button onClick={()=>setShowTraverseModal(false)} className="w-6 h-6 flex items-center justify-center rounded text-[#888] hover:text-[#ccc] hover:bg-[#333]"><X size={13}/></button>
            </div>
            <p className="text-[10px] text-[#888] mb-3 -mt-1">Adiciona vértice a partir de azimute e distância.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1">Ponto de Origem</label>
                <select value={traverseInput.fromId} onChange={e=>setTraverseInput(p=>({...p,fromId:e.target.value}))} className="w-full px-3 py-2 border border-[#3d3d3d] rounded-lg text-xs outline-none focus:border-[#1a9fff] bg-[#1e1e1e] text-[#cccccc]">
                  <option value="">— Último ponto —</option>
                  {orderedPoints.map(p=><option key={p.id} value={p.id}>{p.name} (E:{p.e.toFixed(1)} N:{p.n.toFixed(1)})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1">Azimute (GGG°MM'SS" ou decimal)</label>
                <input autoFocus value={traverseInput.az} onChange={e=>setTraverseInput(p=>({...p,az:e.target.value}))} placeholder="45.5 ou 45°30'00&quot;" className="w-full px-3 py-2 border border-[#3d3d3d] rounded-lg text-xs font-mono outline-none focus:border-[#1a9fff] bg-[#1e1e1e] text-[#cccccc]"/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1">Distância (m)</label>
                  <input value={traverseInput.dist} onChange={e=>setTraverseInput(p=>({...p,dist:e.target.value}))} placeholder="125.000" className="w-full px-3 py-2 border border-[#3d3d3d] rounded-lg text-xs font-mono outline-none focus:border-[#1a9fff] bg-[#1e1e1e] text-[#cccccc]"/>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1">Altitude (m)</label>
                  <input value={traverseInput.h} onChange={e=>setTraverseInput(p=>({...p,h:e.target.value}))} placeholder="0.000" className="w-full px-3 py-2 border border-[#3d3d3d] rounded-lg text-xs font-mono outline-none focus:border-[#1a9fff] bg-[#1e1e1e] text-[#cccccc]"/>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1">Nome do novo vértice</label>
                <input value={traverseInput.name} onChange={e=>setTraverseInput(p=>({...p,name:e.target.value}))} placeholder={`P${ptCounterRef.current+1}`} className="w-full px-3 py-2 border border-[#3d3d3d] rounded-lg text-xs outline-none focus:border-[#1a9fff] bg-[#1e1e1e] text-[#cccccc]"/>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setShowTraverseModal(false)} className="flex-1 py-2 rounded-lg text-xs font-bold transition-colors text-[#aaa] hover:bg-[#333] border border-[#3d3d3d]">Cancelar</button>
              <button onClick={addByTraverse} disabled={!traverseInput.az||!traverseInput.dist} className="flex-1 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"><Calculator size={12}/> Calcular</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Menu Bar ── */}
      <div className="h-7 flex items-center px-2 gap-0.5 flex-shrink-0 select-none" style={{background:'#3c3c3c',borderBottom:'1px solid #2a2a2a'}}>
        <div className="flex items-center gap-1 mr-2">
          <div className="w-5 h-5 bg-[#1a9fff] rounded flex items-center justify-center flex-shrink-0"><Layers size={11} className="text-white"/></div>
          <span className="text-[#cccccc] text-[11px] font-bold tracking-wide">GeoCAD</span>
        </div>
        {(['Arquivo','Editar','Exibir','Inserir','Ferramentas'] as const).map(menu=>(
          <div key={menu} className="relative">
            <button onClick={e=>{e.stopPropagation();setOpenMenu(openMenu===menu?null:menu);}}
              className={`px-2.5 h-6 text-[11px] rounded transition-colors ${openMenu===menu?'bg-[#1a9fff] text-white':'text-[#cccccc] hover:bg-[#4a4a4a]'}`}>{menu}</button>
            {openMenu===menu && (
              <div className="absolute top-full left-0 mt-0.5 z-50 rounded shadow-2xl border border-[#3d3d3d] py-1 min-w-44" style={{background:'#252526'}} onClick={e=>e.stopPropagation()}>
                {menu==='Arquivo' && (<>
                  <button onClick={()=>{fileInputRef.current?.click();setOpenMenu(null);}} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] flex items-center gap-2"><Upload size={11}/> Importar CSV/TXT</button>
                  <button onClick={()=>{cadFileInputRef.current?.click();setOpenMenu(null);}} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] flex items-center gap-2"><FileCode2 size={11}/> Importar DXF/XML</button>
                  <div className="border-t border-[#3d3d3d] my-1"/>
                  <button onClick={()=>{exportDxf();setOpenMenu(null);}} disabled={orderedPoints.length<2} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] disabled:opacity-40 flex items-center gap-2"><FileCode2 size={11}/> Exportar DXF</button>
                  <button onClick={()=>{exportOds();setOpenMenu(null);}} disabled={!points.length} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] disabled:opacity-40 flex items-center gap-2"><FileSpreadsheet size={11}/> Exportar ODS</button>
                  <button onClick={()=>{exportSigefXml();setOpenMenu(null);}} disabled={orderedPoints.length<3} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] disabled:opacity-40 flex items-center gap-2"><Shield size={11}/> Exportar SIGEF XML</button>
                  <button onClick={()=>{exportMemorialDocx();setOpenMenu(null);}} disabled={orderedPoints.length<3||isExportingDOCX} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] disabled:opacity-40 flex items-center gap-2"><Download size={11}/> Memorial DOCX</button>
                </>)}
                {menu==='Editar' && (<>
                  <button onClick={()=>{undo();setOpenMenu(null);}} disabled={!undoStack.length} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] disabled:opacity-40 flex items-center gap-2"><Undo2 size={11}/> Desfazer  Ctrl+Z</button>
                  <button onClick={()=>{invertPolygon();setOpenMenu(null);}} disabled={orderedPoints.length<3} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] disabled:opacity-40 flex items-center gap-2"><RotateCcw size={11}/> Inverter sentido</button>
                  <div className="border-t border-[#3d3d3d] my-1"/>
                  <button onClick={()=>{setShowCoordModal(true);setOpenMenu(null);}} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] flex items-center gap-2"><Target size={11}/> Por Coord.  Ctrl+K</button>
                  <button onClick={()=>{setShowTraverseModal(true);setOpenMenu(null);}} disabled={!orderedPoints.length} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] disabled:opacity-40 flex items-center gap-2"><Navigation size={11}/> Radiação  R</button>
                </>)}
                {menu==='Exibir' && (<>
                  {([['fill','Preenchimento'],['labels','Rótulos'],['distances','Distâncias'],['arrows','Setas dir.'],['grid','Grade'],['gridCoords','Coords grade'],['areaLabel','Rótulo área'],['northArrow','Seta Norte'],['scaleBar','Escala']] as [keyof DispOpts,string][]).map(([k,l])=>(
                    <button key={k} onClick={()=>setDisp(prev=>({...prev,[k]:!prev[k]}))} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] flex items-center gap-2">
                      <div className={`w-3 h-3 rounded border ${disp[k]?'bg-[#1a9fff] border-[#1a9fff]':'border-[#666]'}`}/>{l}</button>
                  ))}
                  <div className="border-t border-[#3d3d3d] my-1"/>
                  <button onClick={()=>{fitAll();setOpenMenu(null);}} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] flex items-center gap-2"><Maximize2 size={11}/> Enquadrar  F</button>
                </>)}
                {menu==='Inserir' && (<>
                  <button onClick={()=>{setTool('add');setOpenMenu(null);}} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] flex items-center gap-2"><PenLine size={11}/> Vértice GNSS  A</button>
                  <button onClick={()=>{setTool('polyline');setOpenMenu(null);}} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] flex items-center gap-2"><PenLine size={11}/> Polilinha  L</button>
                  <button onClick={()=>{setShowCoordModal(true);setOpenMenu(null);}} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] flex items-center gap-2"><Target size={11}/> Por Coordenada</button>
                </>)}
                {menu==='Ferramentas' && (<>
                  <button onClick={()=>{runSigefValidation();setOpenMenu(null);}} disabled={orderedPoints.length<3} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] disabled:opacity-40 flex items-center gap-2"><Shield size={11}/> Validar SIGEF</button>
                  <button onClick={()=>{setTool('measure');setOpenMenu(null);}} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] flex items-center gap-2"><Ruler size={11}/> Medir  M</button>
                  <div className="border-t border-[#3d3d3d] my-1"/>
                  <button onClick={()=>{setRightPanelTab('relatorio');setRightPanelOpen(true);setOpenMenu(null);}} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] flex items-center gap-2"><FileText size={11}/> Dados do Imóvel</button>
                  <button onClick={()=>{setRightPanelTab('confrontantes');setRightPanelOpen(true);setOpenMenu(null);}} className="w-full px-4 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#1a9fff] flex items-center gap-2"><Table2 size={11}/> Confrontantes</button>
                </>)}
              </div>
            )}
          </div>
        ))}
        <div className="ml-auto flex items-center gap-3 text-[10px] text-[#888] font-mono pr-1">
          {points.length>0 && <><span className="text-[#1a9fff]">{orderedPoints.length} verts</span><span>{areaHa.toFixed(4)} ha</span><span>{perimeter.toFixed(1)} m</span></>}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="h-9 flex items-center px-1 gap-0.5 flex-shrink-0" style={{background:'#2d2d2d',borderBottom:'1px solid #1a1a1a'}}>
        <input ref={fileInputRef} type="file" accept=".csv,.txt,.xyz" className="hidden" onChange={handleFileImport}/>
        <input ref={cadFileInputRef} type="file" accept=".dxf,.xml,.landxml" className="hidden" onChange={handleCadFileImport}/>
        <div className="flex items-center gap-0.5 pr-2 mr-1" style={{borderRight:'1px solid #444'}}>
          <button onClick={()=>fileInputRef.current?.click()} title="Importar CSV" className="w-7 h-7 flex items-center justify-center rounded text-[#aaa] hover:bg-[#1a9fff] hover:text-white transition-colors"><Upload size={14}/></button>
          <button onClick={()=>cadFileInputRef.current?.click()} title="Importar DXF/XML" className="w-7 h-7 flex items-center justify-center rounded text-[#aaa] hover:bg-[#444] transition-colors"><FileCode2 size={14}/></button>
        </div>
        <div className="flex items-center gap-0.5 pr-2 mr-1" style={{borderRight:'1px solid #444'}}>
          {surveyTools.map(t=>(
            <button key={t.id} onClick={()=>setTool(t.id)} title={`${t.label} [${t.shortcut}]`}
              className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${tool===t.id?'bg-[#1a9fff] text-white':'text-[#aaa] hover:bg-[#444] hover:text-[#eee]'}`}>{t.icon}</button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 pr-2 mr-1" style={{borderRight:'1px solid #444'}}>
          {featTools.map(t=>(
            <button key={t.id} onClick={()=>{if(drawingIdRef.current&&t.id!=='polyline')cancelDrawing();setTool(t.id);}} title={`${t.label} [${t.shortcut}]`}
              className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${tool===t.id?'bg-[#1a9fff] text-white':'text-[#aaa] hover:bg-[#444] hover:text-[#eee]'}`}>{t.icon}</button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 pr-2 mr-1" style={{borderRight:'1px solid #444'}}>
          <button onClick={()=>setShowCoordModal(true)} title="Por Coord [Ctrl+K]" className="w-7 h-7 flex items-center justify-center rounded text-[#aaa] hover:bg-[#444] transition-colors"><Target size={14}/></button>
          <button onClick={()=>setShowTraverseModal(true)} disabled={!orderedPoints.length} title="Radiação [R]" className="w-7 h-7 flex items-center justify-center rounded text-[#aaa] hover:bg-[#444] transition-colors disabled:opacity-30"><Navigation size={14}/></button>
        </div>
        <div className="flex items-center gap-0.5 pr-2 mr-1" style={{borderRight:'1px solid #444'}}>
          <button onClick={()=>setViewport(prev=>({...prev,ppm:prev.ppm*1.25}))} title="Zoom +" disabled={showMapView} className="w-7 h-7 flex items-center justify-center rounded text-[#aaa] hover:bg-[#444] transition-colors disabled:opacity-30"><ZoomIn size={14}/></button>
          <button onClick={()=>setViewport(prev=>({...prev,ppm:prev.ppm*0.8}))} title="Zoom -" disabled={showMapView} className="w-7 h-7 flex items-center justify-center rounded text-[#aaa] hover:bg-[#444] transition-colors disabled:opacity-30"><ZoomOut size={14}/></button>
          <button onClick={fitAll} title="Enquadrar [F]" disabled={showMapView} className="w-7 h-7 flex items-center justify-center rounded text-[#aaa] hover:bg-[#444] transition-colors disabled:opacity-30"><Maximize2 size={14}/></button>
          <button onClick={undo} disabled={!undoStack.length||showMapView} title="Desfazer [Ctrl+Z]" className="w-7 h-7 flex items-center justify-center rounded text-[#aaa] hover:bg-[#444] transition-colors disabled:opacity-30"><Undo2 size={14}/></button>
          <button onClick={invertPolygon} title="Inverter" disabled={showMapView||orderedPoints.length<3} className="w-7 h-7 flex items-center justify-center rounded text-[#aaa] hover:bg-[#444] transition-colors disabled:opacity-30"><RotateCcw size={14}/></button>
        </div>
        <div className="flex items-center gap-0.5 pr-2 mr-1" style={{borderRight:'1px solid #444'}}>
          <button onClick={()=>setDisp(p=>({...p,grid:!p.grid}))} title="Grade" className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${disp.grid?'bg-[#1a9fff] text-white':'text-[#aaa] hover:bg-[#444]'}`}><Grid3x3 size={14}/></button>
          <button onClick={()=>setDisp(p=>({...p,labels:!p.labels}))} title="Rótulos" className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${disp.labels?'bg-[#1a9fff] text-white':'text-[#aaa] hover:bg-[#444]'}`}><Tag size={14}/></button>
          <button onClick={()=>setDisp(p=>({...p,distances:!p.distances}))} title="Distâncias" className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${disp.distances?'bg-[#1a9fff] text-white':'text-[#aaa] hover:bg-[#444]'}`}><Ruler size={14}/></button>
          <button onClick={()=>setDisp(p=>({...p,fill:!p.fill}))} title="Preenchimento" className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${disp.fill?'bg-[#1a9fff] text-white':'text-[#aaa] hover:bg-[#444]'}`}><Layers size={14}/></button>
          <button onClick={()=>setDisp(p=>({...p,snapGrid:!p.snapGrid}))} title="Snap grade" className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${disp.snapGrid?'bg-[#1a9fff] text-white':'text-[#aaa] hover:bg-[#444]'}`}><Crosshair size={14}/></button>
        </div>
        <button onClick={()=>setShowMapView(v=>!v)} title={showMapView?'CAD Vetorial':'Mapa Leaflet'} className={`flex items-center gap-1 px-2 h-7 rounded text-[11px] font-bold transition-colors ${showMapView?'bg-emerald-600 text-white':'text-[#aaa] hover:bg-[#444] border border-[#3d3d3d]'}`}>
          <Map size={13}/><span className="hidden xl:inline ml-1">{showMapView?'CAD':'Mapa'}</span>
        </button>
        {drawingObj && (
          <div className="flex items-center gap-1.5 ml-2 px-2 h-7 rounded border text-[11px] font-bold animate-pulse" style={{backgroundColor:drawingObj.color+'22',borderColor:drawingObj.color+'55',color:drawingObj.color}}>
            <PenLine size={12}/>{drawingObj.name}·{drawingObj.vertices.length}pts
            <button onClick={finishDrawing} className="px-1 rounded text-[10px]" style={{background:'rgba(0,0,0,0.3)'}}>↵</button>
            <button onClick={()=>{if(drawingObj.vertices.length>=3)closeDrawing();else cancelDrawing();}} className="px-1 rounded text-[10px]" style={{background:'rgba(0,0,0,0.3)'}}>C⬡</button>
            <button onClick={cancelDrawing} className="opacity-60 hover:opacity-100"><X size={10}/></button>
          </div>
        )}
        {measureResult && (
          <div className="flex items-center gap-2 ml-2 px-2 h-7 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[10px] font-bold">
            <Ruler size={12}/>{measureResult.d.toFixed(3)}m·{measureResult.azStr}
            <button onClick={()=>setMeasurePts([])} className="text-amber-400 hover:text-amber-200"><X size={10}/></button>
          </div>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <button onClick={()=>setRightPanelOpen(v=>!v)} title="Painel direito" className={`w-7 h-7 flex items-center justify-center rounded text-[#aaa] hover:bg-[#444] transition-colors ${rightPanelOpen?'bg-[#3d3d3d]':''}`}><PanelRight size={14}/></button>
          <button onClick={()=>setIsFullscreen(v=>!v)} title={isFullscreen?'Restaurar [F11]':'Expandir tela cheia [F11]'} className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${isFullscreen?'bg-[#1a9fff] text-white hover:bg-[#0d8fe8]':'text-[#aaa] hover:bg-[#444]'}`}>
            {isFullscreen ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
          </button>
        </div>
      </div>

      {/* ── Main work area ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Left Panel ── */}
        <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{width:200,background:'#252526',borderRight:'1px solid #1a1a1a'}}>
          <div className="flex flex-shrink-0" style={{background:'#2d2d2d',borderBottom:'1px solid #1a1a1a'}}>
            {([{id:'feicoes',label:'Feições'},{id:'pontos',label:'Pontos'}] as const).map(t=>(
              <button key={t.id} onClick={()=>setLeftPanelTab(t.id)} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${leftPanelTab===t.id?'text-[#cccccc] border-b-2 border-[#1a9fff]':'text-[#666] hover:text-[#aaa]'}`}>{t.label}</button>
            ))}
          </div>
          {leftPanelTab==='feicoes' && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1.5 flex-shrink-0" style={{borderBottom:'1px solid #1a1a1a'}}>
                <span className="text-[9px] font-bold uppercase text-[#555] tracking-widest">Feições ({drawObjects.length})</span>
                <button onClick={()=>{setTool('polyline');if(drawingIdRef.current)cancelDrawing();}} title="Nova polilinha [L]" className="w-5 h-5 flex items-center justify-center rounded text-[#1a9fff] hover:bg-[#1a9fff]/20"><Plus size={11}/></button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {drawObjects.length===0 && <div className="px-3 py-6 text-center text-[9px] text-[#555]">Nenhuma feição.<br/>Use <kbd className="bg-[#333] text-[#ccc] px-1 rounded text-[8px]">L</kbd>.</div>}
                {drawObjects.map(obj=>(
                  <div key={obj.id} className={`px-2 py-1.5 cursor-pointer transition-colors ${selObjId===obj.id?'bg-[#1a9fff]/15':'hover:bg-[#2a2a2a]'}`} style={{borderBottom:'1px solid #1a1a1a'}} onClick={()=>setSelObjId(selObjId===obj.id?null:obj.id)}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{backgroundColor:obj.color}}/>
                      {renamingObjId===obj.id
                        ? <input autoFocus value={renameObjVal} onChange={e=>setRenameObjVal(e.target.value)} onBlur={()=>{setDrawObjects(prev=>prev.map(o=>o.id===obj.id?{...o,name:renameObjVal}:o));setRenamingObjId(null);}} onKeyDown={e=>{if(e.key==='Enter'||e.key==='Escape'){setDrawObjects(prev=>prev.map(o=>o.id===obj.id?{...o,name:renameObjVal}:o));setRenamingObjId(null);}}} className="flex-1 min-w-0 text-[10px] font-bold border border-[#1a9fff] rounded px-1 py-0.5 bg-[#1e1e1e] text-[#ccc] outline-none" onClick={e=>e.stopPropagation()}/>
                        : <span className="flex-1 min-w-0 text-[10px] font-bold text-[#cccccc] truncate" onDoubleClick={e=>{e.stopPropagation();setRenamingObjId(obj.id);setRenameObjVal(obj.name);}}>{obj.name}</span>
                      }
                      <button onClick={e=>{e.stopPropagation();setDrawObjects(prev=>prev.map(o=>o.id===obj.id?{...o,visible:!o.visible}:o));}} className="text-[#555] hover:text-[#aaa]">{obj.visible?<Eye size={10}/>:<Eye size={10} className="opacity-40"/>}</button>
                      <button onClick={e=>{e.stopPropagation();deleteDrawObj(obj.id);}} className="text-[#555] hover:text-red-400"><X size={10}/></button>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[8px] text-[#555]">{obj.type==='polygon-area'?'Pol.':'Lin.'} · {obj.vertices.length}</span>
                      <div className="flex gap-0.5 ml-auto">{OBJ_COLORS.slice(0,5).map(c=>(<button key={c} onClick={e=>{e.stopPropagation();setDrawObjects(prev=>prev.map(o=>o.id===obj.id?{...o,color:c}:o));}} className={`w-3 h-3 rounded-sm ${obj.color===c?'ring-1 ring-white':''}`} style={{backgroundColor:c}}/>))}</div>
                    </div>
                    {selObjId===obj.id && (
                      <div className="mt-1 flex gap-1">
                        <button onClick={e=>{e.stopPropagation();setDrawObjects(prev=>prev.map(o=>o.id===obj.id?{...o,type:'polyline'}:o));}} className={`flex-1 text-[8px] font-bold py-0.5 rounded border ${obj.type==='polyline'?'bg-[#1a9fff]/20 text-[#1a9fff] border-[#1a9fff]/40':'text-[#555] border-[#333]'}`}>Polilinha</button>
                        <button onClick={e=>{e.stopPropagation();setDrawObjects(prev=>prev.map(o=>o.id===obj.id?{...o,type:'polygon-area'}:o));}} className={`flex-1 text-[8px] font-bold py-0.5 rounded border ${obj.type==='polygon-area'?'bg-[#1a9fff]/20 text-[#1a9fff] border-[#1a9fff]/40':'text-[#555] border-[#333]'}`}>Polígono</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {leftPanelTab==='pontos' && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1.5 flex-shrink-0" style={{borderBottom:'1px solid #1a1a1a'}}>
                <span className="text-[9px] font-bold uppercase text-[#555] tracking-widest">Vértices ({orderedPoints.length})</span>
                <button onClick={()=>setShowCoordModal(true)} title="Adicionar" className="w-5 h-5 flex items-center justify-center rounded text-[#1a9fff] hover:bg-[#1a9fff]/20"><Plus size={11}/></button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {orderedPoints.length===0 && <div className="px-3 py-6 text-center text-[9px] text-[#555]">Nenhum ponto.<br/>Importe CSV ou adicione por coordenada.</div>}
                {polygonOrder.map((pid,idx)=>{
                  const pt=points.find(p=>p.id===pid)!; if(!pt) return null;
                  return (
                    <div key={pt.id} className={`px-2 py-1.5 cursor-pointer transition-colors ${selectedId===pt.id?'bg-[#1a9fff]/15':'hover:bg-[#2a2a2a]'}`} style={{borderBottom:'1px solid #1a1a1a'}} onClick={()=>setSelectedId(pt.id)}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] text-[#555] w-4 text-right font-mono">{idx+1}</span>
                        <span className="text-[10px] font-bold text-[#1a9fff]">{pt.name}</span>
                        <div className="flex gap-0.5 ml-auto">
                          <button onClick={e=>{e.stopPropagation();moveInOrder(pid,-1);}} disabled={idx===0} className="w-4 h-4 flex items-center justify-center rounded text-[#555] hover:text-[#aaa] disabled:opacity-20"><ChevronDown size={8} className="rotate-180"/></button>
                          <button onClick={e=>{e.stopPropagation();moveInOrder(pid,1);}} disabled={idx===polygonOrder.length-1} className="w-4 h-4 flex items-center justify-center rounded text-[#555] hover:text-[#aaa] disabled:opacity-20"><ChevronDown size={8}/></button>
                          <button onClick={e=>{e.stopPropagation();deletePoint(pt.id);}} className="w-4 h-4 flex items-center justify-center rounded text-[#555] hover:text-red-400"><Trash2 size={8}/></button>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-0.5 pl-5">
                        <span className="text-[8px] font-mono text-[#555]">E:{pt.e.toFixed(1)}</span>
                        <span className="text-[8px] font-mono text-[#555]">N:{pt.n.toFixed(1)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {orderedPoints.length>1 && (
                <div className="flex-shrink-0 px-3 py-2 space-y-1" style={{borderTop:'1px solid #1a1a1a'}}>
                  <div className="flex justify-between text-[9px]"><span className="text-[#888]">Área</span><span className="font-mono text-[#cccccc]">{areaHa.toFixed(4)} ha</span></div>
                  <div className="flex justify-between text-[9px]"><span className="text-[#888]">Perímetro</span><span className="font-mono text-[#cccccc]">{perimeter.toFixed(1)} m</span></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Canvas ── */}
        <div className="flex-1 relative overflow-hidden min-h-0" style={{background:'#1a1e25'}}>
          {!points.length && !showMapView && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{background:'rgba(26,159,255,0.08)'}}><Upload size={28} className="text-[#1a9fff]/40"/></div>
              <div className="text-center"><p className="text-sm font-bold text-[#555]">Área de trabalho vazia</p><p className="text-[11px] text-[#444] mt-1">Importe um CSV ou adicione pontos</p></div>
              <div className="flex gap-2 flex-wrap justify-center">
                <button onClick={()=>fileInputRef.current?.click()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#1a9fff] text-white hover:bg-[#0d8fe8]"><Upload size={12}/> CSV</button>
                <button onClick={()=>cadFileInputRef.current?.click()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-[#aaa] hover:bg-[#333] border border-[#3d3d3d]"><FileCode2 size={12}/> DXF/XML</button>
                <button onClick={()=>setShowCoordModal(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-[#aaa] hover:bg-[#333] border border-[#3d3d3d]"><Target size={12}/> Coordenada</button>
              </div>
            </div>
          )}
          {showMapView && (
            <div className="absolute inset-0">
              <Suspense fallback={<div className="w-full h-full flex items-center justify-center" style={{background:'#1a1e25'}}><div className="flex items-center gap-2 text-[#555] text-sm"><Loader2 size={18} className="animate-spin text-[#1a9fff]"/> Carregando mapa…</div></div>}>
                <LeafletMapView points={points} polygonOrder={polygonOrder} drawObjects={drawObjects} zone={cadState.zone} onFeaturesChange={handleLeafletFeatures}/>
              </Suspense>
            </div>
          )}
          <svg ref={canvasRef} viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" height="100%"
            style={{cursor:(isDragging||isPanningRef.current)?'grabbing':cursorStyle[tool],display:showMapView?'none':'block'}}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleCanvasLeave}>
            <rect width={SVG_W} height={SVG_H} fill="#1a1e25"/>
            {disp.grid && (()=>{
              const gridMeters=niceScale(100/viewport.ppm).value;
              const gridPx=gridMeters*viewport.ppm;
              if(gridPx<8||gridPx>300) return null;
              const centerSvg=u2s(viewport.centerE,viewport.centerN,viewport);
              const startX=centerSvg.x%gridPx-gridPx, startY=centerSvg.y%gridPx-gridPx;
              const linesX: number[]=[], linesY: number[]=[];
              for(let x=startX;x<SVG_W+gridPx;x+=gridPx) linesX.push(x);
              for(let y=startY;y<SVG_H+gridPx;y+=gridPx) linesY.push(y);
              return (<g>
                <g opacity="0.5">
                  {linesX.map((x,i)=><line key={`gx${i}`} x1={x} y1={0} x2={x} y2={SVG_H} stroke="rgba(80,100,140,0.5)" strokeWidth="0.5"/>)}
                  {linesY.map((y,i)=><line key={`gy${i}`} x1={0} y1={y} x2={SVG_W} y2={y} stroke="rgba(80,100,140,0.5)" strokeWidth="0.5"/>)}
                </g>
                {disp.gridCoords && linesX.map((x,i)=>{const utm=s2u(x,SVG_H/2,viewport);return <text key={`gcx${i}`} x={x} y={SVG_H-4} textAnchor="middle" fontSize="6" fill="rgba(80,100,140,0.7)" fontFamily="monospace">{utm.e.toFixed(0)}</text>;})}
                {disp.gridCoords && linesY.map((y,i)=>{const utm=s2u(SVG_W/2,y,viewport);return <text key={`gcy${i}`} x={4} y={y+3} fontSize="6" fill="rgba(80,100,140,0.7)" fontFamily="monospace">{utm.n.toFixed(0)}</text>;})}
              </g>);
            })()}
            {drawObjects.map(obj=>{
              if(!obj.visible||obj.vertices.length<1) return null;
              const svs=obj.vertices.map(v=>u2s(v.e,v.n,viewport));
              const isActive=obj.id===drawingId, isSel=selObjId===obj.id;
              const pathD=svs.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')+(obj.type==='polygon-area'&&svs.length>2?' Z':'');
              const rbPt=isActive&&rubberBand?u2s(rubberBand.e,rubberBand.n,viewport):null;
              const lastSv=svs[svs.length-1];
              return (<g key={obj.id}>
                {obj.type==='polygon-area'&&svs.length>2&&<path d={pathD} fill={obj.color+'20'} stroke="none"/>}
                {isSel&&svs.length>1&&<path d={pathD} fill="none" stroke={obj.color} strokeWidth={obj.strokeWidth+6} strokeOpacity="0.15"/>}
                {svs.length>1&&<path d={pathD} fill="none" stroke={obj.color} strokeWidth={obj.strokeWidth} strokeLinejoin="round" strokeLinecap="round"/>}
                {obj.type==='polygon-area'&&obj.vertices.length>=3&&!isActive&&(()=>{
                  const objArea=calcDrawObjArea(obj.vertices), objCent=drawObjCentroid(obj.vertices), sc=u2s(objCent.e,objCent.n,viewport);
                  const label=`${objArea.toFixed(4)} ha`, w=label.length*5.2+12;
                  return (<g><rect x={sc.x-w/2} y={sc.y-11} width={w} height="15" rx="4" fill="rgba(0,0,0,0.5)" stroke={obj.color+'66'} strokeWidth="0.8"/><text x={sc.x} y={sc.y+1} textAnchor="middle" fontSize="9" fill={obj.color} fontWeight="bold" fontFamily="Helvetica">{label}</text></g>);
                })()}
                {isActive&&rbPt&&lastSv&&<line x1={lastSv.x} y1={lastSv.y} x2={rbPt.x} y2={rbPt.y} stroke={obj.color} strokeWidth={obj.strokeWidth} strokeDasharray="6 4" opacity="0.7"/>}
                {svs.map((sv,i)=>{
                  const vtx=obj.vertices[i], isSelNode=selNode?.objId===obj.id&&selNode?.vtxId===vtx.id;
                  if(!((tool==='node'&&isSel)||isActive)) return null;
                  return (<g key={vtx.id}>{isSelNode&&<circle cx={sv.x} cy={sv.y} r={8} fill="none" stroke={obj.color} strokeWidth="1.5" strokeDasharray="3 2"/>}<rect x={sv.x-4} y={sv.y-4} width="8" height="8" rx="1.5" fill={isSelNode?obj.color:'#1a1e25'} stroke={obj.color} strokeWidth="1.5" style={{cursor:'move'}}/></g>);
                })}
                {svs.length>0&&!isActive&&<circle cx={svs[0].x} cy={svs[0].y} r={3} fill={obj.color} opacity="0.7"/>}
                {isActive&&rbPt&&<circle cx={rbPt.x} cy={rbPt.y} r={5} fill={obj.color} opacity="0.5" stroke="#1a1e25" strokeWidth="1"/>}
              </g>);
            })}
            {disp.fill&&polygonPath&&svgPts.length>2&&<path d={polygonPath} fill="rgba(34,197,94,0.07)" stroke="none"/>}
            {orderedPoints.length>1&&orderedPoints.map((pt,i)=>{
              const n=orderedPoints.length, next=orderedPoints[(i+1)%n];
              const pa=u2s(pt.e,pt.n,viewport), pb=u2s(next.e,next.n,viewport);
              const mx=(pa.x+pb.x)/2, my=(pa.y+pb.y)/2, dist=segDist(pt,next);
              const ang=Math.atan2(pb.y-pa.y,pb.x-pa.x)*180/Math.PI, normAng=ang>90||ang<-90?ang+180:ang;
              const segLen=Math.hypot(pb.x-pa.x,pb.y-pa.y);
              const arrowT=0.55, ax=pa.x+(pb.x-pa.x)*arrowT, ay=pa.y+(pb.y-pa.y)*arrowT, arrowAng=Math.atan2(pb.y-pa.y,pb.x-pa.x), as=6;
              return (<g key={`seg-${pt.id}`}>
                <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#22c55e" strokeWidth="1.5"/>
                {disp.arrows&&segLen>20&&<polygon points={`${ax+Math.cos(arrowAng)*as},${ay+Math.sin(arrowAng)*as} ${ax+Math.cos(arrowAng+2.4)*as*0.5},${ay+Math.sin(arrowAng+2.4)*as*0.5} ${ax+Math.cos(arrowAng-2.4)*as*0.5},${ay+Math.sin(arrowAng-2.4)*as*0.5}`} fill="#22c55e" opacity="0.8"/>}
                {disp.distances&&segLen>35&&<g transform={`translate(${mx},${my}) rotate(${normAng})`}><rect x="-22" y="-9" width="44" height="10" rx="2" fill="rgba(0,0,0,0.65)"/><text textAnchor="middle" fontSize="7" fill="#86efac" fontFamily="monospace" y="0">{dist.toFixed(2)}m</text></g>}
              </g>);
            })}
            {orderedPoints.length>2&&(()=>{const a=u2s(orderedPoints[orderedPoints.length-1].e,orderedPoints[orderedPoints.length-1].n,viewport),b=u2s(orderedPoints[0].e,orderedPoints[0].n,viewport);return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.4"/>;})()}
            {disp.areaLabel&&centroid&&orderedPoints.length>=3&&(()=>{const sc=u2s(centroid.e,centroid.n,viewport),label=`${areaHa.toFixed(4)} ha`,w=label.length*5.2+12;return(<g><rect x={sc.x-w/2} y={sc.y-11} width={w} height="15" rx="4" fill="rgba(0,0,0,0.5)" stroke="rgba(34,197,94,0.4)" strokeWidth="0.8"/><text x={sc.x} y={sc.y+1} textAnchor="middle" fontSize="9" fill="#4ade80" fontWeight="bold" fontFamily="Helvetica">{label}</text></g>);})()}
            {orderedPoints.map((pt,i)=>{
              const sp=u2s(pt.e,pt.n,viewport), isSel=selectedId===pt.id, isInGroup=selectedIds.has(pt.id), isDrag=draggedId===pt.id;
              const r=isSel||isDrag?7:isInGroup?6:5, fill=isSel?'#3b82f6':isDrag?'#f59e0b':isInGroup?'#8b5cf6':'#22c55e';
              return (<g key={pt.id} style={{cursor:tool==='select'?'move':tool==='delete'?'no-drop':'crosshair'}}>
                {(isSel||isInGroup)&&<circle cx={sp.x} cy={sp.y} r={r+4} fill={isSel?'rgba(59,130,246,0.15)':'rgba(139,92,246,0.15)'} stroke={isSel?'rgba(59,130,246,0.4)':'rgba(139,92,246,0.4)'} strokeWidth="1"/>}
                <circle cx={sp.x} cy={sp.y} r={r} fill={fill} stroke="#1a1e25" strokeWidth="1.5"/>
                <text x={sp.x} y={sp.y-3} textAnchor="middle" fontSize="8" fill="white" fontWeight="bold" fontFamily="Helvetica">{i+1}</text>
                {disp.labels&&<g><rect x={sp.x+9} y={sp.y-11} width={pt.name.length*5.5+4} height="11" rx="2" fill="rgba(0,0,0,0.65)"/><text x={sp.x+11} y={sp.y-2} fontSize="9" fill="#cccccc" fontWeight="bold" fontFamily="Helvetica">{pt.name}</text></g>}
              </g>);
            })}
            {activeSnap&&(()=>{
              const sp=u2s(activeSnap.e,activeSnap.n,viewport);
              if(activeSnap.type==='vertex') return <g><circle cx={sp.x} cy={sp.y} r={11} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2"/><line x1={sp.x-7} y1={sp.y} x2={sp.x+7} y2={sp.y} stroke="#f59e0b" strokeWidth="1"/><line x1={sp.x} y1={sp.y-7} x2={sp.x} y2={sp.y+7} stroke="#f59e0b" strokeWidth="1"/></g>;
              if(activeSnap.type==='node') return <g><rect x={sp.x-7} y={sp.y-7} width="14" height="14" fill="none" stroke="#06b6d4" strokeWidth="1.5"/><line x1={sp.x-5} y1={sp.y} x2={sp.x+5} y2={sp.y} stroke="#06b6d4" strokeWidth="1"/><line x1={sp.x} y1={sp.y-5} x2={sp.x} y2={sp.y+5} stroke="#06b6d4" strokeWidth="1"/></g>;
              if(activeSnap.type==='midpoint') return <g><polygon points={`${sp.x},${sp.y-9} ${sp.x+8},${sp.y+6} ${sp.x-8},${sp.y+6}`} fill="none" stroke="#f97316" strokeWidth="1.5"/><line x1={sp.x-5} y1={sp.y} x2={sp.x+5} y2={sp.y} stroke="#f97316" strokeWidth="1"/></g>;
              if(activeSnap.type==='nearest') return <g><circle cx={sp.x} cy={sp.y} r={7} fill="none" stroke="#ec4899" strokeWidth="1" strokeDasharray="2 2"/><line x1={sp.x-5} y1={sp.y-5} x2={sp.x+5} y2={sp.y+5} stroke="#ec4899" strokeWidth="1.5"/><line x1={sp.x+5} y1={sp.y-5} x2={sp.x-5} y2={sp.y+5} stroke="#ec4899" strokeWidth="1.5"/></g>;
              if(activeSnap.type==='close') return <g><circle cx={sp.x} cy={sp.y} r={12} fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="2"/><circle cx={sp.x} cy={sp.y} r={4} fill="#22c55e"/><text x={sp.x} y={sp.y-16} textAnchor="middle" fontSize="7" fill="#22c55e" fontWeight="bold" fontFamily="Helvetica">FECHAR</text></g>;
              if(activeSnap.type==='grid') return <g><rect x={sp.x-6} y={sp.y-6} width="12" height="12" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" strokeWidth="1.5" transform={`rotate(45,${sp.x},${sp.y})`}/></g>;
              return null;
            })()}
            {measurePts.map((mp,i)=>{
              const sp=u2s(mp.e,mp.n,viewport);
              return (<g key={i}>
                <circle cx={sp.x} cy={sp.y} r={5} fill="#f59e0b" stroke="#1a1e25" strokeWidth="1.5"/>
                {i===1&&(()=>{
                  const sp0=u2s(measurePts[0].e,measurePts[0].n,viewport), d=rawDist(measurePts[0],measurePts[1]), az=calcAzDeg(measurePts[0],measurePts[1]);
                  const azD=Math.floor(az), azM=Math.floor((az-azD)*60), azS=((az-azD)*60-azM)*60;
                  return (<><line x1={sp0.x} y1={sp0.y} x2={sp.x} y2={sp.y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3"/>
                    <rect x={(sp0.x+sp.x)/2-40} y={(sp0.y+sp.y)/2-18} width="80" height="22" rx="4" fill="rgba(245,158,11,0.9)"/>
                    <text x={(sp0.x+sp.x)/2} y={(sp0.y+sp.y)/2-6} textAnchor="middle" fontSize="7.5" fill="white" fontWeight="bold" fontFamily="Helvetica">{d.toFixed(3)} m</text>
                    <text x={(sp0.x+sp.x)/2} y={(sp0.y+sp.y)/2+5} textAnchor="middle" fontSize="6.5" fill="rgba(255,255,255,0.85)" fontFamily="Helvetica">{`Az: ${String(azD).padStart(3,'0')}°${String(azM).padStart(2,'0')}'${azS.toFixed(0).padStart(2,'0')}"`}</text>
                  </>);
                })()}
              </g>);
            })}
            {boxSel&&<rect x={Math.min(boxSel.x1,boxSel.x2)} y={Math.min(boxSel.y1,boxSel.y2)} width={Math.abs(boxSel.x2-boxSel.x1)} height={Math.abs(boxSel.y2-boxSel.y1)} fill="rgba(26,159,255,0.06)" stroke="#1a9fff" strokeWidth="1" strokeDasharray="5 3"/>}
            {selectedIds.size>1&&<g><rect x={SVG_W/2-60} y={8} width="120" height="18" rx="4" fill="rgba(26,159,255,0.85)"/><text x={SVG_W/2} y={20} textAnchor="middle" fontSize="8.5" fill="white" fontWeight="bold" fontFamily="Helvetica">{selectedIds.size} sel · Del p/ apagar</text></g>}
            {disp.northArrow&&<g transform="translate(36,36)"><circle r="18" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/><path d="M0,-14 L3.5,6 L0,2 L-3.5,6 Z" fill="#cccccc"/><path d="M0,14 L3.5,-6 L0,-2 L-3.5,-6 Z" fill="rgba(204,204,204,0.3)"/><text textAnchor="middle" y="-5" fontSize="8" fontWeight="bold" fill="white" fontFamily="Helvetica">N</text></g>}
            {disp.scaleBar&&barPxW>5&&barPxW<SVG_W*0.35&&<g transform={`translate(${SVG_W-barPxW-20},${SVG_H-18})`}><rect x="0" y="-5" width={barPxW} height="6" rx="1" fill="rgba(204,204,204,0.8)"/><rect x="0" y="-5" width={barPxW/2} height="6" fill="rgba(0,0,0,0.4)"/><text x={barPxW/2} y="-9" textAnchor="middle" fontSize="7.5" fill="#aaaaaa" fontFamily="Helvetica" fontWeight="bold">{scaleLabel}</text><line x1="0" y1="-5" x2="0" y2="3" stroke="#cccccc" strokeWidth="1.5"/><line x1={barPxW} y1="-5" x2={barPxW} y2="3" stroke="#cccccc" strokeWidth="1.5"/></g>}
            <text x={SVG_W-8} y={SVG_H-6} textAnchor="end" fontSize="7" fill="rgba(100,100,120,0.7)" fontFamily="Helvetica">
              {tool==='add'?'Clique p/ vértice':tool==='delete'?'Clique p/ remover':tool==='measure'?'2 pontos p/ medir':tool==='pan'?'Arraste p/ mover':tool==='select'?'Clique/arraste':tool==='polyline'?'Clique p/ nó · ↵ concluir · C fechar · Esc cancela':tool==='node'?'Clique em nó · Arr. p/ mover · Del':tool==='erase-obj'?'Clique na feição':''}
            </text>
          </svg>
        </div>

        {/* ── Right Panel ── */}
        {rightPanelOpen && (
          <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{width:268,background:'#252526',borderLeft:'1px solid #1a1a1a'}}>
            <div className="flex flex-shrink-0" style={{background:'#2d2d2d',borderBottom:'1px solid #1a1a1a'}}>
              {([{id:'props',label:'Props'},{id:'confrontantes',label:'Conf.'},{id:'relatorio',label:'Relatório'}] as const).map(t=>(
                <button key={t.id} onClick={()=>setRightPanelTab(t.id)} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${rightPanelTab===t.id?'text-[#cccccc] border-b-2 border-[#1a9fff]':'text-[#666] hover:text-[#aaa]'}`}>{t.label}</button>
              ))}
            </div>
            {rightPanelTab==='props' && (
              <div className="flex-1 overflow-y-auto">
                {selectedId&&editField&&(()=>{
                  const pt=points.find(p=>p.id===selectedId); if(!pt) return null;
                  const orderIdx=polygonOrder.indexOf(pt.id);
                  return (
                    <div className="p-3 space-y-2" style={{borderBottom:'1px solid #1a1a1a'}}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#1a9fff]/20 text-[#1a9fff] rounded text-[10px] font-black flex items-center justify-center">{orderIdx+1}</div>
                        <div><p className="text-[8px] text-[#555] uppercase">Selecionado</p><p className="font-black text-[#cccccc] text-[11px]">{pt.name}</p></div>
                      </div>
                      <div className="space-y-1.5">
                        {([['Nome','name'],['E (m)','e'],['N (m)','n'],['Alt (m)','h']] as [string,keyof EditField][]).map(([l,f])=>(
                          <div key={f}>
                            <label className="block text-[8px] font-bold text-[#555] uppercase mb-0.5">{l}</label>
                            <input value={(editField as Record<string,string>)[f]??''} onChange={e=>{setEditField(prev=>prev?{...prev,[f]:e.target.value}:prev);setEditDirty(true);}} className="w-full px-2 py-1 border border-[#3d3d3d] rounded text-[10px] font-mono bg-[#1e1e1e] text-[#cccccc] outline-none focus:border-[#1a9fff]"/>
                          </div>
                        ))}
                      </div>
                      {editDirty&&<div className="flex gap-1"><button onClick={applyEditField} className="flex-1 py-1 rounded text-[10px] font-bold bg-[#1a9fff] text-white hover:bg-[#0d8fe8] flex items-center justify-center gap-1"><Check size={9}/> Aplicar</button><button onClick={()=>{const p2=points.find(p=>p.id===selectedId);if(p2) setEditField({id:p2.id,name:p2.name,e:p2.e.toFixed(3),n:p2.n.toFixed(3),h:p2.h.toFixed(3)});setEditDirty(false);}} className="px-2 py-1 rounded text-[10px] text-[#aaa] hover:bg-[#333] border border-[#3d3d3d]"><X size={9}/></button></div>}
                      <button onClick={()=>deletePoint(pt.id)} className="w-full py-1 rounded text-[10px] font-bold text-red-400 hover:bg-red-500/10 border border-red-500/20 flex items-center justify-center gap-1"><Trash2 size={9}/> Apagar</button>
                    </div>
                  );
                })()}
                <div className="p-3 space-y-1" style={{borderBottom:'1px solid #1a1a1a'}}>
                  <p className="text-[8px] text-[#555] uppercase font-bold tracking-widest mb-2">Resumo</p>
                  {[['Vértices',orderedPoints.length.toString()],['Área',`${areaHa.toFixed(4)} ha`],['Perímetro',`${perimeter.toFixed(1)} m`]].map(([l,v])=>(
                    <div key={l} className="flex justify-between text-[10px]"><span className="text-[#666]">{l}</span><span className="font-mono font-bold text-[#cccccc]">{v}</span></div>
                  ))}
                </div>
                {orderedPoints.length>1&&(
                  <div className="p-2">
                    <p className="text-[8px] text-[#555] uppercase font-bold tracking-widest mb-1 px-1">Segmentos</p>
                    {orderedPoints.map((pt,i)=>{const n=orderedPoints.length,next=orderedPoints[(i+1)%n];return(
                      <div key={pt.id} className="px-2 py-1 rounded hover:bg-[#2a2a2a]">
                        <span className="text-[9px] font-bold text-[#1a9fff]">{pt.name}→{next.name}</span>
                        <div className="flex gap-3 mt-0.5"><span className="text-[8px] text-[#555]">Az:<span className="text-[#aaa] ml-1">{calcAzStr(pt,next)}</span></span><span className="text-[8px] text-[#555]">{segDist(pt,next).toFixed(2)}m</span></div>
                      </div>
                    );})}
                  </div>
                )}
                <div className="p-3">
                  <p className="text-[8px] text-[#555] uppercase font-bold tracking-widest mb-2">Atalhos</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {[['S','Selecionar'],['A','Vértice'],['D','Apagar V.'],['M','Medir'],['P','Vista'],['L','Polilinha'],['N','Nó'],['R','Radiação'],['F','Enquadrar'],['Ctrl+K','Coord.'],['Ctrl+Z','Desfazer'],['↵','Concluir'],['C','Fechar'],['Del','Apagar'],['Esc','Cancelar']].map(([k,l])=>(
                      <div key={k} className="flex items-center justify-between text-[8px] px-1 py-0.5">
                        <span className="text-[#555]">{l}</span>
                        <kbd className="px-1 py-0.5 rounded text-[7px] font-mono font-bold" style={{background:'#333',color:'#999'}}>{k}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {rightPanelTab==='confrontantes' && (
              <div className="flex-1 overflow-y-auto">
                {orderedPoints.length<2&&<div className="p-4 text-center text-[10px] text-[#555]">Adicione ao menos 2 vértices.</div>}
                {orderedPoints.length>=2&&orderedPoints.map((_,i)=>{
                  const n=orderedPoints.length, next=orderedPoints[(i+1)%n], key=segmentKey(i), conf=getConf(key);
                  return (
                    <div key={key} className="p-3" style={{borderBottom:'1px solid #1a1a1a'}}>
                      <div className="flex items-center gap-1 mb-1.5">
                        <span className="text-[8px] text-[#555] font-mono">{i+1}.</span>
                        <span className="text-[9px] font-bold text-[#1a9fff]">{orderedPoints[i].name}→{next.name}</span>
                        <span className="ml-auto text-[8px] font-mono text-[#555]">{segDist(orderedPoints[i],next).toFixed(1)}m</span>
                      </div>
                      <input type="text" value={conf.nome} onChange={e=>setConf(key,'nome',e.target.value)} placeholder="Confrontante / Proprietário" className="w-full px-2 py-1 mb-1 border border-[#3d3d3d] rounded text-[10px] bg-[#1e1e1e] text-[#cccccc] outline-none focus:border-[#1a9fff] placeholder-[#444]"/>
                      <select value={conf.tipo} onChange={e=>setConf(key,'tipo',e.target.value)} className="w-full px-2 py-1 border border-[#3d3d3d] rounded text-[10px] bg-[#1e1e1e] text-[#cccccc] outline-none focus:border-[#1a9fff]">
                        {SITUATION_OPTS.map(o=><option key={o} style={{background:'#1e1e1e'}}>{o}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
            {rightPanelTab==='relatorio' && (
              <div className="flex-1 overflow-y-auto">
                <div className="p-3" style={{borderBottom:'1px solid #1a1a1a'}}>
                  <p className="text-[8px] text-[#555] uppercase font-bold tracking-widest mb-2">Dados do Imóvel</p>
                  <div className="space-y-1.5">
                    {([['propertyName','Denominação'],['ownerName','Proprietário'],['municipality','Município'],['uf','UF'],['incraCode','Código INCRA'],['datum','Datum'],['zone','Zona UTM'],['technicianName','Técnico'],['technicianCrea','CREA']] as [keyof CadState,string][]).map(([f,l])=>(
                      <div key={f}>
                        <label className="block text-[8px] font-bold text-[#555] uppercase mb-0.5">{l}</label>
                        <input type="text" value={cadState[f]} onChange={e=>setCadState(prev=>({...prev,[f]:e.target.value}))} className="w-full px-2 py-1 border border-[#3d3d3d] rounded text-[10px] bg-[#1e1e1e] text-[#cccccc] outline-none focus:border-[#1a9fff]"/>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3" style={{borderBottom:'1px solid #1a1a1a'}}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[8px] text-[#555] uppercase font-bold tracking-widest">Validação SIGEF</p>
                    <button onClick={runSigefValidation} disabled={orderedPoints.length<3} className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"><Shield size={9}/> Validar</button>
                  </div>
                  {!sigefValidation&&<p className="text-[9px] text-[#555]">Clique Validar para verificar normas INCRA IN-02/2022.</p>}
                  {sigefValidation&&(
                    <div className="space-y-1.5">
                      <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[9px] font-bold ${sigefValidation.valid?'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20':'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {sigefValidation.valid?<CheckCircle size={11}/>:<AlertTriangle size={11}/>}
                        {sigefValidation.valid?'Válido para SIGEF':`${sigefValidation.issues.filter(i=>i.severity==='error').length} erro(s)`}
                      </div>
                      {sigefValidation.area!==undefined&&(
                        <div className="grid grid-cols-3 gap-1 text-[8px]">
                          {[['Área',`${sigefValidation.area.toFixed(4)}`],['Perim.',`${sigefValidation.perimeter?.toFixed(1)}`],['Sentido',sigefValidation.orientation||'']].map(([l,v])=>(
                            <div key={l} className="rounded px-1.5 py-1 text-center" style={{background:'#1e1e1e'}}><div className="text-[#555]">{l}</div><div className={`font-black ${l==='Sentido'&&v==='CCW'?'text-emerald-400':l==='Sentido'?'text-amber-400':'text-[#ccc]'}`}>{v}</div></div>
                          ))}
                        </div>
                      )}
                      {sigefValidation.issues.length>0&&(
                        <div className="max-h-28 overflow-y-auto space-y-0.5">
                          {sigefValidation.issues.map((issue,i)=>(
                            <div key={i} className={`flex items-start gap-1.5 text-[8px] px-2 py-1 rounded ${issue.severity==='error'?'bg-red-500/10 text-red-400':'bg-amber-500/10 text-amber-400'}`}>
                              {issue.severity==='error'?<AlertTriangle size={8} className="flex-shrink-0 mt-0.5"/>:<Info size={8} className="flex-shrink-0 mt-0.5"/>}
                              <span><span className="font-bold">[{issue.code}]</span> {issue.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="text-[8px] text-[#555] uppercase font-bold tracking-widest mb-2">Exportar</p>
                  <button onClick={exportOds} disabled={!points.length} className="w-full flex items-center gap-2 px-3 py-2 rounded text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 disabled:opacity-40"><FileSpreadsheet size={13}/> Planilha ODS</button>
                  <button onClick={exportPdf} disabled={orderedPoints.length<3||isExportingPDF} className="w-full flex items-center gap-2 px-3 py-2 rounded text-[10px] font-bold text-[#cccccc] hover:bg-[#333] border border-[#3d3d3d] disabled:opacity-40">
                    {isExportingPDF?<Loader2 size={13} className="animate-spin"/>:<FileText size={13}/>} Confrontação PDF
                  </button>
                  <button onClick={exportMemorialDocx} disabled={orderedPoints.length<3||isExportingDOCX} className="w-full flex items-center gap-2 px-3 py-2 rounded text-[10px] font-bold text-blue-300 hover:bg-blue-500/10 border border-blue-500/20 disabled:opacity-40">
                    {isExportingDOCX?<Loader2 size={13} className="animate-spin"/>:<Download size={13}/>} Memorial DOCX
                  </button>
                  <button onClick={exportSigefXml} disabled={orderedPoints.length<3} className="w-full flex items-center gap-2 px-3 py-2 rounded text-[10px] font-bold text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/20 disabled:opacity-40"><Shield size={13}/> SIGEF XML</button>
                  <button onClick={exportDxf} disabled={orderedPoints.length<2} className="w-full flex items-center gap-2 px-3 py-2 rounded text-[10px] font-bold text-violet-300 hover:bg-violet-500/10 border border-violet-500/20 disabled:opacity-40"><FileCode2 size={13}/> Perímetro DXF</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Command Line ── */}
      <div className="flex-shrink-0 flex flex-col" style={{height:66,background:'#1e1e1e',borderTop:'1px solid #111'}}>
        <div className="flex-1 px-3 pt-1 overflow-hidden flex flex-col-reverse">
          {[...cmdHistory].reverse().slice(0,4).map((msg,i)=>(
            <div key={i} className="text-[10px] font-mono leading-tight truncate" style={{color:msg.startsWith('>')?'#cccccc':msg.toLowerCase().includes('erro')?'#f87171':'#888'}}>{msg}</div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 px-3 pb-1.5">
          <span className="text-[#1a9fff] text-[11px] font-mono font-bold flex-shrink-0">:</span>
          <input ref={cmdInputRef} value={cmdInput} onChange={e=>setCmdInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'){processCmd(cmdInput);setCmdInput('');}if(e.key==='Escape'){cancelDrawing();setCmdInput('');}}}
            placeholder="Comando: E,N  ou  S A D M P L N R F…"
            className="flex-1 bg-transparent text-[11px] font-mono outline-none text-[#cccccc] placeholder-[#444]"
          />
        </div>
      </div>

      {/* ── Status Bar ── */}
      <div className="flex-shrink-0 flex items-center px-3 gap-3 text-[10px] font-mono" style={{height:22,background:'#007acc',color:'rgba(255,255,255,0.9)'}}>
        <span>{cursorUTM?<>E: <strong>{cursorUTM.e.toFixed(3)}</strong>  N: <strong>{cursorUTM.n.toFixed(3)}</strong></>:'Cursor fora'}</span>
        <span className="opacity-50">|</span>
        <span>1:{(1/viewport.ppm*1000).toFixed(0)}</span>
        <span className="opacity-50">|</span>
        <span className="opacity-80">{cadState.datum||'SIRGAS2000'} · Fuso {cadState.zone||'—'}</span>
        {disp.snapGrid&&<><span className="opacity-50">|</span><span className="font-bold">SNAP</span></>}
        {undoStack.length>0&&<><span className="opacity-50">|</span><span className="opacity-70">{undoStack.length} undo</span></>}
        <span className="ml-auto opacity-80 uppercase text-[9px] tracking-widest">
          {tool==='select'?'SELECIONAR':tool==='add'?'VÉRTICE':tool==='delete'?'APAGAR':tool==='measure'?'MEDIR':tool==='pan'?'VISTA':tool==='polyline'?'POLILINHA':tool==='node'?'NÓ':tool==='erase-obj'?'APAGAR FEIÇÃO':''}
        </span>
      </div>
    </div>
  );
};

export default CadModule;