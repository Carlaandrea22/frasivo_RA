import { useEffect, useState } from 'react';
import { Check, CloudDownload } from 'lucide-react';
import { Card } from '../ui/Card';
import { requestOfflineStatus, type OfflineStatus } from './offline';

const resources = [
  ['base', 'Interfaz, Huesos y Pose Lite'],
  ['muscles', 'Músculos'],
  ['organs', 'Órganos'],
  ['explore', 'Modelos de Explorar 3D'],
  ['full', 'Pose Full para fijar el cuerpo'],
  ['hand', 'Seguimiento de manos'],
  ['face', 'Seguimiento facial'],
] as const;

export function OfflineReadiness() {
  const [status, setStatus] = useState<OfflineStatus | null>();

  useEffect(() => {
    let latest = 0;
    async function refresh() {
      const request = ++latest;
      const status = await requestOfflineStatus();
      if (request === latest) setStatus(status);
    }
    function onMessage(event: MessageEvent) {
      if (event.data?.type === 'LUMAR_OFFLINE_CHANGED') void refresh();
    }
    void refresh();
    window.addEventListener('focus', refresh);
    navigator.serviceWorker?.addEventListener('controllerchange', refresh);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => {
      latest++;
      window.removeEventListener('focus', refresh);
      navigator.serviceWorker?.removeEventListener('controllerchange', refresh);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);

  const complete = status && Object.values(status).every(Boolean);
  return <Card className="pwa-readiness">
    <h2>Uso sin conexión</h2>
    <p role="status">{status === undefined ? 'Comprobando los recursos del dispositivo…' : status === null
      ? 'Abre LumAR con conexión para preparar los recursos básicos.' : complete
        ? 'Todos los recursos están listos en este dispositivo.'
        : 'Para guardar los recursos pendientes, úsalos una vez con conexión.'}</p>
    {status && <ul className="pwa-readiness-list">
      {resources.map(([key, label]) => {
        const ready = status[key] && (key !== 'base' || status.camera);
        const Icon = ready ? Check : CloudDownload;
        return <li key={key}>
          <span><Icon size={17} aria-hidden="true"/>{label}</span>
          <span>{ready ? 'Disponible' : 'Pendiente'}</span>
        </li>;
      })}
    </ul>}
  </Card>;
}
