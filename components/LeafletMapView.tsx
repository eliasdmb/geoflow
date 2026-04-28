import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

/* ── Fix Leaflet default icon paths broken by bundlers ── */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ── Types shared with CadModule ── */
export interface GnssPoint {
  id: string; name: string;
  e: number; n: number; h: number;
  coordType: 'UTM' | 'GEO';
}
export type ObjType = 'polyline' | 'polygon-area';
export interface DrawVertex { id: string; e: number; n: number }
export interface DrawObject {
  id: string; name: string; type: ObjType;
  vertices: DrawVertex[]; color: string;
  strokeWidth: number; visible: boolean;
}

export interface LeafletDrawnFeature {
  id: string;
  name: string;
  type: ObjType;
  color: string;
  vertices: DrawVertex[];
}

/* ── UTM ↔ WGS84 conversion (WGS84 ellipsoid) ── */
const DEG = Math.PI / 180;
function utmToLatLon(easting: number, northing: number, zone: string): [number, number] {
  const zoneNum = parseInt(zone, 10);
  const isSouth = /S/i.test(zone);
  const a = 6378137.0, f = 1 / 298.257223563;
  const b = a * (1 - f);
  const e2 = 1 - (b * b) / (a * a);
  const ep2 = e2 / (1 - e2);
  const k0 = 0.9996;
  const x = easting - 500000;
  const y = isSouth ? northing - 10000000 : northing;
  const lon0 = (zoneNum - 1) * 6 - 180 + 3;
  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu
    + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
    + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu)
    + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const sinPhi1 = Math.sin(phi1), cosPhi1 = Math.cos(phi1), tanPhi1 = Math.tan(phi1);
  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 ** 2);
  const T1 = tanPhi1 ** 2;
  const C1 = ep2 * cosPhi1 ** 2;
  const R1 = a * (1 - e2) / (1 - e2 * sinPhi1 ** 2) ** 1.5;
  const D = x / (N1 * k0);
  const lat = phi1 - (N1 * tanPhi1 / R1) * (
    D ** 2 / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * D ** 4 / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * ep2 - 3 * C1 ** 2) * D ** 6 / 720
  );
  const lon = lon0 * DEG + (D - (1 + 2 * T1 + C1) * D ** 3 / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * D ** 5 / 120) / cosPhi1;
  return [lat / DEG, lon / DEG];
}

function latLonToUtm(lat: number, lon: number, zone: string): { e: number; n: number } {
  const zoneNum = parseInt(zone, 10);
  const isSouth = /S/i.test(zone);
  const a = 6378137.0, f = 1 / 298.257223563;
  const b = a * (1 - f);
  const e2 = 1 - (b * b) / (a * a);
  const ep2 = e2 / (1 - e2);
  const k0 = 0.9996;
  const lon0 = (zoneNum - 1) * 6 - 180 + 3;
  const latR = lat * DEG, lonR = lon * DEG, lon0R = lon0 * DEG;
  const sinLat = Math.sin(latR), cosLat = Math.cos(latR), tanLat = Math.tan(latR);
  const N = a / Math.sqrt(1 - e2 * sinLat ** 2);
  const T = tanLat ** 2;
  const C = ep2 * cosLat ** 2;
  const A = cosLat * (lonR - lon0R);
  const M = a * (
    (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * latR
    - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * latR)
    + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * latR)
    - (35 * e2 ** 3 / 3072) * Math.sin(6 * latR)
  );
  const easting = 500000 + k0 * N * (
    A + (1 - T + C) * A ** 3 / 6
    + (5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5 / 120
  );
  const northing = (isSouth ? 10000000 : 0) + k0 * (
    M + N * tanLat * (
      A ** 2 / 2
      + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24
      + (61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6 / 720
    )
  );
  return { e: easting, n: northing };
}

function ptToLatLon(pt: GnssPoint, zone: string): [number, number] {
  if (pt.coordType === 'GEO') return [pt.n, pt.e];
  return utmToLatLon(pt.e, pt.n, zone);
}

/* ── Tile layers ── */
const TILE_LAYERS = {
  Ruas: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  Satélite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
  },
  Híbrido: {
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
  },
};

