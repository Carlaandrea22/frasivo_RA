import type { AnatomyLayer, BodyPoint } from './anatomy';

export interface PoseEngine {
  model: 'lite' | 'full';
  delegate: 'GPU' | 'CPU';
}

type Discard = [bone: string, stage: string, reason: string];

interface Drawing {
  layer: AnatomyLayer | null;
  region: string | null;
  bones: string[];
  discards: Discard[];
}

interface DiagnosticFrame extends Drawing, PoseEngine {
  timeMs: number;
  visibility: (number | null)[];
}

declare const __LUMAR_COMMIT__: string | null;

const windowMs = 15_000;
const missingDrawing: Drawing = { layer: null, region: null, bones: [], discards: [] };

export function createBodyDiagnostic(drawing: (timestamp: number) => Drawing | undefined) {
  let start = 0;
  let frames: DiagnosticFrame[] = [];
  let changes: (PoseEngine & { timeMs: number; reason: string })[] = [];
  let latest: { frame: DiagnosticFrame; timestamp: number } | undefined;

  function captureDrawing() {
    if (!latest) return;
    const drawn = drawing(latest.timestamp);
    if (drawn) Object.assign(latest.frame, drawn);
  }

  return {
    reset(now: number) {
      start = now;
      frames = [];
      changes = [];
      latest = undefined;
    },
    engine(now: number, engine: PoseEngine, reason: string) {
      changes.push({ ...engine, timeMs: Math.round(now-start), reason });
    },
    frame(timestamp: number, now: number, { model, delegate }: PoseEngine, points: readonly Pick<BodyPoint, 'visibility'>[]) {
      captureDrawing();
      const timeMs = Math.round(now-start);
      const visibility = Array.from({ length: 33 }, (_, i) => {
        const score = points[i]?.visibility;
        return score !== undefined && Number.isFinite(score) ? Math.round(score*10_000)/10_000 : null;
      });
      const frame = { ...missingDrawing, model, delegate, timeMs, visibility };
      frames = frames.filter(sample => timeMs-sample.timeMs <= windowMs);
      frames.push(frame);
      latest = { frame, timestamp };
    },
    captureDrawing,
    read() {
      captureDrawing();
      const frame = latest?.frame;
      const elapsed = frame ? frame.timeMs-frames[0].timeMs : 0;
      const engine = frame ?? changes.at(-1);
      return {
        schemaVersion: 1,
        windowMs,
        engine: engine ? { model: engine.model, delegate: engine.delegate } : null,
        engineChanges: changes.slice(),
        poseFps: elapsed > 0 ? Math.round((frames.length-1)*10_000/elapsed)/10 : 0,
        frames: frames.map(sample => ({ ...sample })),
      };
    },
  };
}

export type BodyDiagnostic = ReturnType<typeof createBodyDiagnostic>;

export function readBodyDrawing(stage: HTMLElement | null, timestamp: number): Drawing | undefined {
  if (!stage || stage.dataset.poseTime !== String(timestamp)) return;
  const layer = stage.dataset.poseLayer as AnatomyLayer;
  const debugPanel = stage.querySelector<HTMLElement>('.anatomy-debug');
  const bones = new Set<string>();
  if (layer === 'bones') {
    for (const image of stage.querySelectorAll('.anatomy-sprites[data-rendered="bones"] image[data-part]')) {
      bones.add(image.getAttribute('data-part')!);
    }
    const regional = stage.querySelector<HTMLElement>('[data-diagnostic-bones]');
    for (const bone of regional?.dataset.diagnosticBones?.split(' ') ?? []) if (bone) bones.add(bone);
  }
  return {
    layer,
    region: debugPanel?.dataset.diagnosticRegion ?? stage.dataset.bodyRegion ?? null,
    bones: [...bones],
    discards: JSON.parse(debugPanel?.dataset.boneRejections ?? '[]') as Discard[],
  };
}

export async function shareBodyDiagnostic(diagnostic: BodyDiagnostic) {
  const report = {
    ...diagnostic.read(),
    commit: __LUMAR_COMMIT__,
    device: {
      browser: navigator.userAgent,
      screen: { width: screen.width, height: screen.height, pixelRatio: window.devicePixelRatio },
      orientation: screen.orientation?.type ?? (matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape'),
    },
  };
  const file = new File([JSON.stringify(report)], 'lumar-diagnostico.json', { type: 'application/json' });
  try {
    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Diagnóstico de LumAR' });
      return;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
