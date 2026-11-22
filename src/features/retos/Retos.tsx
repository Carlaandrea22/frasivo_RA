import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Box, CheckCircle2, CircleHelp, Clock, Layers, Link2, ListChecks, LogOut } from 'lucide-react';
import { retos } from '../../content/ejercicios/retos';
import type { ModoReto, PreguntaReto, Reto, TipoReto } from '../../content/types';
import type { RouteProps } from '../../shared/navegacion';
import { PracticeTabs } from '../../shared/navegacion/PracticarHome';
import { BottomSheet } from '../../shared/ui/BottomSheet';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ContentState } from '../../shared/ui/ContentState';
import { Segmented } from '../../shared/ui/Segmented';
import { Relacionar, Repasar, Senalar, Ubicar } from './Actividades';
import {
  asignar, corregir, explicacion, guardarResultado, leerResultado, nombreEstructura,
  rutaFicha, rutaResultado, rutaReto, rutaRetos, ultimoIntento,
  type Correccion, type Respuestas,
} from './intentos';
import './retos.css';

const tipos = {
  'ubica-partes': { nombre: 'Ubica las partes', icon: Layers, minutos: 2, objetivo: 'Coloca cada etiqueta en el recuadro que señala su parte. Arrastra la ficha o tócala y luego toca el recuadro.' },
  'senala-estructura': { nombre: 'Señala la estructura', icon: Box, minutos: 3, objetivo: 'Gira el modelo, toca la pieza que indica la consigna y confirma tu elección.' },
  'relaciona-funcion': { nombre: 'Relaciona estructura y función', icon: Link2, minutos: 2, objetivo: 'Toca una estructura y luego su función para formar una pareja. Comprueba todas las parejas juntas.' },
  'repaso-breve': { nombre: 'Repaso breve', icon: ListChecks, minutos: 1, objetivo: 'Elige la respuesta que mejor contesta cada pregunta.' },
} satisfies Record<TipoReto, { nombre: string; icon: typeof Box; minutos: number; objetivo: string }>;

const modos: Record<ModoReto, { label: string; descripcion: string }> = {
  entrenamiento: { label: 'Entrenamiento', descripcion: 'Con pistas, reintentos y respuesta inmediata' },
  evaluacion: { label: 'Evaluación', descripcion: 'Sin ayuda y con la corrección al final' },
};

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
  return <section className="lumar-page retos-page">
    <header>
      <h1>Retos de anatomía</h1>
      <p className="lumar-subtitle">{estructuraId ? `Practica con ${nombreEstructura(estructuraId)}.` : 'Pon a prueba lo que aprendiste en Explorar 3D.'}</p>
    </header>
    <PracticeTabs active="retos"/>
    {estructuraId && <a className="retos-back" href={rutaRetos}>Ver todos los retos</a>}
    {disponibles.length ? <div className="retos-grid">
      {disponibles.map(reto => {
        const resultado = ultimoIntento(reto);
        return <Card key={reto.id} className="retos-card">
          <Tipo tipo={reto.tipo}/>
          <h2>{reto.titulo}</h2>
          <p>{reto.estructurasRelacionadas.map(nombreEstructura).join(', ')}</p>
          <p className="retos-meta"><Clock size={15} aria-hidden="true"/> ~{tipos[reto.tipo].minutos} min · {reto.modos.map(modo => modos[modo].label).join(' y ')}</p>
          {resultado?.kind === 'practice' && <a className="retos-history" href={rutaResultado(reto.id, resultado.id)}>
            Último resultado: {resultado.correct} de {resultado.correct+resultado.errors}
          </a>}
          <a className="button button--primary lumar-link" href={rutaReto(reto.id)} aria-label={`Abrir reto: ${reto.titulo}`}>Abrir reto</a>
        </Card>;
      })}
    </div> : <ContentState state="empty" title="Aún no hay un reto para esta estructura">
      <a href={rutaRetos}>Ver todos los retos</a>
    </ContentState>}
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
      <p className="retos-meta">{reto.preguntas.length} preguntas · ~{tipos[reto.tipo].minutos} min</p>
      <h2>Elige un modo</h2>
      <Segmented label="Modo del reto" value={modo}
        options={reto.modos.map(id => ({ id, label: modos[id].label }))}
        onChange={id => setModo(id as ModoReto)}/>
      <p role="status">{modos[modo].descripcion}.</p>
      <Button className="retos-start" onClick={() => setIniciado(true)}>Empezar reto</Button>
      {ultimo?.kind === 'practice' && <a className="retos-history" href={rutaResultado(reto.id, ultimo.id)}>Ver último resultado</a>}
      <Fuentes reto={reto}/>
    </Card>
  </section>;
}

