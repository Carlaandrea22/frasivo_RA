import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Box, CheckCircle2, CircleHelp, Layers, Link2, ListChecks, LogOut } from 'lucide-react';
import { categorias, estructuras } from '../../content/anatomy/catalogo';
import { retos } from '../../content/ejercicios/retos';
import { retoModeLabels, retoTypeLabels, type CategoriaAnatomica, type ModoReto, type PreguntaReto, type Reto, type TipoReto } from '../../content/types';
import type { RouteProps } from '../../shared/navegacion';
import { PracticeTabs } from '../../shared/navegacion/PracticarHome';
import { BottomSheet } from '../../shared/ui/BottomSheet';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ContentState } from '../../shared/ui/ContentState';
import { Segmented } from '../../shared/ui/Segmented';
import { Relacionar, Repasar, Senalar, Ubicar } from './Actividades';
import {
  asignar, corregir, emparejar, explicacion, guardarResultado, leerResultado, modeloDelResultado, nombreEstructura, puntuarCorrecciones,
  rutaFicha, rutaResultado, rutaReto, rutaRetos, tituloResultadoReto, tituloRetoParaEstructura, ultimoIntento,
  type Correccion, type Respuestas,
} from './intentos';
import './retos.css';

const tipos = {
  'ubica-partes': { nombre: retoTypeLabels['ubica-partes'], icon: Layers, minutos: 2, objetivo: 'Coloca cada etiqueta en el recuadro que señala su parte. Arrastra la ficha o tócala y luego toca el recuadro.' },
  'senala-estructura': { nombre: retoTypeLabels['senala-estructura'], icon: Box, minutos: 3, objetivo: 'Gira el modelo, toca la pieza que indica la consigna y confirma tu elección.' },
  'relaciona-funcion': { nombre: retoTypeLabels['relaciona-funcion'], icon: Link2, minutos: 2, objetivo: 'Elige la función de cada estructura. Puedes editar tus parejas antes de confirmar.' },
  'repaso-breve': { nombre: retoTypeLabels['repaso-breve'], icon: ListChecks, minutos: 1, objetivo: 'Elige la respuesta que mejor contesta cada pregunta.' },
} satisfies Record<TipoReto, { nombre: string; icon: typeof Box; minutos: number; objetivo: string }>;

const modos: Record<ModoReto, { label: string; descripcion: string }> = {
  entrenamiento: { label: retoModeLabels.entrenamiento, descripcion: 'Con pistas, reintentos y respuesta inmediata' },
  evaluacion: { label: retoModeLabels.evaluacion, descripcion: 'Sin ayuda y con la corrección al final' },
};

type TipoConModelo = 'ubica-partes' | 'senala-estructura';
const ordenDelCatalogo = ['ubica-partes', 'senala-estructura', 'relaciona-funcion', 'repaso-breve'] satisfies TipoReto[];
const selectorPorTipo = {
  'ubica-partes': { ruta: 'ubicar', descripcion: 'Coloca etiquetas en las partes de un modelo 3D.' },
  'senala-estructura': { ruta: 'senalar', descripcion: 'Gira un modelo 3D y toca la pieza indicada.' },
  'relaciona-funcion': { ruta: 'relacionar', descripcion: 'Empareja huesos, músculos u órganos con la función que cumplen.' },
  'repaso-breve': { ruta: 'repasar', descripcion: 'Responde preguntas rápidas sobre huesos, músculos u órganos.' },
};
const rutaSelector = (tipo: TipoReto, estructuraId?: string) =>
  `${rutaRetos}/${selectorPorTipo[tipo].ruta}${estructuraId ? `/estructura/${estructuraId}` : ''}`;

function usaModelo(tipo: TipoReto): tipo is TipoConModelo {
  return tipo === 'ubica-partes' || tipo === 'senala-estructura';
}

interface OpcionPractica {
  id: string;
  texto: string;
  categoria: CategoriaAnatomica | 'recorridos';
  reto: Reto;
  modeloId?: string;
}

