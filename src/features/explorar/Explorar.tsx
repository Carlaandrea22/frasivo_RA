import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { categorias, estructuras } from '../../content/anatomy/catalogo';
import { modelos } from '../../content/anatomy/modelos';
import { anotaciones } from '../../content/anotaciones/anatomia';
import { retos } from '../../content/ejercicios/retos';
import type { Estructura } from '../../content/types';
import type { RouteProps } from '../../shared/navegacion';
import { recordConsultation } from '../../shared/progreso';
import { BottomSheet } from '../../shared/ui/BottomSheet';
import { Card } from '../../shared/ui/Card';
import { ContentState } from '../../shared/ui/ContentState';
import { EnglishTerm } from '../../shared/ui/EnglishTerm';
import { SearchField } from '../../shared/ui/SearchField';
import { Segmented } from '../../shared/ui/Segmented';
import type { Viewer3DProjectedAnchor } from '../../shared/visor3d/Viewer3D';
import './explorar.css';

const Viewer3D = lazy(() => import('../../shared/visor3d/Viewer3D'));
const options = categorias.map(({ id, nombre }) => ({ id, label: nombre, href: `#explorar/${id}` }));
const normalize = (value: string) => value.trim().toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '');

export function Catalogo({ params }: RouteProps) {
  const [search, setSearch] = useState('');
  const categoria = params.categoria;
  const results = estructuras.filter(item => (!categoria || item.categoria === categoria)
    && normalize(`${item.nombreEs} ${item.terminoEn}`).includes(normalize(search)));

  return <section className="lumar-page">
    <header>
      <h1>Explorar 3D</h1>
      <p className="lumar-subtitle">En construcción</p>
    </header>
    <Segmented label="Categoría anatómica" value={categoria} options={options}/>
    <SearchField label="Buscar una estructura" value={search} onChange={setSearch}/>
    {results.map(item => <Card className="explorar-preview" key={item.id}>
      {item.miniatura && <img src={item.miniatura} alt="" className="explorar-thumb"/>}
      <div>
        <p className="lumar-card-meta">Provisional</p>
        <h2>{item.nombreEs}</h2>
        <EnglishTerm term={item.terminoEn}/>
        <a className="button button--secondary lumar-link" href={`#explorar/estructura/${item.id}`}>Ver {item.nombreEs.toLocaleLowerCase('es')}</a>
      </div>
    </Card>)}
    {!results.length && <ContentState state="empty"
      title={search ? 'No encontramos esa estructura' : 'Todavía no hay estructuras en esta categoría'}/>}
  </section>;
}

function Ficha({ item }: { item: Estructura }) {
  const recorded = useRef(false);
  const [showLabels, setShowLabels] = useState(true);
  const [screenPoints, setScreenPoints] = useState<readonly Viewer3DProjectedAnchor[]>([]);
  const annotations = useMemo(() => anotaciones.filter(label => label.estructuraId === item.id), [item.id]);
  const anchors = useMemo(() => annotations.map(({ id, nodeId, punto }) => ({ id, nodeId, point: punto })), [annotations]);
  const model = item.modelo && modelos[item.modelo.assetId];
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    recordConsultation({ areaId: 'anatomy', groupId: item.categoria, itemId: item.id });
  }, [item]);

  return <section className="lumar-page">
    <a className="explorar-back" href={`#explorar/${item.categoria}`}><ArrowLeft size={17} aria-hidden="true"/> Explorar 3D</a>
    <header>
      <h1>{item.nombreEs}</h1>
      <EnglishTerm term={item.terminoEn}/>
      <p className="lumar-subtitle">En construcción · Modelo provisional</p>
    </header>
    {model && item.modelo ? (
      <Suspense fallback={<ContentState state="loading"/>}>
        <Viewer3D src={model} nodeId={item.modelo.nodeId} label={`Modelo 3D de ${item.nombreEs}`}
          anchors={anchors} onProject={setScreenPoints}>
          {showLabels && screenPoints.filter(p => p.visible).map(p =>
            <span className="explorar-label" key={p.id} style={{ left: p.x, top: p.y }}>
              {annotations.find(annotation => annotation.id === p.id)?.etiquetaEs}
            </span>,
          )}
        </Viewer3D>
      </Suspense>
    ) : <ContentState state="unavailable" title="Modelo 3D no disponible"/>}
    <label className="explorar-label-toggle">
      <input type="checkbox" checked={showLabels} onChange={event => setShowLabels(event.target.checked)}/> Mostrar etiquetas
    </label>
    <Card>
      <h2>Ubicación y función</h2>
      <p>{item.definicion}</p>
      <p>{item.ubicacion} {item.funcion}</p>
      <div className="lumar-actions">
        <BottomSheet trigger="Ver partes" title="Partes anatómicas">
          <ul>{item.partes.map(part => <li key={part.id}>
            <strong>{part.nombreEs}</strong>
            <EnglishTerm term={part.terminoEn}/>
            <p>{part.ubicacion} {part.funcion}</p>
          </li>)}</ul>
        </BottomSheet>
        {retos.filter(reto => reto.estructurasRelacionadas.includes(item.id)).map(reto =>
          <a key={reto.id} className="button button--primary lumar-link" href={`#practicar/retos/${reto.id}`}>Reto relacionado</a>,
        )}
      </div>
    </Card>
  </section>;
}

export function DetalleEstructura({ params }: RouteProps) {
  const item = estructuras.find(estructura => estructura.id === params.id);
  return item ? <Ficha item={item} key={item.id}/> : (
    <div className="lumar-page"><ContentState state="unavailable"><a href="#explorar">Volver a Explorar 3D</a></ContentState></div>
  );
}