/* ── Component props ── */
interface LeafletMapViewProps {
  points: GnssPoint[];
  polygonOrder: string[];
  drawObjects: DrawObject[];
  zone: string;
  onFeaturesChange?: (features: LeafletDrawnFeature[]) => void;
}

const DRAW_COLORS = ['#3b82f6','#ef4444','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316'];
let colorIdx = 0;

const LeafletMapView: React.FC<LeafletMapViewProps> = ({
  points, polygonOrder, drawObjects, zone, onFeaturesChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const surveyGroupRef = useRef<L.FeatureGroup | null>(null);
  const drawGroupRef = useRef<L.FeatureGroup | null>(null);
  const featuresRef = useRef<LeafletDrawnFeature[]>([]);
  const onFeaturesChangeRef = useRef(onFeaturesChange);
  onFeaturesChangeRef.current = onFeaturesChange;

  /* ── Init map once ── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-15.8, -47.9],
      zoom: 14,
      zoomControl: true,
    });

    /* Base layers */
    const baseLayers: Record<string, L.TileLayer> = {};
    Object.entries(TILE_LAYERS).forEach(([name, cfg], i) => {
      const layer = L.tileLayer(cfg.url, { attribution: cfg.attribution, maxZoom: 20 });
      baseLayers[name] = layer;
      if (i === 0) layer.addTo(map);
    });

    /* Feature groups */
    const surveyGroup = new L.FeatureGroup().addTo(map);
    const drawGroup = new L.FeatureGroup().addTo(map);
    surveyGroupRef.current = surveyGroup;
    drawGroupRef.current = drawGroup;

    /* Leaflet.draw control */
    const drawControl = new (L.Control as any).Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: DRAW_COLORS[colorIdx % DRAW_COLORS.length], fillOpacity: 0.15 },
          guideLayers: [surveyGroup],
          snapDistance: 14,
        },
        polyline: {
          shapeOptions: { color: DRAW_COLORS[(colorIdx + 1) % DRAW_COLORS.length] },
          guideLayers: [surveyGroup],
          snapDistance: 14,
        },
        marker: false,
        circle: false,
        rectangle: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawGroup,
        remove: true,
      },
    });
    map.addControl(drawControl);

    /* Layer control */
    L.control.layers(baseLayers, {
      'Levantamento': surveyGroup,
      'Feições': drawGroup,
    }, { position: 'topright' }).addTo(map);

    /* Scale control */
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    /* ── Draw event: CREATED ── */
    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer: L.Layer = e.layer;
      const layerType: string = e.layerType;
      drawGroup.addLayer(layer);

      const color = DRAW_COLORS[colorIdx % DRAW_COLORS.length];
      colorIdx++;

      let vertices: DrawVertex[] = [];
      let type: ObjType = 'polyline';
      const idx = featuresRef.current.length + 1;

      if (layerType === 'polygon') {
        type = 'polygon-area';
        const lls: L.LatLng[] = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[];
        vertices = lls.map((ll, i) => {
          const utm = latLonToUtm(ll.lat, ll.lng, zone);
          return { id: `lv_${Date.now()}_${i}`, e: utm.e, n: utm.n };
        });
      } else if (layerType === 'polyline') {
        type = 'polyline';
        const lls: L.LatLng[] = (layer as L.Polyline).getLatLngs() as L.LatLng[];
        vertices = lls.map((ll, i) => {
          const utm = latLonToUtm(ll.lat, ll.lng, zone);
          return { id: `lv_${Date.now()}_${i}`, e: utm.e, n: utm.n };
        });
      }

      const feat: LeafletDrawnFeature = {
        id: `lf_${Date.now()}`,
        name: `${layerType === 'polygon' ? 'Polígono' : 'Polilinha'} ${idx}`,
        type,
        color,
        vertices,
      };
      (layer as any)._featureId = feat.id;
      featuresRef.current = [...featuresRef.current, feat];
      onFeaturesChangeRef.current?.(featuresRef.current);
    });

    /* ── Draw event: EDITED ── */
    map.on(L.Draw.Event.EDITED, (e: any) => {
      const layers: L.LayerGroup = e.layers;
      layers.eachLayer((layer: any) => {
        const fid = layer._featureId;
        if (!fid) return;
        let vertices: DrawVertex[] = [];
        if (layer instanceof L.Polygon) {
          const lls: L.LatLng[] = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[];
          vertices = lls.map((ll, i) => {
            const utm = latLonToUtm(ll.lat, ll.lng, zone);
            return { id: `lv_${Date.now()}_${i}`, e: utm.e, n: utm.n };
          });
        } else if (layer instanceof L.Polyline) {
          const lls: L.LatLng[] = (layer as L.Polyline).getLatLngs() as L.LatLng[];
          vertices = lls.map((ll, i) => {
            const utm = latLonToUtm(ll.lat, ll.lng, zone);
            return { id: `lv_${Date.now()}_${i}`, e: utm.e, n: utm.n };
          });
        }
        featuresRef.current = featuresRef.current.map(f =>
          f.id === fid ? { ...f, vertices } : f
        );
      });
      onFeaturesChangeRef.current?.(featuresRef.current);
    });

    /* ── Draw event: DELETED ── */
    map.on(L.Draw.Event.DELETED, (e: any) => {
      const layers: L.LayerGroup = e.layers;
      const deletedIds = new Set<string>();
      layers.eachLayer((layer: any) => { if (layer._featureId) deletedIds.add(layer._featureId); });
      featuresRef.current = featuresRef.current.filter(f => !deletedIds.has(f.id));
      onFeaturesChangeRef.current?.(featuresRef.current);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      surveyGroupRef.current = null;
      drawGroupRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Update survey polygon when GNSS points change ── */
  useEffect(() => {
    const map = mapRef.current;
    const sg = surveyGroupRef.current;
    if (!map || !sg) return;

    sg.clearLayers();
    const ordered = polygonOrder.map(id => points.find(p => p.id === id)).filter(Boolean) as GnssPoint[];
    if (!ordered.length) return;

    const lls = ordered.map(pt => ptToLatLon(pt, zone));

    /* Polygon */
    if (lls.length >= 3) {
      L.polygon(lls as L.LatLngTuple[], {
        color: '#16a34a',
        weight: 2,
        fillColor: '#16a34a',
        fillOpacity: 0.08,
        dashArray: undefined,
      }).bindTooltip(
        `${lls.length} vértices · ${ordered.length} pts`,
        { sticky: true }
      ).addTo(sg);
    }

    /* Vertex markers */
    ordered.forEach((pt, i) => {
      const ll = ptToLatLon(pt, zone);
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;background:#16a34a;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:900;color:white;line-height:1;box-shadow:0 1px 4px rgba(0,0,0,.4)">${i + 1}</div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker(ll as L.LatLngTuple, { icon })
        .bindPopup(`<b>${pt.name}</b><br/>E: ${pt.e.toFixed(3)}<br/>N: ${pt.n.toFixed(3)}<br/>H: ${pt.h.toFixed(2)}`)
        .addTo(sg);
    });

    /* Fit map to polygon */
    try { map.fitBounds(sg.getBounds().pad(0.15)); } catch { /* empty bounds */ }
  }, [points, polygonOrder, zone]);

  /* ── Sync existing drawObjects onto the Leaflet draw layer ── */
  useEffect(() => {
    const map = mapRef.current;
    const dg = drawGroupRef.current;
    if (!map || !dg) return;

    /* Only add objects not already on the map (avoid duplicating leaflet-draw creations) */
    const existingIds = new Set<string>();
    dg.eachLayer((l: any) => { if (l._featureId) existingIds.add(l._featureId); });

    drawObjects.forEach(obj => {
      if (!obj.visible || obj.vertices.length < 2) return;
      if (existingIds.has(obj.id)) return; // already rendered

      const lls = obj.vertices.map(v => utmToLatLon(v.e, v.n, zone) as L.LatLngTuple);

      let layer: L.Layer;
      if (obj.type === 'polygon-area' && lls.length >= 3) {
        layer = L.polygon(lls, { color: obj.color, weight: obj.strokeWidth, fillOpacity: 0.12 });
      } else {
        layer = L.polyline(lls, { color: obj.color, weight: obj.strokeWidth });
      }
      (layer as any)._featureId = obj.id;
      dg.addLayer(layer);
    });
  }, [drawObjects, zone]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
      style={{ minHeight: 500, height: '100%' }}
    />
  );
};

export default LeafletMapView;