function opcionesDePractica(tipo: TipoReto): readonly OpcionPractica[] {
  const actividades = retos.filter(reto => reto.tipo === tipo);
  if (!usaModelo(tipo)) return actividades.flatMap(reto => {
    const estructura = estructuras.find(item => item.id === reto.estructurasRelacionadas[0]);
    return estructura ? [{ id: reto.id, texto: reto.titulo, categoria: estructura.categoria, reto }] : [];
  });
  const modelos = estructuras.flatMap((estructura): OpcionPractica[] => {
    const reto = actividades.find(item => item.preguntas.some(pregunta => pregunta.estructuraId === estructura.id));
    return reto ? [{ id: estructura.id, texto: estructura.nombreEs, categoria: estructura.categoria, reto, modeloId: estructura.id }] : [];
  });
  const recorridos = actividades.filter(reto => reto.estructurasRelacionadas.length > 1).map((reto): OpcionPractica => ({
    id: reto.id, texto: `${reto.titulo} · ${reto.estructurasRelacionadas.length} modelos`, categoria: 'recorridos', reto,
  }));
  return [...modelos, ...recorridos];
}

function retoParaModelo(reto: Reto, modeloId: string): Reto {
  if (reto.estructurasRelacionadas.length === 1) return reto;
  const [primera, ...otras] = reto.preguntas.filter(pregunta => pregunta.estructuraId === modeloId);
  if (!primera) return reto;
  return {
    ...reto,
    titulo: tituloRetoParaEstructura(reto, modeloId),
    estructurasRelacionadas: [modeloId],
    preguntas: [primera, ...otras],
  };
}

function duracion(reto: Reto) {
  if (reto.tipo === 'ubica-partes') return Math.max(2, reto.estructurasRelacionadas.length);
  if (reto.tipo === 'senala-estructura') return Math.max(1, Math.ceil(reto.preguntas.length * 2 / 3));
  return tipos[reto.tipo].minutos;
}

function rondasDeReto(reto: Reto): readonly (readonly PreguntaReto[])[] {
  if (reto.tipo === 'relaciona-funcion') return [reto.preguntas];
  if (reto.tipo !== 'ubica-partes') return reto.preguntas.map(pregunta => [pregunta]);
  const porModelo = new Map<string, PreguntaReto[]>();
  for (const pregunta of reto.preguntas) {
    const ronda = porModelo.get(pregunta.estructuraId);
    if (ronda) ronda.push(pregunta);
    else porModelo.set(pregunta.estructuraId, [pregunta]);
  }
  return [...porModelo.values()];
}

function Tipo({ tipo }: { tipo: TipoReto }) {
  const { icon: Icon, nombre } = tipos[tipo];
  return <span className="retos-tipo"><Icon size={17} aria-hidden="true"/>{nombre}</span>;
}

function Fuentes({ reto }: { reto: Reto }) {
  return <details className="retos-fuentes">
    <summary>Fuentes y revisión</summary>
    {reto.revision.estado === 'provisional' && <p>Contenido provisional, pendiente de revisión profesional.</p>}
    <ul>{reto.revision.fuentes.map(fuente => <li key={fuente.url}><a href={fuente.url} target="_blank" rel="noreferrer">{fuente.titulo}</a></li>)}</ul>
  </details>;
}

function Lista({ estructuraId }: { estructuraId?: string }) {
  const disponibles = estructuraId ? retos.filter(reto => reto.estructurasRelacionadas.includes(estructuraId)) : retos;
  const grupos = ordenDelCatalogo.map(tipo => ({
    tipo, actividades: disponibles.filter(reto => reto.tipo === tipo),
  })).filter(grupo => grupo.actividades.length > 0);
  return <section className="lumar-page retos-page">
    <header>
      <h1>Retos de anatomía</h1>
      <p className="lumar-subtitle">{estructuraId ? `Practica con ${nombreEstructura(estructuraId)}.` : 'Pon a prueba lo que aprendiste en Explorar 3D.'}</p>
    </header>
    <PracticeTabs active="retos"/>
    {estructuraId && <a className="retos-back" href={rutaRetos}>Ver todos los retos</a>}
    {grupos.length > 0 && <div className="retos-grid">
      {grupos.map(grupo => <TarjetaSelector key={grupo.tipo} {...grupo} estructuraId={estructuraId}/>)}
    </div>}
    {disponibles.length === 0 && <ContentState state="empty" title="Aún no hay un reto para esta estructura">
      <a href={rutaRetos}>Ver todos los retos</a>
    </ContentState>}
  </section>;
}

