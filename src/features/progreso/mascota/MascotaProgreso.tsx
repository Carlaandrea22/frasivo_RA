import { useCallback, useEffect, useState } from 'react';
import { Hand, PartyPopper } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { Mascota } from './Mascota';
import { etapasMascota, obtenerEvolucion } from './evolucion';
import './mascota-progreso.css';

type Gesto = 'saludo' | 'celebracion';
const duracion: Record<Gesto, number> = { saludo: 1400, celebracion: 1500 };
const ultimaEtapaVista = 'lumar.mascota:etapa-vista';
const formatoAciertos = new Intl.NumberFormat('es');

export function MascotaProgreso({ aciertos }: { aciertos: number }) {
  const { indice, actual, siguiente } = obtenerEvolucion(aciertos);
  const [gesto, setGesto] = useState<{ nombre: Gesto; turno: number }>();

  const activar = useCallback((nombre: Gesto) => {
    setGesto(anterior => ({ nombre, turno: (anterior?.turno ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    try {
      const vista = window.localStorage.getItem(ultimaEtapaVista);
      const indiceVisto = etapasMascota.findIndex(etapa => etapa.id === vista);
      if (vista !== actual.id) window.localStorage.setItem(ultimaEtapaVista, actual.id);
      if (indice > 0 && indice > indiceVisto) activar('celebracion');
    } catch {
      // The stage still follows practice history when storage is unavailable.
    }
  }, [activar, actual.id, indice]);

  useEffect(() => {
    if (!gesto) return;
    const timer = window.setTimeout(() => setGesto(undefined), duracion[gesto.nombre]);
    return () => window.clearTimeout(timer);
  }, [gesto]);

  const faltan = siguiente ? siguiente.aciertos - aciertos : 0;

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
        <p className="mascota-aciertos"><strong>{formatoAciertos.format(aciertos)}</strong> {aciertos === 1 ? 'acierto' : 'aciertos'}</p>
        {siguiente ? <>
          <progress aria-label={`Progreso hacia ${siguiente.nombre}`} value={aciertos - actual.aciertos} max={siguiente.aciertos - actual.aciertos}/>
          <p>{faltan === 1 ? 'Falta 1 acierto' : `Faltan ${faltan} aciertos`} para <strong>{siguiente.nombre}</strong>.</p>
        </> : <p>Alcanzaste la última etapa.</p>}
      </div>
      <div className="mascota-gestos">
        <Button variant="secondary" onClick={() => activar('saludo')}><Hand size={17} aria-hidden="true"/> Saludar</Button>
        <Button variant="secondary" onClick={() => activar('celebracion')}><PartyPopper size={17} aria-hidden="true"/> Celebrar</Button>
      </div>
    </div>
  </section>;
}
