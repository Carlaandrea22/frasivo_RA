import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowRight, AudioLines, BookOpen, Box, Camera, Check, Compass, Flag, GraduationCap, Leaf, LoaderCircle, ScanLine, ShieldCheck, Stethoscope, Sparkles, Square, Volume2, X } from 'lucide-react';
import { vocabulary, wordById, type Word } from './vocabulary';
import { recordAnswer, type Recognition } from './learning';
import { loadProgress, saveProgress, type ProgressStorage } from './storage';
import { useCamera } from './useCamera';
import { Practice } from './Practice';
import { RoomScene } from './RoomScene';
import { SupportedObjects } from './SupportedObjects';
import { ObjectOverlay } from './ObjectOverlay';
import type { TrackedRecognition } from './objectTracking';
import { MissionEntry, MissionIntro, MissionBanner, MissionSummary } from './missions/ClassroomMission';
import { useClassroomMission } from './missions/useClassroomMission';
import { applyMissionProgress, missionInstruction, type MissionEvent } from './missions/classroom';
import './medicine/medicine.css';
import { AccountRoot } from './auth/AccountRoot';
import { careers, levels, type LearnerProfile } from './profile/profile';
import { CareerHome, CareerCollection, CareerPractice } from './careers/CareerLearning';
import { loadCareerProgress, saveCareerProgress, recordCareerAnswer } from './careers/learning';
const MedicineExplorer = lazy(() => import('./medicine/MedicineExplorer'));
const ExploreObjects = lazy(() => import('./objects/ExploreObjects'));
type Tab = 'anatomy' | 'explore' | 'objects' | 'missions' | 'practice' | 'words';
interface SessionWord { id: string; source: 'camera' | 'manual'; confidence?: number }
interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
function WordCard({ word, source, onSpeak, liveConfidence, onPractice, trackingState, onReturnToCamera }: {
  word: Word; source?: SessionWord; onSpeak: (text: string) => void; liveConfidence?: number;
  onPractice?: () => void; trackingState?: 'visible' | 'missing' | 'lost'; onReturnToCamera: () => void;
}) {
  return <article className="word-card">
    <div className="card-topline"><span>{source ? source.source === 'camera' ? 'Objeto reconocido' : 'Vocabulario manual' : 'Un ejemplo de lo que aprenderás'}</span><span className="level">A1</span></div>
    {trackingState ? <div className={`object-state ${trackingState}`}><span/>{trackingState === 'visible' ? 'Objeto seleccionado en la cámara' : trackingState === 'missing' ? 'Buscando de nuevo el objeto…' : 'El objeto salió de la vista. Puedes seguir repasando.'}</div> : null}
    <div className="word-art" aria-hidden="true">{word.emoji}</div>
    <div className="word-title"><div><h2>{word.en}</h2><p>{word.es}</p></div><button className="sound-button" onClick={() => onSpeak(word.en)} aria-label={`Escuchar ${word.en}`}><Volume2 size={23}/></button></div>
    <div className="phonetic"><AudioLines size={15}/>{word.phonetic}<span>Inglés americano</span></div>
    <div className="example"><span>Úsala en una frase</span><p>“{word.example}”</p><small>{word.translation}</small><button onClick={() => onSpeak(word.example)} className="text-button"><Volume2 size={15}/> Escuchar la frase</button></div>
    {source?.source === 'camera' ? <p className="confidence"><Check size={14}/>{liveConfidence !== undefined ? 'Confianza actual' : 'Mejor confianza registrada'}: {Math.round((liveConfidence ?? source.confidence ?? 0) * 100)}%</p> : null}
    {source && onPractice ? <button className="primary practice-selected" onClick={onPractice}>Practicar {word.en}<ArrowRight size={16}/></button> : null}
    {trackingState ? <button className="text-button return-camera" onClick={onReturnToCamera}><Camera size={15}/> Volver a la cámara</button> : null}
  </article>;
}
export default function App() {
  return <AccountRoot>{({ user, storage, suspended, notice, onEditProfile }) => <LearningApp key={`${user.id}:${user.profile.career}:${user.profile.level}`} profile={user.profile} storage={storage} suspended={suspended} profileNotice={notice} onEditProfile={onEditProfile}/>}</AccountRoot>;
}
function LearningApp({ profile, storage, suspended, profileNotice, onEditProfile }: { profile: LearnerProfile; storage: ProgressStorage; suspended: boolean; profileNotice: ReactNode; onEditProfile: () => void }) {
  const [environmentStorage] = useState(() => profile.career === 'systems' ? storage : {
    getItem: (key: string) => storage.getItem(`${key}:${profile.career}`),
    setItem: (key: string, value: string) => storage.setItem(`${key}:${profile.career}`, value),
  });
  const [careerProgress, setCareerProgress] = useState(() => loadCareerProgress(storage, profile.career));
  const [careerStorageWarning, setCareerStorageWarning] = useState(false);
  const [careerPractice, setCareerPractice] = useState(true);
  const [careerTermId, setCareerTermId] = useState<string>();
  useEffect(() => { setCareerStorageWarning(!saveCareerProgress(storage, profile.career, careerProgress)); }, [careerProgress, profile.career, storage]);
  const [tab, setTab] = useState<Tab>('explore');
  const [progress, setProgress] = useState(() => loadProgress(environmentStorage));
  const [storageWarning, setStorageWarning] = useState(false);
  const [session, setSession] = useState<SessionWord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [practiceIds, setPracticeIds] = useState<string[] | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const cameraAreaRef = useRef<HTMLDivElement>(null);
  const [manual, setManual] = useState(false);
  const [audioMessage, setAudioMessage] = useState('');
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [practiceRound, setPracticeRound] = useState(0);
  const mission = useClassroomMission();
  const missionStatusRef = useRef<HTMLDivElement>(null);
  const addRecognitions = (results: Recognition[]) => {
    if (!results.length) return;
    setSession(old => {
      const next = [...old];
      for (const r of results) {
        const i = next.findIndex(w => w.id === r.word.id);
        const entry: SessionWord = { id: r.word.id, source: 'camera', confidence: r.score };
        if (i === -1) next.push(entry); else if (next[i].source === 'manual' || (next[i].confidence ?? 0) < r.score) next[i] = entry;
      }
      return next.length === old.length && next.every((v, i) => v === old[i]) ? old : next;
    });
    setSelectedId(old => old ?? results[0].word.id);
  };
  const camera = useCamera(addRecognitions);
  useEffect(() => { if (suspended) { camera.stop(); window.speechSynthesis?.cancel(); } }, [suspended, camera.stop]);
  const selectedTrack = camera.detections.find(d => d.trackId === selectedTrackId);
  const currentRecognition = selectedTrackId ? selectedTrack?.observed ? selectedTrack : undefined : camera.detections.find(d => d.word.id === selectedId && d.observed);
  useEffect(() => { if (camera.status !== 'scanning') setSelectedTrackId(null); }, [camera.status]);
  const active = ['permission', 'loading', 'scanning'].includes(camera.status);
  const missionSearch = mission.state.phase === 'finding' || mission.state.phase === 'found';
  const cameraVisible = tab === 'explore' || (tab === 'missions' && missionSearch && !(mission.state.phase === 'found' && mission.state.index === 2));
  const selectedWord = wordById(selectedId ?? 'book')!;
  const stats = Object.values(progress.words);
  const attempts = stats.reduce((n, w) => n + w.attempts, 0);
  const correct = stats.reduce((n, w) => n + w.correct, 0);
  const learned = stats.filter(w => w.correct >= 2 && w.correct / w.attempts >= .8).length;
  useEffect(() => { setStorageWarning(!saveProgress(environmentStorage, progress)); }, [progress, environmentStorage]);
  useEffect(() => {
    const prompt = (e: Event) => { e.preventDefault(); setInstall(e as InstallPrompt); };
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener('beforeinstallprompt', prompt);
    window.addEventListener('online', online); window.addEventListener('offline', online);
    return () => { window.removeEventListener('beforeinstallprompt', prompt); window.removeEventListener('online', online); window.removeEventListener('offline', online); window.speechSynthesis?.cancel(); };
  }, []);
  const go = (next: Tab, ids?: string[]) => { camera.stop(); window.speechSynthesis?.cancel(); setTab(next); if (next === 'practice') { setPracticeIds(ids ?? null); setCareerPractice(!ids && session.length === 0); setPracticeRound(r => r + 1); } };
  const scrollTo = (element: HTMLElement | null) => element?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  const sendMission = (event: MissionEvent) => {
    const change = mission.dispatch(event);
    if (change.pointDelta || change.answer) setProgress(old => applyMissionProgress(old, change));
    return change;
  };
  const selectObject = (object: TrackedRecognition) => {
    if (tab === 'missions' && mission.state.phase !== 'finding') return;
    setSelectedId(object.word.id); setSelectedTrackId(object.trackId);
    if (tab === 'missions') {
      const change = sendMission({ type: 'select', wordId: object.word.id, observed: object.observed });
      if (change.pointDelta) { speak(object.word.example); if (change.state.index === 2) camera.stop(); }
      if (window.matchMedia('(max-width: 900px)').matches) requestAnimationFrame(() => scrollTo(missionStatusRef.current));
      return;
    }
    if (window.matchMedia('(max-width: 900px)').matches) requestAnimationFrame(() => scrollTo(panelRef.current));
  };
  const chooseManual = (word: Word) => {
    setSelectedTrackId(null); setSelectedId(word.id);
    setSession(old => old.some(w => w.id === word.id) ? old : [...old, { id: word.id, source: 'manual' }]);
  };
  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) { setAudioMessage('Tu navegador no ofrece lectura en voz alta. Prueba otro navegador.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-US'; utterance.rate = .82;
    const voice = window.speechSynthesis.getVoices().find(v => v.lang === 'en-US');
    if (voice) utterance.voice = voice;
    utterance.onerror = event => { if (event.error !== 'interrupted' && event.error !== 'canceled') setAudioMessage('No se pudo reproducir el audio. Comprueba las voces de inglés del dispositivo y la conexión.'); };
    setAudioMessage(''); window.speechSynthesis.speak(utterance);
  };
  const startMission = (targets: string[]) => {
    const change = sendMission({ type: 'start', targets });
    if (!change.changed) return;
    setManual(false); setSelectedTrackId(null); setSelectedId(null);
    speak(missionInstruction(change.state)); void camera.start();
  };
  const nextMission = () => {
    const change = sendMission({ type: 'next' });
    if (!change.changed) return;
    setSelectedTrackId(null);
    if (change.state.phase === 'finding') { speak(missionInstruction(change.state)); if (!active) void camera.start(); }
    else { camera.stop(); window.speechSynthesis?.cancel(); }
  };
  const resetMission = () => { camera.stop(); window.speechSynthesis?.cancel(); sendMission({ type: 'reset' }); };
  const activateCamera = () => {
    if (tab === 'missions' && mission.state.phase === 'finding') speak(missionInstruction(mission.state));
    void camera.start();
  };
  const nav = [...(profile.career === 'medicine' ? [{ id: 'anatomy' as const, label: 'Medicina', icon: Stethoscope }] : []), { id: 'explore' as const, label: 'Explorar', icon: Compass }, { id: 'objects' as const, label: 'Explora objetos', icon: Box }, { id: 'missions' as const, label: 'Misiones', icon: Flag }, { id: 'practice' as const, label: 'Practicar', icon: GraduationCap }, { id: 'words' as const, label: 'Mis palabras', icon: BookOpen }];
  return <div className="app-shell"><aside className="sidebar"><a className="brand" href="#" onClick={e => { e.preventDefault(); go('explore'); }} aria-label="Frasivo Explore, inicio"><span className="brand-mark"><Leaf size={22}/></span><span>frasivo<span className="brand-sub">explore</span></span></a><p className="sidebar-caption">Inglés enfocado en tu carrera.</p><nav aria-label="Navegación principal">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${tab === id ? 'active' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}><Icon size={21}/>{label}{id === 'words' && session.length > 0 ? <span className="nav-count">{session.length}</span> : null}</button>)}</nav><div className="sidebar-bottom"><div className="plant-icon">🌿</div><h3>Un poquito cada día.</h3><p>Las palabras que te rodean pueden ser tu próxima lección.</p><div className="prototype-label">Módulo independiente · v0.3</div></div></aside>
    <main><header className="topbar"><span className="breadcrumb">Tu espacio de inglés <span>/</span> <strong>{tab === 'anatomy' ? 'Medicina' : tab === 'explore' ? 'Explore my world' : tab === 'objects' ? 'Explora objetos' : tab === 'missions' ? 'Misión del aula' : tab === 'practice' ? 'Práctica' : 'Mis palabras'}</strong></span><div className="topbar-right">{install ? <button className="install-button" onClick={async () => { try { await install.prompt(); await install.userChoice; setInstall(null); } catch { setInstall(null); } }}><ArrowDownToLine size={16}/> Instalar</button> : null}<span className="points"><Sparkles size={16}/>{progress.points + careerProgress.points} puntos</span><button className="avatar profile-avatar" aria-label="Editar perfil" onClick={onEditProfile}>{profile.name.charAt(0).toUpperCase()}</button></div></header>
      <div className="main-content">{profileNotice ? <div className="notice" role="status">{profileNotice}</div> : null}{careerStorageWarning ? <div className="notice" role="status">No pudimos guardar tu práctica de carrera. El avance durará esta sesión.</div> : null}{offline ? <div className="notice">Estás sin conexión. El escaneo funciona si el modelo ya está disponible; el audio depende de las voces instaladas.</div> : null}{storageWarning ? <div className="notice" role="status">El navegador no permite guardar tu progreso. Podrás practicar durante esta sesión.</div> : null}{audioMessage ? <div className="notice" role="status">{audioMessage}<button aria-label="Cerrar aviso de audio" onClick={() => setAudioMessage('')}><X size={16}/></button></div> : null}
      <div className="page-heading"><div><div className="heading-kicker"><span className="tiny-leaf"><Leaf size={14}/></span> Inglés en la vida real</div><h1>{tab === 'anatomy' ? 'Anatomía en movimiento.' : tab === 'explore' ? 'Tu inglés, tu carrera.' : tab === 'objects' ? profile.career === 'systems' ? 'El software toma forma.' : profile.career === 'medicine' ? 'La medicina toma forma.' : 'La cocina toma forma.' : tab === 'missions' ? 'Un reto de inglés en tu aula.' : tab === 'practice' ? 'Lo que descubres, lo aprendes.' : 'Tu mundo, palabra por palabra.'}</h1><p>{tab === 'anatomy' ? 'Músculos, huesos y órganos sobre la cámara.' : tab === 'explore' ? `Aprende vocabulario de ${careers[profile.career].label} y practica a tu nivel.` : tab === 'objects' ? 'Elige una palabra, explora su forma y escucha cómo se dice.' : tab === 'missions' ? 'Busca objetos reales con un objetivo y practica sus palabras.' : tab === 'practice' ? 'Practica con las palabras que exploraste en esta sesión.' : 'Escucha, repasa y sigue sumando palabras a tu día.'}</p></div><span className="beginner-tag">{levels[profile.level].label} · {levels[profile.level].cefr}</span></div>
      {tab === 'anatomy' && profile.career === 'medicine' ? <Suspense fallback={<p role="status">Preparando el atlas anatómico…</p>}><MedicineExplorer suspended={suspended} onSpeak={speak}/></Suspense> : null}
      {tab === 'explore' && profile.career === 'medicine' ? <section className="anatomy-entry"><div><h2><Stethoscope size={19}/> Medicina · Anatomía sobre cámara</h2><p>Descubre músculos, huesos y órganos con ilustraciones que siguen tu cuerpo.</p></div><button className="primary" onClick={() => go('anatomy')}>Explorar anatomía<ArrowRight size={16}/></button></section> : null}
      {tab === 'objects' ? <Suspense fallback={<p role="status">Preparando los objetos 3D…</p>}><ExploreObjects suspended={suspended} career={profile.career} initialTermId={careerTermId} onSpeak={speak}/></Suspense> : null}
      {tab === 'explore' ? <CareerHome profile={profile} onExplore={() => go('objects')} onPractice={() => { go('practice'); setCareerPractice(true); }}/> : null}
      {tab === 'explore' ? <MissionEntry onOpen={() => go('missions')}/> : null}
      {tab === 'missions' && mission.state.phase === 'ready' ? <MissionIntro mission={mission.state} onStart={startMission}/> : null}
      {tab === 'missions' && missionSearch ? <div ref={missionStatusRef} className="mission-status"><MissionBanner mission={mission.state} onReplay={() => speak(mission.state.phase === 'found' ? wordById(mission.state.targets[mission.state.index])!.example : missionInstruction(mission.state))} onNext={nextMission} onReset={resetMission}/></div> : null}
      <div hidden={!cameraVisible}><div className="explore-grid"><section className="explore-area"><div className="section-line"><h2><ScanLine size={19}/> Explore my world</h2><span className={`camera-indicator ${camera.status === 'scanning' ? 'live' : ''}`}><i/>{camera.status === 'scanning' ? 'Cámara activa' : 'Listo para explorar'}</span></div><div ref={cameraAreaRef} className={`viewfinder ${active ? 'is-active' : ''}`}><video ref={camera.videoRef} autoPlay playsInline muted aria-label="Vista de la cámara" className={active ? 'visible' : ''}/>{!active ? <><RoomScene/><span className="illustration-label">Ilustración de ejemplo</span><div className="scene-overlay"><div className="camera-circle"><Camera size={25}/></div><h3>Tu entorno es tu aula.</h3><p>Encuentra una palabra nueva en algo cotidiano.</p></div></> : <><div className="scan-guide" aria-hidden="true"><i/><i/><i/><i/></div>{camera.status === 'scanning' ? <><div className="live-label"><i/> Escaneando tu entorno</div><ObjectOverlay detections={camera.detections} selectedTrackId={selectedTrackId} onSelect={selectObject}/><div className="scan-hint">{camera.detections.length ? 'Toca una etiqueta para aprender la palabra.' : 'Muestra un solo objeto de frente, completo y con buena luz.'}</div></> : <div className="camera-loading" role="status"><LoaderCircle className="spin" size={30}/><strong>{camera.status === 'permission' ? 'Esperando permiso de cámara…' : 'Preparando el reconocimiento…'}</strong><p>{camera.status === 'permission' ? 'Permite el acceso en el aviso de tu navegador.' : 'La primera carga puede tardar unos segundos.'}</p></div>}</> }</div>
        {camera.error ? <div className="camera-error" role="alert">{camera.error}{camera.diagnostic ? <details className="camera-diagnostic"><summary>Detalle del error</summary><code>{camera.diagnostic}</code></details> : null}</div> : null}
        <div className="camera-actions"><button className={active ? 'secondary' : 'primary'} onClick={() => active ? camera.stop() : activateCamera()}>{active ? <Square size={17}/> : <Camera size={18}/>} {active ? 'Detener escaneo' : 'Activar cámara'}</button>{tab === 'explore' ? <button className="text-button" aria-expanded={manual} onClick={() => { camera.stop(); setManual(v => !v); }}>{manual ? 'Cerrar práctica manual' : 'Probar sin cámara'}<ArrowRight size={17}/></button> : null}</div>{camera.status === "scanning" ? <p className="analysis-speed" aria-live="off">{camera.metrics && camera.metrics.fps > 0 ? <><span className="speed-dot"/>{camera.metrics.fps.toFixed(1)} análisis por segundo <span>·</span> {Math.round(camera.metrics.inferenceMs)} ms por análisis</> : "Midiendo velocidad de análisis…"}</p> : null}<p className="privacy-note"><ShieldCheck size={15}/> Las imágenes se procesan en tu dispositivo y no se guardan.</p>
        {tab === 'explore' && manual ? <section className="manual-picker"><h3>Elige objetos para practicar</h3><p>Selección manual: estos objetos no se han detectado con la cámara.</p><div className="manual-words">{vocabulary.map(w => <button key={w.id} onClick={() => chooseManual(w)} className={session.some(s => s.id === w.id) ? 'chosen' : ''}><span>{w.emoji}</span>{w.en}{!w.label ? <small className="manual-only">Manual</small> : null}{session.some(s => s.id === w.id) ? <Check size={14}/> : null}</button>)}</div></section> : null}
        {tab === 'explore' ? <><SupportedObjects/><section className="discoveries"><div className="section-line"><h2>Palabras de esta sesión <span className="small-count">{session.length}</span></h2>{session.length ? <button className="text-button" onClick={() => go('practice')}>Practicar <ArrowRight size={16}/></button> : null}</div>{session.length ? <div className="session-words">{session.map(s => { const w = wordById(s.id)!; return <button key={s.id} className={`session-word ${selectedId === s.id ? 'selected' : ''}`} onClick={() => { setSelectedTrackId(null); setSelectedId(s.id); }}><span>{w.emoji}</span><strong>{w.en}</strong><small>{s.source === 'camera' ? 'Detectado' : 'Manual'}</small></button>; })}</div> : <div className="empty-discoveries"><BookOpen size={23}/><p>Tus descubrimientos aparecerán aquí.<br/><span>Empieza con un libro, una taza o una silla.</span></p></div>}</section></> : null}</section>
        <aside className="learning-panel" ref={panelRef} id="educational-panel"><WordCard word={selectedWord} source={session.find(s => s.id === selectedId)} onSpeak={speak} liveConfidence={currentRecognition?.score} onPractice={tab === 'explore' ? () => go('practice', [selectedWord.id]) : undefined} trackingState={selectedTrackId ? selectedTrack ? selectedTrack.observed ? 'visible' : 'missing' : 'lost' : undefined} onReturnToCamera={() => scrollTo(cameraAreaRef.current)}/><div className="tip"><span>💡</span><p><strong>Pequeño reto</strong>Mira a tu alrededor. ¿Cuántos objetos puedes nombrar en inglés?</p></div></aside></div>
        {tab === 'explore' ? <section className="how-to"><div><span className="step-icon"><Camera size={20}/></span><div><h3>Activa tu cámara</h3><p>Permite el acceso para empezar.</p></div></div><div><span className="step-icon"><ScanLine size={20}/></span><div><h3>Encuentra un objeto</h3><p>Apunta con buena iluminación.</p></div></div><div><span className="step-icon"><GraduationCap size={20}/></span><div><h3>Hazlo parte de tu inglés</h3><p>Escucha la palabra y practica.</p></div></div></section> : null}</div>
      <div className="mission-practice" hidden={tab !== 'missions' || mission.state.phase !== 'practice'}>
        {mission.state.phase === 'practice' ? <><p className="mission-practice-note">Encontraste los tres objetos. Ahora repasa una palabra en cada ejercicio.</p><Practice ids={mission.state.targets} questions={mission.state.questions} onAnswer={(wordId, correct, questionId) => { sendMission({ type: 'answer', wordId, correct, questionId }); }} onExplore={() => go('missions')} onFinish={() => { sendMission({ type: 'finish' }); }}/></> : null}
      </div>
      {tab === 'missions' && mission.state.phase === 'complete' ? <MissionSummary mission={mission.state} onReset={resetMission} onExplore={() => go('explore')}/> : null}
      {tab === 'practice' && careerPractice ? <CareerPractice key={practiceRound} profile={profile} onExplore={() => go('objects')} onAnswer={(id, right) => setCareerProgress(p => recordCareerAnswer(profile.career, p, id, right))}/> : null}
      {tab === 'practice' && !careerPractice ? <Practice key={practiceRound} ids={practiceIds ?? session.map(s => s.id)} onExplore={() => go('explore')} onAnswer={(id, right) => setProgress(p => recordAnswer(p, id, right))}/> : null}
      {tab === 'words' ? <><CareerCollection profile={profile} progress={careerProgress} onSpeak={speak} onOpen={id => { setCareerTermId(id); go('objects'); }}/><h2 className="environment-collection-heading">Vocabulario del entorno</h2><div className="progress-overview"><div><strong>{learned}</strong><span>palabras reforzadas</span></div><div><strong>{attempts ? Math.round(correct / attempts * 100) : 0}%</strong><span>de aciertos</span></div><div><strong>{progress.points}</strong><span>puntos acumulados</span></div></div><p className="collection-note">Una palabra se considera reforzada con al menos dos aciertos y un 80% de precisión. Billetes, lapiceros, puertas y lámparas están disponibles solo para práctica manual.</p><div className="vocabulary-grid">{vocabulary.map(w => { const s = progress.words[w.id]; const reinforced = s && s.correct >= 2 && s.correct / s.attempts >= .8; return <article className="collection-word" key={w.id}><div className="collection-word-top"><span>{w.emoji}</span><button className="sound-button" onClick={() => speak(w.en)} aria-label={`Escuchar ${w.en}`}><Volume2 size={19}/></button></div><h2>{w.en}</h2><p>{w.es}</p><span className="recognition-type">{w.label ? "Con cámara" : "Solo manual"}</span><small className={reinforced ? 'reinforced' : ''}>{reinforced ? '✓ Reforzada' : s ? `${s.correct}/${s.attempts} aciertos · Sigue practicando` : 'Aún sin practicar'}</small><button className="text-button" onClick={() => { chooseManual(w); go('explore'); }}>Ver palabra <ArrowRight size={15}/></button></article>; })}</div></> : null}
      <footer><span><Leaf size={14}/> Aprender empieza por mirar de otra manera.</span><span>Frasivo Explore · Progreso en este dispositivo</span></footer></div>
    </main><nav className="mobile-nav" aria-label="Navegación móvil">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}><Icon size={21}/><span>{label}</span></button>)}</nav>
  </div>;
}