function TarjetaSelector({ tipo, actividades, estructuraId }: { tipo: TipoReto; actividades: readonly Reto[]; estructuraId?: string }) {
  const { icon: Icon, nombre } = tipos[tipo];
  const ubicar = tipo === 'ubica-partes';
  const accion = ubicar ? 'Elegir práctica' : tipo === 'senala-estructura' ? 'Elegir modelo' : 'Elegir tema';
  const ultimo = actividades.map(ultimoIntento).filter(evento => evento?.kind === 'practice')
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  return <Card className="retos-card">
    <div className="retos-card-title"><Icon size={20} aria-hidden="true"/><h2>{nombre}</h2></div>
    <p>{selectorPorTipo[tipo].descripcion}</p>
    <div className="retos-actions">
      <a className="button button--primary lumar-link" href={rutaSelector(tipo, estructuraId)}
        aria-label={ubicar ? undefined : `${accion} para ${nombre}`}>
        {accion}<ArrowRight size={17} aria-hidden="true"/>
      </a>
      {ultimo?.activityId && <a className="retos-history" href={rutaResultado(ultimo.activityId, ultimo.id)}>
        Último resultado: {ultimo.correct} de {ultimo.correct+ultimo.errors}
      </a>}
    </div>
  </Card>;
}

function SelectorModo({ opciones, modo, onChange }: { opciones: readonly ModoReto[]; modo: ModoReto; onChange: (id: ModoReto) => void }) {
  return <>
    <h2>Elige un modo</h2>
    <Segmented label="Modo del reto" value={modo}
      options={opciones.map(id => ({ id, label: modos[id].label }))}
      onChange={id => onChange(id as ModoReto)}/>
    <p role="status">{modos[modo].descripcion}.</p>
  </>;
}

export function UbicaInicio({ params }: RouteProps) {
  return <ConfigurarPractica key={params.estructuraId ?? 'todos'} tipo="ubica-partes" estructuraId={params.estructuraId}/>;
}

export function SenalaInicio({ params }: RouteProps) {
  return <ConfigurarPractica key={params.estructuraId ?? 'todos'} tipo="senala-estructura" estructuraId={params.estructuraId}/>;
}

export function RelacionaInicio({ params }: RouteProps) {
  return <ConfigurarPractica key={params.estructuraId ?? 'todos'} tipo="relaciona-funcion" estructuraId={params.estructuraId}/>;
}

export function RepasoInicio({ params }: RouteProps) {
  return <ConfigurarPractica key={params.estructuraId ?? 'todos'} tipo="repaso-breve" estructuraId={params.estructuraId}/>;
}

const gruposDeOpciones = [...categorias, { id: 'recorridos', nombre: 'Recorridos de varios modelos' }] as const;

