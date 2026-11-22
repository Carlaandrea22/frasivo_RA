import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { categorias, estructuras } from '../../content/anatomy/catalogo';
import { modelos } from '../../content/anatomy/modelos';
import { anotaciones } from '../../content/anotaciones/anatomia';
import { retos } from '../../content/ejercicios/retos';
import type { Estructura } from '../../content/types';
import type { RouteProps } from '../../shared/navegacion';
import { recordConsultation } from '../../shared/progreso';
import { BottomSheet } from '../../shared/ui/BottomSheet';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ContentState } from '../../shared/ui/ContentState';
import { EnglishTerm } from '../../shared/ui/EnglishTerm';
import { SearchField } from '../../shared/ui/SearchField';
import { Segmented } from '../../shared/ui/Segmented';
import type { Viewer3DProjectedAnchor } from '../../shared/visor3d/Viewer3D';
import { distribuirEtiquetas, filtrarEstructuras } from './atlas';
import './explorar.css';

const Viewer3D = lazy(() => import('../../shared/visor3d/Viewer3D'));
const options = categorias.map(({ id, nombre }) => ({ id, label: `${nombre} (${estructuras.filter(i => i.categoria === id).length})`, href: `#explorar/${id}` }));
function Provisional({ item }: { item: Estructura }) {
  return item.revision.estado === 'provisional' ? <span className="explorar-provisional">Provisional</span> : null;
}

export function Catalogo({ params }: RouteProps) {
  const [search, setSearch] = useState('');
  const categoria = params.categoria ?? 'huesos';
  const results = filtrarEstructuras(estructuras, categoria, search);
  return <section className="lumar-page explorar-page">
    <header><h1>Explorar 3D</h1><p className="lumar-subtitle">Estudia cada estructura en 3D</p></header>
    <div className="explorar-filters">
      <Segmented label="Categoría anatómica" value={categoria} options={options}/>
      <SearchField label="Busca en español o inglés" value={search} onChange={setSearch}/>
    </div>
    <div className="explorar-grid">
      {results.map(item => <Card className="explorar-preview" key={item.id}>
        <a href={`#explorar/estructura/${item.id}`} aria-label={`Ver ${item.nombreEs.toLocaleLowerCase('es')}`}>
          <img src={item.miniatura} alt="" className="explorar-thumb" width="256" height="256" loading="lazy"/>
          <div className="explorar-card-text"><h2>{item.nombreEs}</h2><p lang="en">{item.terminoEn}</p><Provisional item={item}/></div>
        </a>
      </Card>)}
    </div>
    {!results.length && <ContentState state="empty" title={search ? `No encontramos “${search}”. Prueba con otro nombre` : 'Todavía no hay estructuras en esta categoría'}>
      {search && <Button variant="secondary" onClick={() => setSearch('')}>Limpiar búsqueda</Button>}
      {!categorias.some(c => c.id === categoria) && <a href="#explorar">Volver al catálogo</a>}
    </ContentState>}
  </section>;
}

