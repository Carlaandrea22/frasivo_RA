import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CircleDot, GripVertical, Link2 } from 'lucide-react';
import { estructuras } from '../../content/anatomy/catalogo';
import { modelos } from '../../content/anatomy/modelos';
import { anotaciones } from '../../content/anotaciones/anatomia';
import type { PreguntaReto } from '../../content/types';
import { Button } from '../../shared/ui/Button';
import { ContentState } from '../../shared/ui/ContentState';
import type { Viewer3DProjectedAnchor } from '../../shared/visor3d/Viewer3D';
import { distribuirEtiquetas, maxEtiquetasMovil } from '../explorar/atlas';
import { nombreEstructura, type Respuestas } from './intentos';

const Viewer3D = lazy(() => import('../../shared/visor3d/Viewer3D'));
const modelo = (id: string) => estructuras.find(item => item.id === id)?.modelo;
const modeloNoDisponible = <ContentState state="unavailable" title="Modelo 3D no disponible"/>;
const cargando = <ContentState state="loading" title="Cargando modelo 3D…"/>;

function useMarcadores() {
  const frame = useRef<HTMLDivElement>(null);
  const [projection, setProjection] = useState({ points: [] as readonly Viewer3DProjectedAnchor[], width: 0, height: 0 });
  const update = (points: readonly Viewer3DProjectedAnchor[]) => {
    const stage = frame.current?.querySelector('.viewer3d__stage');
    if (stage) setProjection({ points, width: stage.clientWidth, height: stage.clientHeight });
  };
  return { frame, projection, update, markers: distribuirEtiquetas(projection.points, projection.width, projection.height) };
}

type Marcadores = ReturnType<typeof useMarcadores>;
function styleMarker(marker: Marcadores['markers'][number]): CSSProperties {
  return { left: marker.labelX, top: marker.labelY, transform: marker.side === 'right' ? 'translate(-100%, -50%)' : 'translateY(-50%)' };
}
function Lineas({ projection, markers, reach }: Pick<Marcadores, 'projection' | 'markers'> & { reach: number }) {
  return <svg className="retos-leaders" width={projection.width} height={projection.height} aria-hidden="true">
    {markers.map(marker => <g key={marker.id}>
      <line x1={marker.x} y1={marker.y} x2={marker.labelX+(marker.side === 'left' ? reach : -reach)} y2={marker.labelY}/>
      <circle cx={marker.x} cy={marker.y} r="4"/>
    </g>)}
  </svg>;
}

interface TableroProps {
  preguntas: readonly PreguntaReto[];
  respuestas: Respuestas;
  bloqueado: boolean;
  onAssign: (pregunta: string, opcion: string) => void;
  onRemove: (pregunta: string) => void;
}

function nombrePareja(pregunta: PreguntaReto) {
  const anotacionId = pregunta.respuestas.find(opcion => opcion.id === pregunta.correctaId)?.anotacionId;
  return anotaciones.find(anotacion => anotacion.id === anotacionId)?.etiquetaEs ?? nombreEstructura(pregunta.estructuraId);
}

export function Relacionar({ preguntas, respuestas, bloqueado, onAssign }: Omit<TableroProps, 'onRemove'>) {
  const [editando, setEditando] = useState<string>();
  const heading = useRef<HTMLHeadingElement>(null);
  const enfocar = useRef(false);
  const pendiente = preguntas.find(pregunta => !respuestas[pregunta.id]);
  const activa = bloqueado ? undefined : preguntas.find(pregunta => pregunta.id === editando) ?? pendiente;
  const seleccionadas = preguntas.filter(pregunta => respuestas[pregunta.id]);

  useEffect(() => {
    if (!enfocar.current) return;
    enfocar.current = false;
    heading.current?.focus();
  }, [activa?.id, editando]);

  function editar(id?: string) {
    enfocar.current = true;
    setEditando(id);
  }

  return <div className="retos-pairs">
    {activa && <>
      <div className="retos-pair-current">
        <p className="retos-meta">{editando ? 'Editar la función de' : 'Elige la función de'}</p>
        <h3 ref={heading} tabIndex={-1}>{nombrePareja(activa)}</h3>
      </div>
      <div className="retos-option-list" role="group" aria-label="Funciones">
        {activa.respuestas.map(opcion => {
          const asignada = preguntas.find(pregunta => respuestas[pregunta.id] === opcion.id);
          if (asignada && !editando) return null;
          const actual = asignada?.id === activa.id;
          return <Button key={opcion.id} variant="answer" className="retos-pair-option"
            aria-pressed={editando ? actual : undefined} onClick={() => {
              onAssign(activa.id, opcion.id);
              editar(undefined);
            }}>
            <span>{opcion.texto}</span>
            {asignada && <small>{actual ? 'Función actual' : `Intercambiar con ${nombrePareja(asignada)}`}</small>}
          </Button>;
        })}
      </div>
      {editando && <Button variant="text" className="retos-start" onClick={() => editar(undefined)}>Cancelar edición</Button>}
    </>}
    {seleccionadas.length > 0 && <section className="retos-pair-summary" aria-label="Tus parejas">
      <h3 ref={activa ? undefined : heading} tabIndex={activa ? undefined : -1}>{activa || bloqueado ? 'Tus parejas' : 'Revisa tus parejas'}</h3>
      <ul className="retos-pair-list">
        {seleccionadas.map(pregunta => {
          const nombre = nombrePareja(pregunta);
          const respuesta = pregunta.respuestas.find(opcion => opcion.id === respuestas[pregunta.id]);
          return <li key={pregunta.id}>
            <div><strong><Link2 size={16} aria-hidden="true"/>{nombre}</strong><p>{respuesta?.texto}</p></div>
            {!bloqueado && <Button variant="text" disabled={editando === pregunta.id} aria-label={`Editar pareja de ${nombre}`}
              onClick={() => editar(pregunta.id)}>Editar</Button>}
          </li>;
        })}
      </ul>
    </section>}
  </div>;
}