function ConfigurarPractica({ tipo, estructuraId }: { tipo: TipoReto; estructuraId?: string }) {
  const porModelo = usaModelo(tipo);
  const opciones = useMemo(() => opcionesDePractica(tipo), [tipo]);
  const [seleccion, setSeleccion] = useState(() => estructuraId ? opciones.find(opcion =>
    porModelo ? opcion.modeloId === estructuraId : opcion.reto.estructurasRelacionadas.includes(estructuraId),
  )?.id ?? '' : '');
  const [aleatorio, setAleatorio] = useState(false);
  const [modo, setModo] = useState<ModoReto>('entrenamiento');
  const [jugando, setJugando] = useState<Reto>();
  const elegida = opciones.find(opcion => opcion.id === seleccion);
  const azar = porModelo ? opciones.filter(opcion => opcion.modeloId) : opciones;
  if (jugando) return <Juego reto={jugando} modo={modo}/>;

  function empezar() {
    const opcion = aleatorio ? azar[Math.floor(Math.random()*azar.length)] : elegida;
    if (opcion) setJugando(opcion.modeloId ? retoParaModelo(opcion.reto, opcion.modeloId) : opcion.reto);
  }

  return <section className="lumar-page retos-page">
    <header><a className="retos-back" href={estructuraId ? `${rutaRetos}/estructura/${estructuraId}` : rutaRetos}>
      <ArrowLeft size={18} aria-hidden="true"/>Volver a los retos
    </a><h1>{tipos[tipo].nombre}</h1></header>
    <Card className="retos-card retos-configurar">
      <h2>¿Qué quieres practicar?</h2>
      <Segmented label="Selección de práctica" value={aleatorio ? 'azar' : 'elegir'}
        options={[{ id: 'elegir', label: 'Elegir' }, { id: 'azar', label: 'Aleatorio' }]}
        onChange={id => setAleatorio(id === 'azar')}/>
      {aleatorio ? <p role="status">{porModelo ? 'El reto elegirá un modelo del atlas cuando empieces.' : 'El reto elegirá un tema cuando empieces.'}</p> : <label className="retos-model-select">
        {porModelo ? 'Modelo o recorrido' : 'Tema'}
        <select value={seleccion} onChange={event => setSeleccion(event.target.value)}>
          <option value="">Elige una opción</option>
          {gruposDeOpciones.map(grupo => {
            const opcionesDelGrupo = opciones.filter(opcion => opcion.categoria === grupo.id);
            return opcionesDelGrupo.length > 0 && <optgroup key={grupo.id} label={grupo.nombre}>
              {opcionesDelGrupo.map(opcion => <option key={opcion.id} value={opcion.id}>{opcion.texto}</option>)}
            </optgroup>;
          })}
        </select>
      </label>}
      <SelectorModo opciones={['entrenamiento','evaluacion']} modo={modo} onChange={setModo}/>
      <Button className="retos-start" disabled={aleatorio ? azar.length === 0 : !elegida} onClick={empezar}>Empezar reto</Button>
      {!aleatorio && elegida && <Fuentes reto={elegida.reto}/>}
    </Card>
  </section>;
}

function Preparar({ reto }: { reto: Reto }) {
  const [modo, setModo] = useState(reto.modos[0]);
  const [iniciado, setIniciado] = useState(false);
  const ultimo = ultimoIntento(reto);
  if (iniciado) return <Juego reto={reto} modo={modo}/>;
  return <section className="lumar-page retos-page">
    <header><a className="retos-back" href={rutaRetos}><ArrowLeft size={18} aria-hidden="true"/>Todos los retos</a>
      <h1>{reto.titulo}</h1>
    </header>
    <PracticeTabs active="retos"/>
    <Card className="retos-card">
      <Tipo tipo={reto.tipo}/>
      <h2>Objetivo</h2>
      <p>{tipos[reto.tipo].objetivo}</p>
      <p className="retos-meta">{reto.preguntas.length} {reto.tipo === 'ubica-partes' ? 'etiquetas' : 'preguntas'} · ~{duracion(reto)} min</p>
      <SelectorModo opciones={reto.modos} modo={modo} onChange={setModo}/>
      <Button className="retos-start" onClick={() => setIniciado(true)}>Empezar reto</Button>
      {ultimo?.kind === 'practice' && <a className="retos-history" href={rutaResultado(reto.id, ultimo.id)}>Ver último resultado</a>}
      <Fuentes reto={reto}/>
    </Card>
  </section>;
}

