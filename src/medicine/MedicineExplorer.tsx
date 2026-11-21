import { useState } from 'react';
import { Camera, Layers, ShieldCheck, Square, Stethoscope, Volume2 } from 'lucide-react';
import { AnatomyOverlay } from './AnatomyOverlay';
import { anatomyParts, demoPose, type AnatomyLayer } from './anatomy';
import { usePoseCamera } from './usePoseCamera';
import './medicine.css';
const layers: { id: AnatomyLayer; name: string; subtitle: string }[] = [
  { id: 'muscles', name: 'Músculos', subtitle: 'Movimiento y soporte' },
  { id: 'bones', name: 'Huesos', subtitle: 'La estructura del cuerpo' },
  { id: 'organs', name: 'Órganos', subtitle: 'Dentro del tronco' },
];
export default function MedicineExplorer({ suspended, onSpeak }: { suspended: boolean; onSpeak: (text: string) => void }) {
  const [layer, setLayer] = useState<AnatomyLayer>('muscles');
  const [selected, setSelected] = useState('pectorals');
  const [opacity, setOpacity] = useState(85);
  const camera = usePoseCamera(suspended);
  const active = camera.status === 'active', waiting = camera.status === 'permission';
  const preview = !active && !waiting;
  const parts = anatomyParts.filter(p => p.layer === layer);
  const part = parts.find(p => p.id === selected) ?? parts[0];
  const trackingLabel = waiting ? 'Esperando permiso de cámara…' : !active ? 'Demostración sin cámara' : camera.tracking === 'loading' ? 'Preparando el seguimiento corporal…' : camera.tracking === 'tracking' ? 'Cuerpo detectado · seguimiento activo' : 'Buscando una persona de frente…';
  return <section className="medicine-explorer" aria-label="Anatomía sobre cámara">
    <header className="anatomy-intro"><span className="anatomy-kicker"><Stethoscope size={17}/> MEDICINA / ATLAS VIVO</span><h2>Una nueva forma de ver el cuerpo.</h2><p>Explora sus capas, descubre cada estructura y aprende a nombrarla en inglés.</p></header>
    <div className="anatomy-layout"><div className="anatomy-workspace">
      <div className={`anatomy-stage ${active ? 'is-live' : ''}`} style={{ aspectRatio: active ? camera.aspect : 4 / 5 }}>
        <video ref={camera.videoRef} autoPlay playsInline muted aria-label="Cámara de anatomía" style={{ visibility: active ? 'visible' : 'hidden' }}/>
        {preview ? <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="anatomy-silhouette" aria-hidden="true"><ellipse cx="500" cy="120" rx="62" ry="64"/><path d="M465 175V210Q390 210 365 244L275 402L220 562Q230 585 260 565L324 420L390 315L405 530L365 937Q380 963 407 943L475 642H525L593 943Q620 963 635 937L595 530L610 315L676 420L740 565Q770 585 780 562L725 402L635 244Q610 210 535 210V175Z"/></svg> : null}
        <AnatomyOverlay points={preview ? demoPose : camera.points} layer={layer} selected={part.id} onSelect={setSelected} opacity={opacity / 100}/>
        <span className="anatomy-stage-tag"><Layers size={14}/>{layers.find(l => l.id === layer)!.name}</span>
        <span className={`anatomy-status ${active && camera.tracking === 'tracking' ? 'tracking' : ''}`} role="status">{trackingLabel}</span>
        {active && camera.tracking === 'searching' ? <div className="anatomy-search-hint">Incluye hombros y caderas en la imagen.<br/>Buena luz y una sola persona.</div> : null}
        {preview ? <span className="anatomy-demo-caption">Ilustración de ejemplo · vista frontal</span> : null}
      </div>
      <div className="anatomy-camera-controls"><button className={active || waiting ? 'secondary' : 'primary'} disabled={suspended} onClick={() => active || waiting ? camera.stop() : void camera.start()}>{active || waiting ? <Square size={16}/> : <Camera size={18}/>} {waiting ? 'Cancelar cámara' : active ? 'Detener cámara' : 'Activar cámara'}</button><p>Apunta a una persona de frente.<br/>Deja espacio para ver el cuerpo completo.</p></div>
      {camera.error || camera.modelError ? <p className="camera-error" role="alert">{camera.error || camera.modelError}</p> : null}
      <p className="privacy-note"><ShieldCheck size={15}/> Las imágenes se procesan en tu dispositivo. No se graban ni se envían.</p>
    </div>
    <aside className="anatomy-panel"><div className="anatomy-panel-heading"><span>01 / ELIGE UNA CAPA</span><h3>Del exterior al interior.</h3></div>
      <div className="anatomy-layers" role="group" aria-label="Capas anatómicas">{layers.map(item => <button key={item.id} className={`anatomy-layer ${item.id === layer ? 'active' : ''} layer-${item.id}`} aria-label={item.name} aria-pressed={item.id === layer} onClick={() => { setLayer(item.id); setSelected(anatomyParts.find(p => p.layer === item.id)!.id); }}><i/><span><strong>{item.name}</strong><small>{item.subtitle}</small></span><span aria-hidden="true">↗</span></button>)}</div>
      <label className="anatomy-opacity">Transparencia <output>{opacity}% de opacidad</output><input aria-label="Opacidad de las ilustraciones" type="range" min="20" max="100" step="5" value={opacity} onChange={e => setOpacity(Number(e.target.value))}/></label>
      <div className="anatomy-part-list" role="group" aria-label="Estructuras anatómicas">{parts.map(item => <button key={item.id} aria-pressed={item.id === part.id} onClick={() => setSelected(item.id)}>{item.en} · {item.es}</button>)}</div>
      <article className="anatomy-definition"><span>02 / CONOCE LA ESTRUCTURA</span><div><h3 lang="en">{part.en}</h3><button className="sound-button" aria-label={`Escuchar ${part.en}`} onClick={() => onSpeak(part.en)}><Volume2 size={21}/></button></div><p className="anatomy-translation">{part.es}</p><p>{part.description}</p></article>
      <p className="anatomy-limit">Atlas educativo: las ilustraciones se ajustan a la postura y su posición es aproximada. La cámara no muestra el interior real del cuerpo. Usa una vista frontal; los giros y las partes ocultas reducen la precisión.</p>
    </aside></div>
  </section>;
}
