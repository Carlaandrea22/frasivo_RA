import { lazy, Suspense, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CircleDot, GripVertical } from 'lucide-react';
import { estructuras } from '../../content/anatomy/catalogo';
import { modelos } from '../../content/anatomy/modelos';
import { anotaciones } from '../../content/anotaciones/anatomia';
import type { PreguntaReto } from '../../content/types';
import { Button } from '../../shared/ui/Button';
import { ContentState } from '../../shared/ui/ContentState';
import type { Viewer3DProjectedAnchor } from '../../shared/visor3d/Viewer3D';
import { distribuirEtiquetas } from '../explorar/atlas';
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

export function Relacionar({ preguntas, respuestas, bloqueado, onAssign, onRemove }: TableroProps) {
  const [activa, setActiva] = useState<string>();
  return <div className="retos-pairs">
    <div className="retos-option-list" role="group" aria-label="Estructuras">
      <h3>Estructuras</h3>
      {preguntas.map((pregunta, index) => <Button key={pregunta.id} variant="answer"
        disabled={bloqueado} data-pair={respuestas[pregunta.id] ? index : undefined} aria-pressed={activa === pregunta.id}
        onClick={() => setActiva(activa === pregunta.id ? undefined : pregunta.id)}>
        {nombreEstructura(pregunta.estructuraId)} {respuestas[pregunta.id] && <span className="retos-pair-badge" aria-label={`Pareja ${index+1}`}>{index+1}</span>}
      </Button>)}
    </div>
    <div className="retos-option-list" role="group" aria-label="Funciones">
      <h3>Funciones</h3>
      {preguntas[0].respuestas.map(opcion => {
        const pareja = preguntas.findIndex(p => respuestas[p.id] === opcion.id);
        return <Button key={opcion.id} variant="answer" disabled={bloqueado || (!activa && pareja < 0)}
          data-pair={pareja >= 0 ? pareja : undefined} onClick={() => {
            if (activa) { onAssign(activa,opcion.id); setActiva(undefined); }
            else if (pareja >= 0) onRemove(preguntas[pareja].id);
          }}>
          {opcion.texto} {pareja >= 0 && <span className="retos-pair-badge" aria-label={`Pareja ${pareja+1}`}>{pareja+1}</span>}
        </Button>;
      })}
    </div>
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
  const grupos = Math.max(1, Math.ceil(visibles.length/6));
  const grupoActivo = grupo % grupos;
  const marcadoresNumerados = numeradas && visibles.length > 6
    ? distribuirEtiquetas(visibles.slice(grupoActivo*6, grupoActivo*6+6), projection.width, projection.height)
    : markers;
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
            {marcadoresNumerados.map(marker => {
              const numero = respuestas.findIndex(opcion => opcion.id === marker.id)+1;
              return <Button key={marker.id} variant="secondary" className="retos-number" style={styleMarker(marker)}
                disabled={bloqueado} aria-label={`Pieza ${numero}`} aria-pressed={respuesta === marker.id}
                onClick={() => onSelect(marker.id)}>{numero}</Button>;
            })}
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
