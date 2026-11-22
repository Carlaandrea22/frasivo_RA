import { useCallback, useEffect, useState } from 'react';
import { Hand, PartyPopper } from 'lucide-react';
import { metaDiaria } from '../../../shared/progreso/racha';
import { Button } from '../../../shared/ui/Button';
import { Mascota } from './Mascota';
import { etapasMascota, obtenerEvolucion } from './evolucion';
import './mascota-progreso.css';

type Gesto = 'saludo' | 'celebracion';
const duracion: Record<Gesto, number> = { saludo: 1400, celebracion: 1500 };
const ultimaEtapaVista = 'lumar.mascota:etapa-por-racha';

export function MascotaProgreso({ dias, completadosHoy, diasSimulados }: {
  dias: number;
  completadosHoy: number;
  diasSimulados: number | null;
}) {
  const rachaVisible = diasSimulados ?? dias;
  const { indice, actual, siguiente } = obtenerEvolucion(rachaVisible);
  const [gesto, setGesto] = useState<{ nombre: Gesto; turno: number }>();

  const activar = useCallback((nombre: Gesto) => {
    setGesto(anterior => ({ nombre, turno: (anterior?.turno ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    if (diasSimulados !== null) return;
    try {
      const vista = window.localStorage.getItem(ultimaEtapaVista);
      const indiceVisto = etapasMascota.findIndex(etapa => etapa.id === vista);
      if (vista !== actual.id) window.localStorage.setItem(ultimaEtapaVista, actual.id);
      if (indice > 0 && indice > indiceVisto) activar('celebracion');
    } catch {
      // The stage still follows practice history when storage is unavailable.
    }
  }, [activar, actual.id, diasSimulados, indice]);

  useEffect(() => {
    if (!gesto) return;
    const timer = window.setTimeout(() => setGesto(undefined), duracion[gesto.nombre]);
    return () => window.clearTimeout(timer);
  }, [gesto]);

  const faltan = siguiente ? siguiente.dias - rachaVisible : 0;

  return <section className="lumar-card mascota-panel" aria-labelledby="mascota-titulo">
    <div className="mascota-escena">
      <span className="mascota-etapa">Etapa {indice + 1} de {etapasMascota.length}</span>
      <Mascota key={gesto?.turno ?? 0} etapa={actual.id} animacion={gesto?.nombre ?? 'reposo'}/>
    </div>
    <div className="mascota-info">
      <header>
        <p className="mascota-contexto">Tu mascota</p>
        <h2 id="mascota-titulo">{actual.nombre}</h2>
      </header>
      <div className="mascota-evolucion">
        <p className="mascota-racha"><strong>{rachaVisible}</strong> {rachaVisible === 1 ? 'día' : 'días'} de racha
          {diasSimulados !== null && <> · Simulación</>}</p>
        {siguiente ? <>
          <progress aria-label={`Progreso hacia ${siguiente.nombre}`} value={rachaVisible - actual.dias} max={siguiente.dias - actual.dias}/>
          <p>{faltan === 1 ? 'Falta 1 día' : `Faltan ${faltan} días`} para <strong>{siguiente.nombre}</strong>.</p>
        </> : <p>Alcanzaste la última etapa.</p>}
        <p className="mascota-meta">
          {completadosHoy >= metaDiaria ? 'Meta de hoy completada' : `Meta de hoy · ${completadosHoy} de ${metaDiaria} casos`}
        </p>
      </div>
      <div className="mascota-gestos">
        <Button variant="secondary" onClick={() => activar('saludo')}><Hand size={17} aria-hidden="true"/> Saludar</Button>
        <Button variant="secondary" onClick={() => activar('celebracion')}><PartyPopper size={17} aria-hidden="true"/> Celebrar</Button>
      </div>
    </div>
  </section>;
}