function Ficha({ item }: { item: Estructura }) {
  const recorded = useRef(false);
  const frame = useRef<HTMLDivElement>(null);
  const tap = useRef({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 343, height: 420 });
  const [showLabels, setShowLabels] = useState(true);
  const [selectedPart, setSelectedPart] = useState<string>();
  const [screenPoints, setScreenPoints] = useState<readonly Viewer3DProjectedAnchor[]>([]);
  const annotations = useMemo(() => anotaciones.filter(label => label.estructuraId === item.id), [item.id]);
  const anchors = useMemo(() => annotations.map(({ id, nodeId, punto }) => ({ id, nodeId, point: punto })), [annotations]);
  const selectedAnnotation = annotations.find(a => a.parteId === selectedPart);
  const selected = item.partes.find(p => p.id === selectedPart);
  const labels = distribuirEtiquetas(screenPoints, size.width, size.height, selectedAnnotation?.id);
  const model = item.modelo && modelos[item.modelo.assetId];
  const related = estructuras.filter(i => item.relacionadas.includes(i.id));
  const practice = retos.find(r => r.estructurasRelacionadas.includes(item.id));

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    recordConsultation({ areaId: 'anatomy', groupId: item.categoria, itemId: item.id });
  }, [item]);
  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(() => {
      const stage = frame.current?.querySelector('.viewer3d__stage');
      if (stage) setSize({ width: stage.clientWidth, height: stage.clientHeight });
    });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  const selectNode = (id: string | null) => {
    const candidates = annotations.filter(a => a.nodeId === id || id?.startsWith(`${a.nodeId}_geometry`));
    const distance = (note: typeof annotations[number]) => {
      const p = screenPoints.find(p => p.id === note.id && p.visible);
      return p ? Math.hypot(p.x-tap.current.x, p.y-tap.current.y) : Infinity;
    };
    const part = candidates.sort((a,b) => distance(a)-distance(b))[0];
    setSelectedPart(part?.parteId);
  };

  return <section className="lumar-page explorar-page">
    <header className="explorar-heading">
      <a className="explorar-back" href={`#explorar/${item.categoria}`} aria-label="Atrás a Explorar 3D"><ArrowLeft size={22}/></a>
      <h1>{item.nombreEs}</h1><Provisional item={item}/>
    </header>
    <div className="explorar-detail">
      <div className="explorar-view" ref={frame} onPointerUpCapture={event => {
        const stage = frame.current?.querySelector('.viewer3d__stage')?.getBoundingClientRect();
        if (stage) tap.current = { x: event.clientX-stage.left, y: event.clientY-stage.top };
      }}>
        {model && item.modelo ? <Suspense fallback={<ContentState state="loading" title="Cargando visor 3D…"/>}>
          <Viewer3D src={model} nodeId={item.modelo.nodeId} label={`Modelo 3D de ${item.nombreEs}`}
            anchors={anchors} onProject={setScreenPoints} onSelect={selectNode} selectedNodeId={selectedAnnotation?.nodeId ?? null}>
            {showLabels && <>
              <svg className="explorar-leaders" width={size.width} height={size.height} aria-hidden="true">
                {labels.map(p => <g key={p.id} data-selected={p.id === selectedAnnotation?.id}>
                  <path d={`M ${p.x} ${p.y} L ${p.side === 'left' ? 116 : size.width-116} ${p.labelY} L ${p.side === 'left' ? 106 : size.width-106} ${p.labelY}`}/>
                  <circle cx={p.x} cy={p.y} r={p.id === selectedAnnotation?.id ? 5 : 3}/>
                </g>)}
              </svg>
              {labels.map(p => {
                const note = annotations.find(a => a.id === p.id)!;
                return <button key={p.id} className={`explorar-atlas-label explorar-atlas-label--${p.side}`}
                  style={{ left: p.labelX, top: p.labelY }} aria-pressed={note.parteId === selectedPart}
                  onClick={() => setSelectedPart(note.parteId)}>
                  <strong>{note.etiquetaEs}</strong><span lang="en">{note.etiquetaEn}</span>
                </button>;
              })}
            </>}
          </Viewer3D>
        </Suspense> : <ContentState state="unavailable" title="Modelo 3D no disponible"/>}
        {annotations.length > 0 && <Button className="explorar-toggle" variant="secondary" aria-label={showLabels ? 'Ocultar etiquetas' : 'Mostrar etiquetas'} aria-pressed={showLabels} onClick={() => setShowLabels(s => !s)}>
          {showLabels ? <Eye size={20}/> : <EyeOff size={20}/>}
        </Button>}
        <p className="explorar-help">Gira con un dedo · Acerca con dos</p>
        {item.id === 'heart' && <p className="explorar-help">Modelo en corte esquemático · 15 piezas</p>}
      </div>
      <Card className="explorar-info">
        <h2>{item.nombreEs}</h2><EnglishTerm term={item.terminoEn}/><p>{item.definicion}</p>
        <section><h3>Ubicación</h3><p>{item.ubicacion}</p></section>
        <section><h3>Función</h3><p>{item.funcion}</p></section>
        {item.partes.length > 0 && <section>
          <h3>Partes</h3><div className="explorar-parts" role="group" aria-label="Seleccionar parte anatómica">
            {item.partes.map(part => <Button variant="secondary" key={part.id} aria-pressed={part.id === selectedPart} onClick={() => setSelectedPart(part.id)}>{part.nombreEs}</Button>)}
          </div>
          {selected && <section className="explorar-part-detail" aria-label="Parte seleccionada" aria-live="polite">
            <h3>{selected.nombreEs}</h3><EnglishTerm term={selected.terminoEn}/><p>{selected.ubicacion}</p><p>{selected.funcion}</p>
            {item.modelo?.assetId === 'body-bones-regions' && <p className="explorar-help">Resaltado orientativo: límites de la región pendientes de revisión anatómica.</p>}
            <Button variant="text" onClick={() => setSelectedPart(undefined)}>Ver estructura completa</Button>
          </section>}
          <BottomSheet trigger="Ver partes" title="Partes anatómicas">
            <ul>{item.partes.map(part => <li key={part.id}><strong>{part.nombreEs}</strong><EnglishTerm term={part.terminoEn}/><p>{part.ubicacion} {part.funcion}</p></li>)}</ul>
          </BottomSheet>
        </section>}
        {related.length > 0 && <section><h3>Relacionadas</h3><div className="explorar-related">
          {related.map(i => <a key={i.id} href={`#explorar/estructura/${i.id}`}><img src={i.miniatura} alt="" width="48" height="48"/><span>{i.nombreEs}<small lang="en">{i.terminoEn}</small></span></a>)}
        </div></section>}
        <details className="explorar-sources"><summary>Fuentes y revisión</summary><Provisional item={item}/><ul>{item.revision.fuentes.map(f => <li key={f.url}><a href={f.url} target="_blank" rel="noreferrer">{f.titulo}</a></li>)}</ul>
          <p>Recursos del atlas: BodyParts3D, © The Database Center for Life Science, CC BY 4.0. Corazón en corte: modelo esquemático del proyecto.</p>
        </details>
        <a className="button button--primary lumar-link explorar-practice" href={practice ? `#practicar/retos/${practice.id}` : '#practicar/retos'}>Practicar esta estructura</a>
        {!practice && <p className="explorar-help">Los retos de esta estructura estarán disponibles en la siguiente etapa.</p>}
      </Card>
    </div>
  </section>;
}

export function DetalleEstructura({ params }: RouteProps) {
  const item = estructuras.find(estructura => estructura.id === params.id);
  return item ? <Ficha item={item} key={item.id}/> : <div className="lumar-page"><ContentState state="unavailable" title="No encontramos esta estructura"><a href="#explorar">Volver a Explorar 3D</a></ContentState></div>;
}
