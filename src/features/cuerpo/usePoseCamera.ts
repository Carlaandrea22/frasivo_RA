import { useCallback, useEffect, useRef, useState } from 'react';
import { useBodyCamera } from './useBodyCamera';
import { captureWindow, type PoseSample } from './poseCapture';
import {
  chooseDetector, type DetectorKind, type DetectorStat, type DetectorState,
  type FaceRegion, type HandRegion, type RegionalHint, type Specialist,
} from './regionalDetection';
import workerUrl from '../../generated/pose.worker.js?url';

const emptyHands: HandRegion[] = [];
const emptySamples: PoseSample[] = [];
const emptyPoints: PoseSample['points'] = [];
const emptyStats = (): Record<DetectorKind, DetectorStat> => ({
  pose: { fps: 0, ms: null, status: 'idle' },
  hand: { fps: 0, ms: null, status: 'idle' },
  face: { fps: 0, ms: null, status: 'idle' },
});

export function usePoseCamera(
  onDetection?: (time: number) => void, detailed = false, regionalHint?: { current: RegionalHint }, paused = false,
) {
  const camera = useBodyCamera(detailed);
  const highDetail = useRef(detailed);
  const hints = useRef(regionalHint);
  const pauseInference = useRef(paused);
  highDetail.current = detailed;
  hints.current = regionalHint;
  pauseInference.current = paused;
  const { status, stop, videoRef } = camera;
  const [history, setHistory] = useState<PoseSample[]>([]);
  const [tracking, setTracking] = useState<'loading' | 'searching' | 'tracking'>('loading');
  const [modelError, setModelError] = useState('');
  const [aspect, setAspect] = useState(4 / 5);
  const [hands, setHands] = useState<HandRegion[]>(emptyHands);
  const [face, setFace] = useState<FaceRegion | null>(null);
  const [handChecked, setHandChecked] = useState(false);
  const [detectorStats, setDetectorStats] = useState(emptyStats);

  useEffect(() => {
    if (status !== 'active') return;
    let disposed = false, busy = false, lastVideoTime = -1, started = 0, lastPoseResult = 0;
    let poseFrames = 0;
    let worker: Worker | undefined;
    const states: Record<DetectorKind, DetectorState> = { pose: 'loading', hand: 'idle', face: 'idle' };
    const last: Record<DetectorKind, number> = { pose: -Infinity, hand: -Infinity, face: -Infinity };
    const times: Record<DetectorKind, number[]> = { pose: [], hand: [], face: [] };
    const lastSeen: Record<Specialist, number> = { hand: 0, face: 0 };
    const missed: Record<Specialist, number> = { hand: 0, face: 0 };
    const durations: Record<DetectorKind, number | null> = { pose: null, hand: null, face: null };

    setModelError('');
    setHistory([]);
    setHands(emptyHands);
    setFace(null);
    setHandChecked(false);
    setTracking('loading');

    function updateStats() {
      const cutoff = performance.now() - 1450;
      const next = emptyStats();
      for (const detector of ['pose', 'hand', 'face'] as const) {
        times[detector] = times[detector].filter(time => time >= cutoff);
        const samples = times[detector];
        const elapsed = samples.length > 1 ? samples.at(-1)! - samples[0] : 0;
        next[detector] = { fps: elapsed > 170 ? Math.round((samples.length-1)*1000 / elapsed*10)/10 : 0,
          ms: durations[detector], status: states[detector] };
      }
      setDetectorStats(next);
    }

    const statsTimer = onDetection ? window.setInterval(updateStats, 500) : undefined;
    if (onDetection) updateStats();

    const fail = (message: string) => {
      if (disposed) return;
      setModelError(message);
      setHistory([]);
      stop();
    };

    const startup = window.setTimeout(() => fail('El modelo tardó demasiado en cargar. Comprueba la conexión y vuelve a activar la cámara.'), 45000);
    try {
      worker = new Worker(workerUrl);
      worker.onmessage = ({ data }) => {
        if (disposed) return;
        if (data.type === 'ready') {
          clearTimeout(startup);
          states.pose = 'ready';
          setTracking('searching');
        } else if (data.type === 'detector-ready' || data.type === 'detector-unavailable') {
          const kind: Specialist = data.kind;
          states[kind] = data.type === 'detector-ready' ? 'ready' : 'unavailable';
          if (kind === 'hand' && data.type === 'detector-unavailable') setHandChecked(true);
          if (data.frame) busy = false;
        } else if (data.type === 'pose' || data.type === 'hand' || data.type === 'face') {
          busy = false;
          const kind: DetectorKind = data.type;
          const arrived = performance.now();
          if (onDetection) {
            times[kind].push(arrived);
            durations[kind] = Math.round(data.ms*10)/10;
          }
          if (data.type === 'pose') {
            poseFrames++;
            lastPoseResult = arrived;
            onDetection?.(arrived);
            const sample: PoseSample = { time: data.time, points: data.points, world: data.world };
            setHistory(previous => sample.points.length
              ? [...previous.filter(frame => sample.time - frame.time <= captureWindow), sample] : []);
            setTracking(sample.points.length ? 'tracking' : 'searching');
          } else if (data.type === 'hand') {
            setHandChecked(true);
            if (data.hands.length || missed.hand === 1) {
              lastSeen.hand = data.hands.length ? arrived : 0;
              setHands(data.hands);
            }
            missed.hand = data.hands.length ? 0 : Math.min(2, missed.hand+1);
          } else {
            if (data.face || missed.face === 1) {
              lastSeen.face = data.face ? arrived : 0;
              setFace(data.face);
            }
            missed.face = data.face ? 0 : Math.min(2, missed.face+1);
          }
        } else if (data.type === 'error') {
          fail('No se pudo iniciar el seguimiento corporal. Vuelve a activar la cámara; si persiste, prueba un navegador actualizado.');
        }
      };
      worker.onerror = () => fail('No se pudo cargar el seguimiento corporal. Comprueba la conexión y reintenta.');
      worker.postMessage({ type: 'init' });
    } catch { fail('El seguimiento corporal no está disponible en este navegador. Puedes explorar la demostración.'); }

    const timer = window.setInterval(async () => {
      if (disposed || pauseInference.current) return;
      const now = performance.now();
      const hint = highDetail.current ? hints.current?.current : undefined;
      if (lastPoseResult && now - lastPoseResult > 720) {
        lastPoseResult = 0;
        setHistory(previous => previous.length ? [] : previous);
        setTracking('searching');
      }
      for (const kind of ['hand', 'face'] as const) {
        if (lastSeen[kind] && now - lastSeen[kind] > 680) {
          lastSeen[kind] = 0;
          if (kind === 'hand') setHands(emptyHands);
          else setFace(null);
        }
      }
      if (busy && now - started > 15000) {
        fail('El seguimiento dejó de responder. Vuelve a activar la cámara.');
        return;
      }
      const video = videoRef.current;
      if (states.pose !== 'ready' || busy || !video || video.readyState < 2 || video.currentTime === lastVideoTime) return;
      // Give the region arbiter time to confirm a complete body before loading specialists.
      if (hint && poseFrames >= 3 && states.hand !== 'loading' && states.face !== 'loading') {
        let prepare: Specialist | undefined;
        if ((!hint.fullBody || hint.detailedHands) && states.hand === 'idle') prepare = 'hand';
        else if ((!hint.fullBody || hint.detailedFace) && states.face === 'idle') prepare = 'face';
        if (prepare) {
          states[prepare] = 'loading';
          worker!.postMessage({ type: 'prepare', detector: prepare });
        }
      }

      if (now - started < (hint ? 76 : 90)) return;
      const active = lastSeen.hand > lastSeen.face ? 'hand' : lastSeen.face ? 'face' : null;
      const detector = hint ? chooseDetector(hint, states, last, now, active) : 'pose';
      busy = true;
      started = now;
      last[detector] = now;
      lastVideoTime = video.currentTime;
      setAspect(video.videoWidth / video.videoHeight);
      try {
        const width = highDetail.current
          ? Math.min(video.videoWidth, detector === 'pose' ? 960 : 640, Math.round(1280*video.videoWidth/video.videoHeight))
          : 640;
        const frame = await createImageBitmap(video, { resizeWidth: width, resizeHeight: Math.max(1, Math.round(width * video.videoHeight / video.videoWidth)) });
        if (disposed) { frame.close(); return; }
        worker!.postMessage({ type: 'frame', detector, frame, timestamp: performance.now() }, [frame]);
      } catch { fail('No se pudo analizar la cámara. Prueba un navegador actualizado o vuelve a intentarlo.'); }
    }, 20);
    return () => {
      disposed = true;
      clearInterval(timer);
      clearInterval(statsTimer);
      clearTimeout(startup);
      worker?.terminate();
    };
  }, [status, stop, videoRef, onDetection]);

  const startCamera = camera.start;
  const start = useCallback(() => {
    setHistory([]);
    setTracking('loading');
    setModelError('');
    return startCamera();
  }, [startCamera]);
  const samples = status === 'active' ? history : emptySamples;
  return {
    ...camera, start, samples, points: samples.at(-1)?.points ?? emptyPoints, tracking, modelError, aspect,
    hands: status === 'active' && detailed ? hands : emptyHands,
    face: status === 'active' && detailed ? face : null,
    handChecked,
    detectorStats,
  };
}