export function Ubicar({ preguntas, respuestas, bloqueado, onAssign, onRemove }: TableroProps) {
  const [ficha, setFicha] = useState<string>();
  const { frame, projection, update, markers } = useMarcadores();
  const referencia = modelo(preguntas[0].estructuraId);
  const opciones = preguntas[0].respuestas;
  const anchors = useMemo(() => preguntas.flatMap(pregunta => {
    const anotacionId = pregunta.respuestas.find(r => r.id === pregunta.correctaId)?.anotacionId;
    const note = anotaciones.find(a => a.id === anotacionId);
    return note ? [{ id: pregunta.id, nodeId: note.nodeId, point: note.punto }] : [];
  }), [preguntas]);
  const fueraDeVista = preguntas.filter(pregunta => !markers.some(marker => marker.id === pregunta.id));

  function colocar(pregunta: string, opcion: string) {
    if (bloqueado || !opciones.some(item => item.id === opcion)) return;
    onAssign(pregunta,opcion);
    setFicha(undefined);
  }

  function recuadro(id: string, style?: CSSProperties) {
    const number = preguntas.findIndex(pregunta => pregunta.id === id)+1;
    const colocada = opciones.find(item => item.id === respuestas[id]);
    return <button key={id} type="button" className={`retos-drop${style ? ' retos-drop--overlay' : ''}`}
      style={style} disabled={bloqueado} data-filled={!!colocada}
      aria-label={`Recuadro ${number}${colocada ? `, ${colocada.texto}` : ', vacío'}`}
      onClick={() => {
        if (ficha) colocar(id,ficha);
        else if (colocada) onRemove(id);
      }}
      onDragOver={event => {
        if (!bloqueado) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }
      }}
      onDrop={event => {
        event.preventDefault();
        colocar(id,event.dataTransfer.getData('text/plain'));
      }}>
      <span>{number}</span>{colocada && <strong>{colocada.texto}</strong>}
    </button>;
  }

  return <>
    <div ref={frame} className="retos-viewer">
      {referencia ? <Suspense fallback={cargando}>
        <Viewer3D src={modelos[referencia.assetId]} nodeId={referencia.nodeId} anchors={anchors} selectedNodeId={null}
          label={`Modelo 3D de ${nombreEstructura(preguntas[0].estructuraId)}`}
          onProject={update}>
          <Lineas projection={projection} markers={markers} reach={65}/>
          {markers.map(marker => recuadro(marker.id, styleMarker(marker)))}
        </Viewer3D>
      </Suspense> : modeloNoDisponible}
    </div>
    {fueraDeVista.length > 0 && <div className="retos-dock" role="group" aria-label="Recuadros fuera de vista">
      {fueraDeVista.map(pregunta => recuadro(pregunta.id))}
    </div>}
    <div className="retos-dock" role="group" aria-label="Etiquetas de partes">
      {opciones.map(opcion => {
        const colocada = Object.values(respuestas).includes(opcion.id);
        return <Button key={opcion.id} variant="secondary" className="retos-token" disabled={bloqueado || colocada}
          aria-pressed={ficha === opcion.id && !colocada}
          draggable={!bloqueado && !colocada}
          onDragStart={event => { event.dataTransfer.setData('text/plain',opcion.id); event.dataTransfer.effectAllowed = 'move'; }}
          onClick={() => setFicha(ficha === opcion.id ? undefined : opcion.id)}>
          <GripVertical size={16} aria-hidden="true"/>{opcion.texto}
        </Button>;
      })}
    </div>
  </>;
}

