import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Link2, RotateCcw, UserRound } from 'lucide-react';
import type { MatchingCase } from '../../content/casos/sessionTypes';
import { useEvaluationPronunciation } from '../../shared/evaluacion/useEvaluationPronunciation';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { EnglishTerm } from '../../shared/ui/EnglishTerm';
import { Bilingual } from './Bilingual';
import { CaseResult, type CaseStepProps, type Score } from './ClinicalResult';
import { shuffled } from './clinicalEngine';
import './clinical-matching.css';

type Point = { x: number; y: number };
type Endpoint = { side: 'patient' | 'cause'; id: string };
type Drag = { from: Endpoint; pointer: number; start: Point; cursor: Point };
const colors = ['#267e67', '#7254a6', '#b36426'];
const endpointKey = ({ side, id }: Endpoint) => `${side}:${id}`;
const sameEndpoint = (a: Endpoint | undefined, b: Endpoint) => a?.side === b.side && a.id === b.id;

function relativePoint(area: HTMLElement, x: number, y: number): Point {
  const box = area.getBoundingClientRect();
  return { x: x - box.left, y: y - box.top };
}

function wirePath(from: Point, to: Point, compact: boolean, index: number) {
  if (compact) {
    const arc = Math.max(from.x + 14 + index * 7, to.x + 8);
    return `M ${from.x} ${from.y} C ${arc} ${from.y + 18}, ${arc} ${to.y + 12}, ${to.x} ${to.y}`;
  }
  const drop = Math.min(100, Math.max(24, Math.abs(to.y - from.y) * .46 + Math.abs(to.x - from.x) * .13));
  const drift = index === 1 ? 24 : -18;
  const lane = (index - 1) * Math.min(20, Math.abs(to.y - from.y) * .22);
  return `M ${from.x} ${from.y} C ${from.x + drift} ${from.y + drop + lane}, ${to.x + drift} ${to.y - drop * .8 + lane}, ${to.x} ${to.y}`;
}

