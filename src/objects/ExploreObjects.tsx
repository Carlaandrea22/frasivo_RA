import { lazy, Suspense, useEffect, useState } from 'react';
import { AudioLines, Box, Camera, Check, ChefHat, Code2, ShieldCheck, Square, Stethoscope, Volume2 } from 'lucide-react';
import { careerTerms } from '../careers/catalog';
import { careers, type CareerId } from '../profile/profile';
import { useObjectCamera } from './useObjectCamera';
import './objects.css';
const ObjectViewer = lazy(() => import('./ObjectViewer').then(module => ({ default: module.ObjectViewer })));

export default function ExploreObjects({ onSpeak, career = 'systems', initialTermId, suspended = false }: { onSpeak: (text: string) => void; career?: CareerId; initialTermId?: string; suspended?: boolean }) {
  const terms = careerTerms(career);
  const [selectedId, setSelectedId] = useState(terms.find(term => term.id === initialTermId)?.id ?? terms[0].id);
  const term = terms.find(item => item.id === selectedId)!;
  const hasModel = !!term.sceneId;
  const collection = career === 'systems' ? 'Software' : careers[career].label;
  const CollectionIcon = career === 'medicine' ? Stethoscope : career === 'gastronomy' ? ChefHat : Code2;
  const camera = useObjectCamera();
  useEffect(() => { if (suspended) camera.stop(); }, [suspended, camera.stop]);
  const active = camera.status === 'active', waiting = camera.status === 'permission';
  return <section className="software-explorer" aria-label={`Explora objetos de ${collection}`}>
    <div className="software-collection"><span><CollectionIcon size={18}/><strong>{collection}</strong></span><p>{terms.length} palabras para tu carrera</p><span className="software-collection-count">Colección inicial</span></div>
    <div className="software-layout">
      <aside className="software-catalog">
        <h2>Elige una palabra</h2><p>Cada concepto tiene una forma.</p>
        <div className="software-term-list" role="group" aria-label={career === 'systems' ? 'Vocabulario de software' : `Vocabulario de ${collection}`}>{terms.map((item, index) => <button key={item.id} className={item.id === selectedId ? 'selected' : ''} aria-pressed={item.id === selectedId} onClick={() => { window.speechSynthesis?.cancel(); setSelectedId(item.id); }}>
          <span className={`software-glyph glyph-${item.id}`} aria-hidden="true">{career === 'systems' ? ['[ ]', '▱', '●●', '⌁', '⑂', '↗', '▦', '⇄', '⑃', '◇'][index] : item.emoji}</span>
          <span><strong>{item.en}</strong><small>{item.es}</small></span>{item.id === selectedId ? <Check size={15}/> : null}
        </button>)}</div>
      </aside>
      <div className="software-workspace">
        <div className={`object-stage ${active ? 'camera-on' : ''}`}>
          <video ref={camera.videoRef} autoPlay playsInline muted aria-label="Cámara para explorar objetos" className={active ? 'visible' : ''}/>
          <div className="object-stage-label"><Box size={15}/><span>{!hasModel ? 'Ficha de vocabulario' : active ? '3D sobre cámara' : 'Vista 3D sin cámara'}</span></div>
          <span className="object-stage-word" aria-hidden="true">{term.en}</span>
          {term.sceneId ? suspended ? null : <Suspense fallback={<p className="career-model-pending" role="status">Preparando el modelo 3D…</p>}><ObjectViewer termId={term.sceneId}/></Suspense> : <div className="career-model-pending"><Box size={42}/><h3>Modelo 3D pendiente</h3><p>Estamos preparando el modelo de {term.es.toLowerCase()}. Ya puedes aprender su significado y pronunciación.</p><small>Incorporaremos los modelos realistas a esta colección poco a poco.</small></div>}
          {hasModel ? <p className="object-drag-hint">Arrastra el objeto para cambiar el ángulo.</p> : null}
        </div>
        {hasModel ? <div className="object-camera-actions"><button className={active || waiting ? 'secondary' : 'primary'} onClick={() => active || waiting ? camera.stop() : void camera.start()}>{active || waiting ? <Square size={16}/> : <Camera size={17}/>} {waiting ? 'Cancelar cámara' : active ? 'Detener cámara' : 'Activar cámara'}</button><span role="status">{waiting ? 'Esperando permiso de cámara…' : active ? 'Cámara activa' : 'También puedes aprender sin cámara.'}</span></div> : null}
        {camera.error ? <p className="camera-error" role="alert">{camera.error}</p> : null}
        {hasModel ? <p className="object-spatial-note">El modelo se muestra sobre la imagen; permanece en pantalla al mover el teléfono.</p> : null}
        <article className="software-definition" aria-labelledby="software-term-title">
          <div className="software-definition-title"><div><h2 id="software-term-title">{term.en}</h2><p>{term.es}</p></div><button className="sound-button" aria-label={`Escuchar ${term.en}`} onClick={() => onSpeak(term.en)}><Volume2 size={23}/></button></div>
          <div className="phonetic"><AudioLines size={15}/>{term.phonetic}<span>Inglés americano</span></div>
          <p className="software-meaning">{term.meaning}</p>
          {term.metaphor ? <div className="software-metaphor"><Box size={19}/><div><h3>Lo que representa el objeto</h3><p>{term.metaphor}</p></div></div> : null}
          <div className="software-example"><div><h3>En tu carrera</h3><button className="text-button" aria-label={`Escuchar ejemplo de ${term.en}`} onClick={() => onSpeak(term.example)}><Volume2 size={16}/> Escuchar frase</button></div><p lang="en">“{term.example}”</p><small>{term.translation}</small></div>
        </article>
        <p className="privacy-note"><ShieldCheck size={15}/> La cámara no graba ni envía imágenes. La pronunciación usa las voces de tu dispositivo.</p>
      </div>
    </div>
  </section>;
}