export function Juego({ reto, modo, quick }: {
  reto: Reto;
  modo: ModoReto;
  quick?: { finish: (score: ReturnType<typeof puntuarCorrecciones>) => boolean; exit: () => void };
}) {
  const ubicar = reto.tipo === 'ubica-partes';
  const tablero = ubicar || reto.tipo === 'relaciona-funcion';
  const rondas = useMemo(() => rondasDeReto(reto), [reto]);
  const entrenamiento = modo === 'entrenamiento';
  const [paso, setPaso] = useState(0);
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [reveladas, setReveladas] = useState(0);
  const [pistasTotales, setPistasTotales] = useState(0);
  const [previos, setPrevios] = useState<Readonly<Record<string, readonly string[]>>>({});
  const [correccion, setCorreccion] = useState<Correccion[]>();
  const [terminadas, setTerminadas] = useState<Correccion[]>([]);
  const [intentoRapido, setIntentoRapido] = useState<string>();
  const guardado = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const ayudaId = useId();
  const preguntas = rondas[paso];
  const pregunta = preguntas[0];
  const pistas = preguntas.flatMap(p => p.pistas);
  const completas = preguntas.every(p => respuestas[p.id]);
  const ultima = paso === rondas.length-1;
  const fallo = correccion?.some(row => !row.acierto) ?? false;
  const accionEvaluacion = ultima ? 'Ver resultado' : ubicar ? 'Siguiente modelo' : 'Siguiente';
  const faltaResponder = {
    'ubica-partes': 'Coloca todas las etiquetas de este modelo para continuar.',
    'relaciona-funcion': 'Forma todas las parejas para continuar.',
    'senala-estructura': 'Toca una pieza del modelo para continuar.',
    'repaso-breve': 'Elige una respuesta para continuar.',
  }[reto.tipo];

  useEffect(() => heading.current?.focus(), [paso]);

  function seleccionar(id?: string) {
    setRespuestas(id ? { [pregunta.id]: id } : {});
  }
  function quitar(id: string) {
    setRespuestas(current => Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)));
  }
  function avanzar(filas: Correccion[]) {
    const todas = [...terminadas,...filas];
    if (ultima) {
      if (guardado.current || (quick && !quick.finish(puntuarCorrecciones(todas)))) return;
      guardado.current = true;
      const intento = guardarResultado(reto, { modo, totalPistas: pistasTotales, correcciones: todas, quick: quick ? true : undefined });
      if (quick) setIntentoRapido(intento.id);
      else window.location.hash = rutaResultado(reto.id, intento.id);
      return;
    }
    setTerminadas(todas);
    setPaso(paso+1);
    setRespuestas({});
    setReveladas(0);
    setCorreccion(undefined);
  }
  function comprobar() {
    if (!completas || correccion) return;
    const filas = corregir(preguntas,respuestas,previos);
    if (entrenamiento) setCorreccion(filas);
    else avanzar(filas);
  }
  function reintentar() {
    const siguiente = { ...previos };
    for (const fila of correccion ?? []) if (!fila.acierto) {
      siguiente[fila.preguntaId] = [...fila.erroresPrevios,fila.respuestaId];
    }
    setPrevios(siguiente);
    if (!tablero) setRespuestas({});
    setCorreccion(undefined);
  }

  const tableroProps = {
    preguntas, respuestas, bloqueado: !!correccion,
    onAssign: (id: string, opcion: string) => setRespuestas(current =>
      reto.tipo === 'relaciona-funcion' ? emparejar(current,id,opcion) : asignar(current,id,opcion),
    ),
    onRemove: quitar,
  };
  const opcionProps = { pregunta, respuesta: respuestas[pregunta.id], bloqueado: !!correccion, onSelect: seleccionar };
  const progreso = tablero ? preguntas.filter(p => respuestas[p.id]).length : paso+1;

  if (intentoRapido && quick) return <Resultados reto={reto} intento={intentoRapido} quickExit={quick.exit}/>;

  return <section className="lumar-page retos-page">
    <header className="retos-run-header">
      <div>{!quick && <p className="retos-meta">{modos[modo].label}</p>}<h1>{reto.titulo}</h1></div>
      <BottomSheet trigger="Salir" title="¿Salir del reto?">
        <p>Se perderá lo que respondiste en este intento.</p>
        {quick ? <Button onClick={quick.exit}><LogOut size={16} aria-hidden="true"/>Salir del reto</Button>
          : <a className="button button--primary lumar-link retos-quit" href={rutaRetos}><LogOut size={16} aria-hidden="true"/>Salir del reto</a>}
      </BottomSheet>
    </header>
    <div className="retos-progress">
      {ubicar && rondas.length > 1 && <p>Modelo {paso + 1} de {rondas.length}</p>}
      <p>{tablero ? `${progreso} de ${preguntas.length} ${reto.tipo === 'relaciona-funcion' ? 'parejas formadas' : 'etiquetas colocadas'}` : `Pregunta ${progreso} de ${reto.preguntas.length}`}</p>
      <progress aria-label="Progreso del reto" max={reto.preguntas.length} value={tablero ? terminadas.length + progreso : progreso}/>
      {!entrenamiento && <p className="retos-meta">Verás los aciertos y la corrección al terminar.</p>}
    </div>
    <Card className="retos-card">
      <h2 tabIndex={-1} ref={heading}>{ubicar && rondas.length > 1 ? nombreEstructura(pregunta.estructuraId) : tablero ? tipos[reto.tipo].nombre : pregunta.enunciado}</h2>
      {ubicar && <p>{tipos[reto.tipo].objetivo}</p>}
      {ubicar && <Ubicar key={paso} {...tableroProps}/>}
      {reto.tipo === 'relaciona-funcion' && <Relacionar {...tableroProps}/>}
      {reto.tipo === 'senala-estructura' && <Senalar key={pregunta.estructuraId} {...opcionProps}/>}
      {reto.tipo === 'repaso-breve' && <Repasar {...opcionProps}/>}
      {entrenamiento && <div className="retos-hints">
        <Button variant="secondary" disabled={reveladas >= pistas.length || !!correccion}
          onClick={() => { setReveladas(reveladas+1); setPistasTotales(pistasTotales+1); }}>
          <CircleHelp size={17} aria-hidden="true"/>Pista ({pistas.length-reveladas})
        </Button>
        {reveladas > 0 && <div role="status">{pistas.slice(0,reveladas).map((pista,index) => <p key={index}>{pista}</p>)}</div>}
      </div>}
      {correccion && <div className="retos-feedback" data-ok={!fallo} role="status">
        <strong>{fallo ? 'Vuelve a intentarlo' : '¡Correcto!'}</strong>
        {correccion.filter(row => !row.acierto).map(row => {
          const p = preguntas.find(item => item.id === row.preguntaId)!;
          return <div key={p.id}>
            <p>{explicacion(p,row.respuestaId)}</p>
            <a href={rutaFicha(p.estructuraId)} target="_blank" rel="noopener">Ver en Explorar 3D</a>
          </div>;
        })}
      </div>}
      {!completas && <p id={ayudaId} className="retos-meta">{faltaResponder}</p>}
      <div className="retos-actions">
        {!correccion ? <Button disabled={!completas} aria-describedby={!completas ? ayudaId : undefined} onClick={comprobar}>
          {entrenamiento ? 'Comprobar' : accionEvaluacion}
        </Button> : <>
          {fallo && <Button onClick={reintentar}>Reintentar</Button>}
          <Button variant={fallo ? 'secondary' : 'primary'} onClick={() => avanzar(correccion)}>
            {ultima ? 'Ver resultado' : 'Siguiente'}
          </Button>
        </>}
      </div>
    </Card>
  </section>;
}

