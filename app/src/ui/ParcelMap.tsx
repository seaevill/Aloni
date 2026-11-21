import { useEffect, useRef, useState } from 'preact/hooks';
import { MAP } from '../config';
import { t } from '../i18n';
import { areaM2, differencePct, toStremma, typedStremma, validBoundary, type Boundary } from '../map/geo';
import { formatDerived } from '../i18n/format';

type Draw = { start: () => void; setMode: (m: string) => void; clear: () => void; getSnapshot: () => Array<{ geometry: { type: string; coordinates: unknown } }>; addFeatures: (f: unknown[]) => unknown; on: (e: string, cb: () => void) => void; stop: () => void };

/**
 * Draw or edit the boundary of ONE parcel on a base map (MapLibre + Terra Draw, loaded only when this screen opens). The area from the drawing is shown next to the typed one with the
 * difference; the typed area is never replaced. The position («my location») is asked only when the owner presses the button; this screen exists only in the owner's app.
 */
export function ParcelMap({ initial, typedArea, onDone, onCancel }: { initial: Boundary | undefined; typedArea: string; onDone: (b: Boundary | undefined) => void; onCancel: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const drawRef = useRef<Draw | undefined>(undefined);
  const mapRef = useRef<{ flyTo: (o: { center: [number, number]; zoom: number }) => void; remove: () => void } | undefined>(undefined);
  const [state, setState] = useState<'loading' | 'ready' | 'nowebgl'>('loading');
  const [shape, setShape] = useState<Boundary | undefined>(initial);

  useEffect(() => {
    let dead = false;
    void (async () => {
      try {
        const [{ Map: MapLibreMap }, td, { TerraDrawMapLibreGLAdapter }] = await Promise.all([import('maplibre-gl'), import('terra-draw'), import('terra-draw-maplibre-gl-adapter'), import('maplibre-gl/dist/maplibre-gl.css')]);
        if (dead || !box.current) return;
        const center = initial?.coordinates[0]?.[0] ?? MAP.center;
        const map = new MapLibreMap({ container: box.current, style: MAP.styleUrl, center: center as [number, number], zoom: initial ? 16 : MAP.zoom, attributionControl: { compact: true } });
        mapRef.current = map;
        map.on('load', () => {
          const draw = new td.TerraDraw({ adapter: new TerraDrawMapLibreGLAdapter({ map }), modes: [new td.TerraDrawPolygonMode(), new td.TerraDrawSelectMode({ flags: { polygon: { feature: { draggable: true, coordinates: { draggable: true, midpoints: true, deletable: true } } } } })] }) as unknown as Draw;
          draw.start();
          drawRef.current = draw;
          const read = () => { const f = draw.getSnapshot().find((x) => x.geometry.type === 'Polygon'); const g = f?.geometry; setShape(g && validBoundary(g) ? g : undefined); };
          draw.on('finish', () => { read(); draw.setMode('select'); });
          draw.on('change', read);
          if (initial) { draw.addFeatures([{ type: 'Feature', geometry: initial, properties: { mode: 'polygon' } }]); draw.setMode('select'); } else draw.setMode('polygon');
          setState('ready');
        });
        map.on('error', () => undefined);   // a tile that cannot be fetched (offline) must not break the screen: the cached ones stay
      } catch { if (!dead) setState('nowebgl'); }
    })();
    return () => { dead = true; try { drawRef.current?.stop(); } catch { /* already stopped */ } mapRef.current?.remove(); };
  }, []);

  const m2 = shape ? areaM2(shape) : undefined;
  const typed = typedStremma(typedArea);
  const mapStr = m2 === undefined ? undefined : toStremma(m2);
  const where = () => { navigator.geolocation?.getCurrentPosition((p) => mapRef.current?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 17 }), () => undefined, { enableHighAccuracy: true, timeout: 10000 }); };
  const clear = () => { drawRef.current?.clear(); drawRef.current?.setMode('polygon'); setShape(undefined); };
  return (
    <section data-testid="parcel-map">
      <div class="topbar"><button class="back" data-testid="map-cancel" onClick={onCancel}><span aria-hidden="true" class="chev back-chev" /><span>{t('info.back')}</span></button></div>
      <h1>{t('map.title')}</h1>
      <p class="muted">{t('map.help')}</p>
      {state === 'nowebgl' && <p class="msg error" role="alert" data-testid="map-nowebgl">{t('map.nowebgl')}</p>}
      <div class="mapbox" ref={box} data-testid="map-canvas" />
      <small class="muted">{t('map.attribution')}</small>
      <div class="card" data-testid="map-area">
        {mapStr === undefined ? <small>{t('map.area.none')}</small> : <small data-testid="map-area-line">{t('map.area.line', { map: formatDerived(mapStr, 2) })}</small>}
        {mapStr !== undefined && typed !== undefined && <small data-testid="map-diff">{t('map.area.diff', { typed: formatDerived(typed, 3), pct: formatDerived(differencePct(mapStr, typed), 1) })}</small>}
        {mapStr !== undefined && typed === undefined && <small>{t('map.area.notyped')}</small>}
        <small class="muted">{t('map.keep')}</small>
      </div>
      <button class="btn secondary" data-testid="map-where" onClick={where}>{t('map.where')}</button>
      <button class="btn secondary" data-testid="map-clear" onClick={clear}>{t('map.clear')}</button>
      <button class="btn" data-testid="map-save" disabled={state !== 'ready'} onClick={() => onDone(shape)}>{t('map.save')}</button>
    </section>
  );
}
