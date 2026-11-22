import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { getProgress, subscribeProgress } from '../../../shared/progreso';
import { metaDiaria } from '../../../shared/progreso/racha';
import { useRacha } from '../../../shared/progreso/useRacha';
import { Mascota } from './Mascota';
import { obtenerEvolucion } from './evolucion';
import { horasDeRecordatorio, mensajesDeRacha, turnoDeRecordatorio, type FranjaRecordatorio } from './recordatorios';
import './recordatorio-racha.css';

const vistos = new Map<FranjaRecordatorio, number>();

function registrarSiEsNuevo(franja: FranjaRecordatorio, dia: number) {
  if (vistos.get(franja) === dia) return false;
  try {
    const clave = `lumar.racha:recordatorio:${franja}`;
    if (window.localStorage.getItem(clave) === String(dia)) return false;
    window.localStorage.setItem(clave, String(dia));
  } catch {
    // Keep the reminder limited to once per slot in this visit without storage.
  }
  vistos.set(franja, dia);
  return true;
}

export function RecordatorioRacha({ pausado, oculto = false }: { pausado: boolean; oculto?: boolean }) {
  const { events } = useSyncExternalStore(subscribeProgress, getProgress);
  const { completadosHoy, dias, fecha } = useRacha(events, horasDeRecordatorio);
  const [mostrado, setMostrado] = useState<string>();
  const { franja, dia } = turnoDeRecordatorio(fecha) ?? {};
  const turno = franja && `${franja}:${dia}`;
  const faltan = metaDiaria - completadosHoy;
  const activo = !pausado && faltan > 0;

  useEffect(() => {
    if (!activo || !turno || !franja || dia === undefined) {
      setMostrado(undefined);
      return;
    }
    if (!document.hidden && registrarSiEsNuevo(franja, dia)) setMostrado(turno);
  }, [activo, fecha, turno, franja, dia]);

  if (oculto || !activo || !franja || mostrado !== turno) return null;
  const { actual } = obtenerEvolucion(dias);
  return <aside className="recordatorio-racha" aria-labelledby="recordatorio-racha-titulo">
    <div className="recordatorio-racha-retrato"><Mascota etapa={actual.id} animacion="estatica"/></div>
    <div className="recordatorio-racha-texto" aria-live="polite">
      <h2 id="recordatorio-racha-titulo">Tu racha de hoy</h2>
      <p>{mensajesDeRacha[actual.id][franja]}</p>
      <small>{faltan === 1 ? 'Te falta 1 caso' : `Te faltan ${faltan} casos`} para completar la meta.</small>
    </div>
    <button type="button" className="recordatorio-racha-cerrar" aria-label="Cerrar recordatorio" onClick={() => setMostrado(undefined)}>
      <X size={21} aria-hidden="true"/>
    </button>
    <a className="button button--primary lumar-link" href="#practicar/casos" onClick={() => setMostrado(undefined)}>
      Practicar ahora <ArrowRight size={17} aria-hidden="true"/>
    </a>
  </aside>;
}