function Resultados({ reto, intento, quickExit }: { reto: Reto; intento: string; quickExit?: () => void }) {
  const resultado = leerResultado(reto,intento);
  const [soloErrores, setSoloErrores] = useState(false);
  const lista = useRef<HTMLHeadingElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => titulo.current?.focus(), [intento]);
  if (!resultado) return <section className="lumar-page"><ContentState state="unavailable" title="Resultado no disponible en este dispositivo">
    <a href={rutaReto(reto.id)}>Abrir el reto</a>
  </ContentState></section>;

  const { registro, correcciones, modo } = resultado;
  const modeloId = modeloDelResultado(reto, registro);
  const repetir = modeloId ? rutaSelector(reto.tipo, modeloId) : rutaReto(reto.id);
  const errores = correcciones.filter(row => !row.acierto || row.erroresPrevios.length > 0);
  const filas = soloErrores ? errores : correcciones;
  return <section className="lumar-page retos-page">
    <header><p className="retos-meta">{registro.quick ? 'Práctica rápida' : modos[modo].label}</p><h1 tabIndex={-1} ref={titulo}>Resultado del reto</h1></header>
    <Card className="retos-score">
      <h2>{tituloResultadoReto(reto, registro)}</h2>
      <p className="retos-score-value">{registro.correct} de {registro.correct+registro.errors}</p>
      <p>{registro.errors} {registro.errors === 1 ? 'error final' : 'errores finales'} · {registro.hints} {registro.hints === 1 ? 'pista usada' : 'pistas usadas'}</p>
    </Card>
    <div className="retos-actions">
      {quickExit ? <Button onClick={quickExit}>Terminar práctica</Button> : <>
        <a className="button button--primary lumar-link" href={repetir}>Repetir</a>
        <a className="button button--secondary lumar-link" href={rutaRetos}>Otro reto</a>
      </>}
      {errores.length > 0 && <Button variant="secondary" aria-pressed={soloErrores}
        onClick={() => { setSoloErrores(!soloErrores); lista.current?.focus(); }}>
        {soloErrores ? 'Ver todas las preguntas' : 'Repasar errores'}
      </Button>}
    </div>
    {correcciones.length > 0 && <div className="retos-resultados">
      <h2 tabIndex={-1} ref={lista}>{soloErrores ? 'Errores para repasar' : 'Revisión de respuestas'}</h2>
      {filas.map(row => {
        const p = reto.preguntas.find(item => item.id === row.preguntaId)!;
        const respuesta = p.respuestas.find(item => item.id === row.respuestaId);
        const correcta = p.respuestas.find(item => item.id === p.correctaId);
        const paraRepasar = !row.acierto || row.erroresPrevios.length > 0;
        return <Card className="retos-result-card" key={row.preguntaId} data-ok={row.acierto}>
          <p className="retos-result-status">{row.acierto && <CheckCircle2 size={16} aria-hidden="true"/>}
            {row.acierto ? row.erroresPrevios.length ? 'Acierto tras reintentar' : 'Acierto' : 'Error'}
          </p>
          <h3>{p.enunciado}</h3>
          <p>Tu respuesta: <strong>{respuesta?.texto}</strong></p>
          {paraRepasar && <>
            {!row.acierto && <p>Respuesta correcta: <strong>{correcta?.texto}</strong></p>}
            {row.erroresPrevios.length > 0 && <p>Intentos anteriores: {[...new Set(row.erroresPrevios)].map(id => p.respuestas.find(item => item.id === id)?.texto).filter(Boolean).join(', ')}</p>}
            <p>{explicacion(p,row.acierto ? row.erroresPrevios[0] : row.respuestaId)}</p>
            <a href={rutaFicha(p.estructuraId)}>Ver en Explorar 3D</a>
          </>}
        </Card>;
      })}
    </div>}
  </section>;
}

function RecommendedChallenge({ options }: { options: readonly Reto[] }) {
  const [reto] = useState(() => options[Math.floor(Math.random() * options.length)]);
  return <Juego reto={reto} modo="entrenamiento"/>;
}

export function RetoRecomendado({ params }: RouteProps) {
  const options = retos.filter(reto => reto.tipo === params.modo && reto.modos.includes('entrenamiento'));
  if (options.length) return <RecommendedChallenge key={params.modo} options={options}/>;
  return <section className="lumar-page"><ContentState state="unavailable" title="Modo de reto no disponible">
    <a href={rutaRetos}>Ver retos de anatomía</a>
  </ContentState></section>;
}

export function Retos({ params }: RouteProps) {
  if (!params.id) return <Lista estructuraId={params.estructuraId}/>;
  const reto = retos.find(item => item.id === params.id);
  if (!reto) return <section className="lumar-page"><ContentState state="unavailable" title="Reto no disponible">
    <a href={rutaRetos}>Volver a Retos de anatomía</a>
  </ContentState></section>;
  return params.intento ? <Resultados reto={reto} intento={params.intento} key={params.intento}/> : <Preparar key={reto.id} reto={reto}/>;
}
