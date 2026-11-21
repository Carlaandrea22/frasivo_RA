import { recognizedWords, type RawRecognition, type Recognition } from './learning';

export type NormalizedBox = NonNullable<RawRecognition['box']>;
export interface TrackedRecognition extends Recognition {
  trackId: string;
  box: NormalizedBox;
  observed: boolean;
}
interface Track { result: TrackedRecognition; lastBox: NormalizedBox; lastSeen: number }

function visibleBox(box?: NormalizedBox): NormalizedBox | null {
  if (!box || !Object.values(box).every(Number.isFinite) || box.width <= 0 || box.height <= 0) return null;
  const x = Math.max(0, box.x), y = Math.max(0, box.y);
  const right = Math.min(1, box.x + box.width), bottom = Math.min(1, box.y + box.height);
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}
function overlap(a: NormalizedBox, b: NormalizedBox): number {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const intersection = width * height;
  return intersection / (a.width * a.height + b.width * b.height - intersection);
}
function distance(a: NormalizedBox, b: NormalizedBox): number {
  return Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2);
}
function candidates(raw: RawRecognition[]): (Recognition & { box: NormalizedBox })[] {
  const found: (Recognition & { box: NormalizedBox })[] = [];
  for (const detection of [...raw].sort((a, b) => b.score - a.score)) {
    // Reuse the existing confidence/category rules without deduplicating by word.
    const recognition = recognizedWords([detection])[0];
    const box = visibleBox(detection.box);
    if (!recognition || !box || found.some(other => other.word.id === recognition.word.id && overlap(other.box, box) >= .7)) continue;
    found.push({ ...recognition, box });
  }
  return found;
}
function smooth(old: NormalizedBox, next: NormalizedBox): NormalizedBox {
  // Follow a large genuine move immediately rather than dragging the label behind it.
  if (distance(old, next) > .12) return next;
  const blend = (a: number, b: number) => a + (b - a) * .55;
  return { x: blend(old.x, next.x), y: blend(old.y, next.y), width: blend(old.width, next.width), height: blend(old.height, next.height) };
}

export function createObjectTracker(prefix = 'object') {
  let sequence = 0;
  let graceMs = 450;
  let tracks: Track[] = [];
  const expire = (now: number) => {
    tracks = tracks.filter(t => now - t.lastSeen < graceMs);
    return tracks.map(t => t.result);
  };
  return {
    setFrameInterval(intervalMs: number) {
      if (Number.isFinite(intervalMs) && intervalMs > 0) graceMs = Math.min(1500, Math.max(450, intervalMs * 2.5));
    },
    update(raw: RawRecognition[], now: number): TrackedRecognition[] {
      expire(now);
      const detections = candidates(raw);
      const edges: { track: number; detection: number; affinity: number }[] = [];
      tracks.forEach((track, ti) => detections.forEach((detection, di) => {
        if (track.result.word.id !== detection.word.id) return;
        const iou = overlap(track.lastBox, detection.box), gap = distance(track.lastBox, detection.box);
        const sizeRatio = detection.box.width * detection.box.height / (track.lastBox.width * track.lastBox.height);
        if (sizeRatio < .25 || sizeRatio > 4 || (iou < .15 && gap > .18)) return;
        edges.push({ track: ti, detection: di, affinity: .7 * iou + .3 * Math.max(0, 1 - gap / .18) });
      }));
      edges.sort((a, b) => b.affinity - a.affinity || a.track - b.track || a.detection - b.detection);
      const matched = new Map<number, number>(), used = new Set<number>();
      for (const edge of edges) {
        if (!matched.has(edge.track) && !used.has(edge.detection)) { matched.set(edge.track, edge.detection); used.add(edge.detection); }
      }
      tracks = tracks.map((track, index) => {
        const di = matched.get(index);
        if (di === undefined) return { ...track, result: { ...track.result, observed: false } };
        const detection = detections[di];
        return { lastBox: detection.box, lastSeen: now, result: { ...detection, trackId: track.result.trackId, box: smooth(track.result.box, detection.box), observed: true } };
      });
      detections.forEach((detection, index) => {
        if (!used.has(index)) tracks.push({ lastBox: detection.box, lastSeen: now, result: { ...detection, trackId: `${prefix}-${++sequence}`, observed: true } });
      });
      return tracks.map(t => t.result);
    },
    expire,
    timeUntilExpiry(now: number): number | null {
      return tracks.length ? Math.max(0, Math.min(...tracks.map(t => t.lastSeen + graceMs - now))) : null;
    },
  };
}