export function Senalar({ pregunta, respuesta, bloqueado, onSelect }: {
  pregunta: PreguntaReto; respuesta?: string; bloqueado: boolean; onSelect: (id?: string) => void;
}) {
  const referencia = modelo(pregunta.estructuraId);
  const seleccion = pregunta.respuestas.find(opcion => opcion.id === respuesta);
  const [numeradas, setNumeradas] = useState(false);
  const { frame, markers, projection, update } = useMarcadores();
  const { estructuraId, respuestas } = pregunta;
  const anchors = useMemo(() => respuestas.flatMap(opcion => {
    const note = anotaciones.find(a => a.estructuraId === estructuraId && a.nodeId === opcion.nodeId);
    return note ? [{ id: opcion.id, nodeId: note.nodeId, point: note.punto }] : [];
  }), [estructuraId, respuestas]);
  // Rotate through the available projections in small batches to keep the labels readable.
  const [grupo, setGrupo] = useState(0);
  const visibles = projection.points.filter(p => p.visible);
  const grupos = Math.max(1, Math.ceil(visibles.length/maxEtiquetasMovil));
  const grupoActivo = grupo % grupos;
  const inicioGrupo = grupoActivo * maxEtiquetasMovil;
  const marcadoresNumerados = numeradas && grupos > 1
    ? distribuirEtiquetas(visibles.slice(inicioGrupo, inicioGrupo + maxEtiquetasMovil), projection.width, projection.height)
    : markers;
  const fueraDeVista = numeradas ? projection.points.filter(p => !p.visible) : [];
  function numero(id: string, style?: CSSProperties) {
    const number = respuestas.findIndex(opcion => opcion.id === id)+1;
    return <Button key={id} variant="secondary" className={style ? 'retos-number' : undefined} style={style}
      disabled={bloqueado} aria-label={`Pieza ${number}`} aria-pressed={respuesta === id}
      onClick={() => onSelect(id)}>{number}</Button>;
  }
  return <>
    <div className="retos-viewer" ref={frame}>
      {referencia ? <Suspense fallback={cargando}>
        <Viewer3D src={modelos[referencia.assetId]} nodeId={referencia.nodeId}
          label={`Modelo 3D de ${nombreEstructura(pregunta.estructuraId)}`}
          anchors={numeradas ? anchors : undefined} onProject={numeradas ? update : undefined}
          onSelect={id => {
            if (bloqueado) return;
            const opcion = id && pregunta.respuestas.find(item =>
              item.nodeId && (id === item.nodeId || id.startsWith(`${item.nodeId}_geometry`)));
            onSelect(opcion ? opcion.id : undefined);
          }}
          selectedNodeId={seleccion?.nodeId ?? null}>
          {numeradas && <>
            <Lineas projection={projection} markers={marcadoresNumerados} reach={22}/>
            {marcadoresNumerados.map(marker => numero(marker.id, styleMarker(marker)))}
          </>}
        </Viewer3D>
      </Suspense> : modeloNoDisponible}
      <p className="retos-selection" aria-live="polite"><CircleDot size={16} aria-hidden="true"/>
        {seleccion ? 'Pieza seleccionada' : 'Gira el modelo y toca una pieza.'}
      </p>
    </div>
    <div className="retos-actions">
      <Button variant="secondary" aria-pressed={numeradas} onClick={() => setNumeradas(!numeradas)}>Mostrar números para seleccionar</Button>
      {numeradas && grupos > 1 && <Button variant="secondary" onClick={() => setGrupo((grupoActivo+1)%grupos)}>Más piezas ({grupoActivo+1} de {grupos})</Button>}
    </div>
    {fueraDeVista.length > 0 && <div className="retos-dock" role="group" aria-label="Piezas fuera de vista">
      <span>Fuera de vista</span>
      {fueraDeVista.map(point => numero(point.id))}
    </div>}
  </>;
}

export function Repasar({ pregunta, respuesta, bloqueado, onSelect }: {
  pregunta: PreguntaReto; respuesta?: string; bloqueado: boolean; onSelect: (id: string) => void;
}) {
  return <div className="retos-option-list" role="group" aria-label="Respuestas">
    {pregunta.respuestas.map(opcion => <Button key={opcion.id} variant="answer" disabled={bloqueado}
      aria-pressed={opcion.id === respuesta} onClick={() => onSelect(opcion.id)}>{opcion.texto}</Button>)}
  </div>;
}
