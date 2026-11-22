import { useId, useRef, useSyncExternalStore } from 'react';
import { Download, RefreshCw, Share, SquarePlus, ToggleRight, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { activateUpdate, getInstallMode, getPendingUpdate, promptInstall, subscribePwa } from './lifecycle';
import './pwa.css';

export function PwaInstall() {
  const mode = useSyncExternalStore(subscribePwa, getInstallMode);
  const id = useId();
  const sheet = useRef<HTMLDialogElement>(null);
  if (mode === 'hidden') return null;

  return <>
    <Button className="pwa-install" variant="text" aria-haspopup={mode === 'instructions' ? 'dialog' : undefined}
      onClick={event => {
        if (mode === 'prompt') void promptInstall();
        else {
          event.currentTarget.focus();
          sheet.current?.showModal();
        }
      }}>
      <Download size={16} aria-hidden="true"/> Instalar LumAR
    </Button>
    {mode === 'instructions' && <dialog className="lumar-sheet pwa-install-sheet" ref={sheet} aria-labelledby={id}>
      <header>
        <div className="pwa-install-title">
          <img src="/apple-touch-icon.png" alt="" width="44" height="44"/>
          <h2 id={id}>Instalar LumAR</h2>
        </div>
        <Button variant="text" aria-label="Cerrar" onClick={() => sheet.current?.close()}>
          <X size={20} aria-hidden="true"/>
        </Button>
      </header>
      <p>Agrega LumAR a tu pantalla de inicio para abrir el atlas como una app.</p>
      <ol className="pwa-install-steps">
        <li><Share size={21} aria-hidden="true"/><span>Abre el menú del navegador y toca <strong>Compartir</strong>.</span></li>
        <li><SquarePlus size={21} aria-hidden="true"/><span>Elige <strong>Agregar a Inicio</strong> o <strong>Añadir a pantalla de inicio</strong>.</span></li>
        <li><ToggleRight size={21} aria-hidden="true"/><span>Si aparece <strong>Abrir como app web</strong>, actívalo. Luego toca <strong>Agregar</strong> o <strong>Añadir</strong>.</span></li>
      </ol>
      <Button className="pwa-install-done" onClick={() => sheet.current?.close()}>Entendido</Button>
    </dialog>}
  </>;
}

export function PwaUpdate() {
  const worker = useSyncExternalStore(subscribePwa, getPendingUpdate);
  if (!worker) return null;

  return <aside className="pwa-update" aria-label="Actualización de LumAR">
    <RefreshCw size={20} aria-hidden="true"/>
    <p role="status">Hay una nueva versión de LumAR.</p>
    <Button onClick={() => activateUpdate(worker)}>Actualizar</Button>
  </aside>;
}
