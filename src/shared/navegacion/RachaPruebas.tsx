import { useSyncExternalStore } from 'react';
import { getProgress, subscribeProgress } from '../progreso';
import { simularRacha, useRacha } from '../progreso/useRacha';
import { Button } from '../ui/Button';

export function RachaPruebas() {
  const { events } = useSyncExternalStore(subscribeProgress, getProgress);
  const { dias, diasSimulados } = useRacha(events);
  const rachaVisible = diasSimulados ?? dias;

  return <details className="lumar-card">
    <summary>Probar racha de la mascota</summary>
    <p>Racha real: {dias} · Vista de prueba: {rachaVisible} {rachaVisible === 1 ? 'día' : 'días'}</p>
    <div className="lumar-actions">
      <Button variant="secondary" disabled={rachaVisible === 0} onClick={() => simularRacha(rachaVisible - 1)}>−1 día</Button>
      <Button variant="secondary" onClick={() => simularRacha(rachaVisible + 1)}>+1 día</Button>
      <Button variant="text" disabled={diasSimulados === null} onClick={() => simularRacha(null)}>Restaurar racha real</Button>
      <a className="lumar-link" href="#progreso">Ver mascota</a>
    </div>
  </details>;
}