export function ClinicalMatching({ item, ...step }: CaseStepProps<MatchingCase>) {
  const board = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<Record<string, Point>>({});
  const [compact, setCompact] = useState(false);
  const [connections, setConnections] = useState<Readonly<Record<string, string>>>({});
  const [selected, setSelected] = useState<Endpoint>();
  const [preview, setPreview] = useState<{ from: Endpoint; point: Point }>();
  const [score, setScore] = useState<Score>();
  const gesture = useRef<Drag>(undefined);
  const ignoreClick = useRef(false);
  const causes = useMemo(() => shuffled(item.causes), [item]);
  const dragging = !!preview;
  useEvaluationPronunciation(score ? 'result' : 'matching');

  useLayoutEffect(() => {
    const area = board.current;
    if (!area || score) return;
    const ports = [...area.querySelectorAll<HTMLElement>('[data-match-port]')];
    const update = () => {
      const box = area.getBoundingClientRect();
      setCompact(matchMedia('(max-width: 640px)').matches);
      setPoints(Object.fromEntries(ports.map(port => {
        const rect = port.getBoundingClientRect();
        return [port.dataset.matchPort, { x: rect.left + rect.width / 2 - box.left, y: rect.top + rect.height / 2 - box.top }];
      })));
    };
    const observer = new ResizeObserver(update);
    observer.observe(area);
    ports.forEach(port => observer.observe(port.parentElement!));
    update();
    return () => observer.disconnect();
  }, [causes, score]);

  useEffect(() => {
    if (!dragging) return;
    let frame: number;
    const follow = () => {
      const drag = gesture.current;
      const area = board.current;
      if (!drag || !area) return;
      const above = Math.max(0, 65 - drag.cursor.y);
      const below = Math.max(0, drag.cursor.y - (window.innerHeight - 100));
      if (above || below) {
        const before = window.scrollY;
        window.scrollBy({ top: Math.max(-15, Math.min(15, (below - above) / 5)), behavior: 'instant' });
        if (window.scrollY !== before) setPreview({ from: drag.from, point: relativePoint(area, drag.cursor.x, drag.cursor.y) });
      }
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [dragging]);

  const connect = (from: Endpoint, to: Endpoint) => {
    const [patient, cause] = from.side === 'patient' ? [from.id, to.id] : [to.id, from.id];
    setConnections(current => {
      const next = Object.fromEntries(Object.entries(current).filter(([id, target]) => id !== patient && target !== cause));
      if (current[patient] !== cause) next[patient] = cause;
      return next;
    });
    setSelected(undefined);
  };

  const begin = (event: PointerEvent<HTMLButtonElement>, from: Endpoint) => {
    ignoreClick.current = false;
    if (!board.current || event.button !== 0 || !(event.target as Element).closest('[data-match-port]')) return;
    const cursor = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { from, pointer: event.pointerId, start: cursor, cursor };
    setPreview({ from, point: relativePoint(board.current, cursor.x, cursor.y) });
  };

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = gesture.current;
    if (!board.current || !drag || drag.pointer !== event.pointerId) return;
    drag.cursor = { x: event.clientX, y: event.clientY };
    setPreview({ from: drag.from, point: relativePoint(board.current, drag.cursor.x, drag.cursor.y) });
  };

  const clearDrag = () => { gesture.current = undefined; setPreview(undefined); };

  const end = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = gesture.current;
    const area = board.current;
    if (!area || !drag || drag.pointer !== event.pointerId) return;
    clearDrag();
    if (Math.hypot(event.clientX - drag.start.x, event.clientY - drag.start.y) < 5) return;
    ignoreClick.current = true;
    const side = drag.from.side === 'patient' ? 'cause' : 'patient';
    const attribute = side === 'cause' ? 'data-match-cause' : 'data-match-source';
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(`[${attribute}]`);
    let id = target && area.contains(target) ? target.getAttribute(attribute) : undefined;
    if (!id) {
      const point = relativePoint(area, event.clientX, event.clientY);
      let distance = 36;
      for (const candidate of side === 'cause' ? causes : item.patients) {
        const port = points[endpointKey({ side, id: candidate.id })];
        if (!port) continue;
        const gap = Math.hypot(point.x - port.x, point.y - port.y);
        if (gap < distance) { id = candidate.id; distance = gap; }
      }
    }
    if (id) connect(drag.from, { side, id });
    else setSelected(drag.from);
  };

  const active = preview?.from ?? selected;
  const nodeEvents = (endpoint: Endpoint) => ({
    'aria-pressed': sameEndpoint(active, endpoint),
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => begin(event, endpoint),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: clearDrag,
    onLostPointerCapture: clearDrag,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      if (event.detail > 0 && ignoreClick.current) { ignoreClick.current = false; return; }
      if (selected && selected.side !== endpoint.side) connect(selected, endpoint);
      else setSelected(sameEndpoint(selected, endpoint) ? undefined : endpoint);
    },
  });

  if (score) return <CaseResult {...step} title={`${score.correct} de ${item.patients.length} conexiones correctas`} score={score}
    onRetry={() => setScore(undefined)} solutionLabel="Ver conexiones correctas" solution={<>
      <ol className="clinical-correction-list" aria-label="Conexiones correctas">
        {item.patients.map(patient => {
          const expected = causes.find(cause => cause.id === patient.correctId)!;
          const chosen = causes.find(cause => cause.id === connections[patient.id]);
          return <li key={patient.id}>
            <strong>{patient.name} · <Bilingual es={expected.textEs} en={expected.textEn}/></strong>
            {chosen && chosen.id !== expected.id && <p>Tu elección <Bilingual es={chosen.textEs} en={chosen.textEn}/></p>}
            <Bilingual es={patient.explanationEs} en={patient.explanationEn}/>
          </li>;
        })}
      </ol>
      <details><summary>Fuentes del caso</summary><ul>
        {item.revision.fuentes.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.titulo}</a></li>)}
      </ul></details>
    </>}/>;

  const activePatient = active?.side === 'patient' && item.patients.find(patient => patient.id === active.id);
  const previewAnchor = preview && points[endpointKey(preview.from)];
  const previewIndex = preview?.from.side === 'patient'
    ? item.patients.findIndex(patient => patient.id === preview.from.id)
    : item.patients.findIndex(patient => connections[patient.id] === preview?.from.id);
  const count = Object.keys(connections).length;

  return <Card className="clinical-match">
    <p>Toca dos tarjetas de filas distintas o arrastra desde cualquiera de los puntos.</p>
    <div className="clinical-match-board" ref={board}>
      <svg className="clinical-match-wires" aria-hidden="true">
        {item.patients.map((patient, index) => {
          const cause = connections[patient.id];
          const from = points[endpointKey({ side: 'patient', id: patient.id })];
          const to = points[endpointKey({ side: 'cause', id: cause })];
          return from && to && <path className="clinical-match-wire" key={`${patient.id}:${cause}`} pathLength={1}
            stroke={colors[index]} d={wirePath(from, to, compact, index)}/>;
        })}
        {preview && previewAnchor && <path className="clinical-match-preview"
          stroke={colors[previewIndex] ?? '#477866'}
          d={preview.from.side === 'patient'
            ? wirePath(previewAnchor, preview.point, compact, previewIndex)
            : wirePath(preview.point, previewAnchor, compact, Math.max(0, previewIndex))}/>}
      </svg>
      <h2>Síntomas y contexto</h2>
      <div className="clinical-match-row clinical-match-patients">
        {item.patients.map((patient, index) => {
          const linked = causes.find(cause => cause.id === connections[patient.id]);
          return <div key={patient.id} className="clinical-match-item"><Button variant="answer" className="clinical-match-node" data-match-source={patient.id}
            data-linked={!!linked} aria-label={`Caso de ${patient.name}`} aria-describedby={`match-clue-${patient.id}`}
            {...nodeEvents({ side: 'patient', id: patient.id })}>
            <strong><UserRound size={16} aria-hidden="true"/> {patient.name}</strong>
            <span id={`match-clue-${patient.id}`}><Bilingual es={patient.textEs} en={patient.textEn} audio={false}/>
              {linked && <span className="clinical-match-connection">Conectado a {linked.textEs}</span>}
            </span>
            <span className="clinical-match-port" data-match-port={endpointKey({ side: 'patient', id: patient.id })} aria-hidden="true" style={{ color: colors[index] }}/>
          </Button><EnglishTerm term={patient.textEn} variant="button"/></div>;
        })}
      </div>
      <h2 className="clinical-match-causes-title">Posibles causas</h2>
      <div className="clinical-match-row clinical-match-causes">
        {causes.map(cause => {
          const owner = item.patients.findIndex(patient => connections[patient.id] === cause.id);
          return <div key={cause.id} className="clinical-match-item"><Button variant="answer" className="clinical-match-node" data-match-cause={cause.id}
            data-linked={owner >= 0} {...nodeEvents({ side: 'cause', id: cause.id })}>
            <span className="clinical-match-port" data-match-port={endpointKey({ side: 'cause', id: cause.id })} aria-hidden="true" style={{ color: colors[owner] }}/>
            <Bilingual es={cause.textEs} en={cause.textEn} audio={false}/>
          </Button><EnglishTerm term={cause.textEn} variant="button"/></div>;
        })}
      </div>
    </div>
    <p className="clinical-match-status" role="status">
      {activePatient ? `Elige una causa para ${activePatient.name}.`
        : active?.side === 'cause' ? 'Elige un caso para esta causa.'
          : `${count} de ${item.patients.length} conexiones`}
    </p>
    <div className="clinical-result-actions">
      <Button variant="secondary" disabled={!count} onClick={() => { setConnections({}); setSelected(undefined); }}>
        <RotateCcw size={17} aria-hidden="true"/> Reiniciar conexiones
      </Button>
      <Button disabled={count !== item.patients.length} onClick={() => {
        const correct = item.patients.filter(patient => connections[patient.id] === patient.correctId).length;
        const result = { correct, errors: item.patients.length - correct };
        if (!step.submitTimed || step.submitTimed(result)) setScore(result);
      }}><Link2 size={17} aria-hidden="true"/> Comprobar conexiones</Button>
    </div>
  </Card>;
}