function Juego({ reto, modo }: { reto: Reto; modo: ModoReto }) {
  const tablero = reto.tipo === 'ubica-partes' || reto.tipo === 'relaciona-funcion';
  const entrenamiento = modo === 'entrenamiento';
  const [paso, setPaso] = useState(0);
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [reveladas, setReveladas] = useState(0);
  const [pistasTotales, setPistasTotales] = useState(0);
  const [previos, setPrevios] = useState<Readonly<Record<string, readonly string[]>>>({});
  const [correccion, setCorreccion] = useState<Correccion[]>();
  const [terminadas, setTerminadas] = useState<Correccion[]>([]);
  const guardado = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const pregunta = reto.preguntas[paso];
  const preguntas = tablero ? reto.preguntas : [pregunta];
  const pistas = preguntas.flatMap(p => p.pistas);
  const completas = preguntas.every(p => respuestas[p.id]);
  const ultima = tablero || paso === reto.preguntas.length-1;
  const fallo = correccion?.some(row => !row.acierto) ?? false;

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
      if (guardado.current) return;
      guardado.current = true;
      window.location.hash = guardarResultado(reto, { modo, totalPistas: pistasTotales, correcciones: todas });
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
    preguntas: reto.preguntas, respuestas, bloqueado: !!correccion,
    onAssign: (id: string, opcion: string) => setRespuestas(current => asignar(current,id,opcion)),
    onRemove: quitar,
  };
  const opcionProps = { pregunta, respuesta: respuestas[pregunta.id], bloqueado: !!correccion, onSelect: seleccionar };
  const progreso = tablero ? preguntas.filter(p => respuestas[p.id]).length : paso+1;

  return <section className="lumar-page retos-page">
    <header className="retos-run-header">
      <div><p className="retos-meta">{modos[modo].label}</p><h1>{reto.titulo}</h1></div>
      <BottomSheet trigger="Salir" title="¿Salir del reto?">
        <p>Se perderá lo que respondiste en este intento.</p>
        <a className="button button--primary lumar-link retos-quit" href={rutaRetos}><LogOut size={16} aria-hidden="true"/>Salir del reto</a>
      </BottomSheet>
    </header>
    <div className="retos-progress">
      <p>{tablero ? `${progreso} de ${preguntas.length} ${reto.tipo === 'relaciona-funcion' ? 'parejas formadas' : 'etiquetas colocadas'}` : `Pregunta ${progreso} de ${reto.preguntas.length}`}</p>
      <progress aria-label="Progreso del reto" max={reto.preguntas.length} value={progreso}/>
    </div>
    <Card className="retos-card">
      <h2 tabIndex={-1} ref={heading}>{tablero ? tipos[reto.tipo].nombre : pregunta.enunciado}</h2>
      {tablero && <p>{tipos[reto.tipo].objetivo}</p>}
      {reto.tipo === 'ubica-partes' && <Ubicar {...tableroProps}/>}
      {reto.tipo === 'relaciona-funcion' && <Relacionar {...tableroProps}/>}
      {reto.tipo === 'senala-estructura' && <Senalar {...opcionProps}/>}
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
      <div className="retos-actions">
        {!correccion ? <Button disabled={!completas} onClick={comprobar}>
          {entrenamiento || tablero ? 'Comprobar' : ultima ? 'Ver resultado' : 'Siguiente'}
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

function Resultados({ reto, intento }: { reto: Reto; intento: string }) {
  const resultado = leerResultado(reto,intento);
  const [soloErrores, setSoloErrores] = useState(false);
  const lista = useRef<HTMLHeadingElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => titulo.current?.focus(), [intento]);
  if (!resultado) return <section className="lumar-page"><ContentState state="unavailable" title="Resultado no disponible en este dispositivo">
    <a href={rutaReto(reto.id)}>Abrir el reto</a>
  </ContentState></section>;

  const { registro, correcciones, modo } = resultado;
  const errores = correcciones.filter(row => !row.acierto || row.erroresPrevios.length > 0);
  const filas = soloErrores ? errores : correcciones;
  return <section className="lumar-page retos-page">
    <header><p className="retos-meta">{modos[modo].label}</p><h1 tabIndex={-1} ref={titulo}>Resultado del reto</h1></header>
    <Card className="retos-score">
      <h2>{reto.titulo}</h2>
      <p className="retos-score-value">{registro.correct} de {registro.correct+registro.errors}</p>
      <p>{registro.errors} {registro.errors === 1 ? 'error final' : 'errores finales'} · {registro.hints} {registro.hints === 1 ? 'pista usada' : 'pistas usadas'}</p>
    </Card>
    <div className="retos-actions">
      <a className="button button--primary lumar-link" href={rutaReto(reto.id)}>Repetir</a>
      <a className="button button--secondary lumar-link" href={rutaRetos}>Otro reto</a>
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

export function Retos({ params }: RouteProps) {
  if (!params.id) return <Lista estructuraId={params.estructuraId}/>;
  const reto = retos.find(item => item.id === params.id);
  if (!reto) return <section className="lumar-page"><ContentState state="unavailable" title="Reto no disponible">
    <a href={rutaRetos}>Volver a Retos de anatomía</a>
  </ContentState></section>;
  return params.intento ? <Resultados reto={reto} intento={params.intento} key={params.intento}/> : <Preparar key={reto.id} reto={reto}/>;
}
