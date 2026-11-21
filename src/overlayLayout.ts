import type { TrackedRecognition } from './objectTracking';
export interface LabelPlacement { trackId: string; x: number; y: number; width: number; height: number; anchorX: number; anchorY: number }
interface Size { width: number; height: number }
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
function areaOfOverlap(a: LabelPlacement, b: LabelPlacement): number {
  return Math.max(0, Math.min(a.x + a.width + 5, b.x + b.width + 5) - Math.max(a.x - 5, b.x - 5)) * Math.max(0, Math.min(a.y + a.height + 5, b.y + b.height + 5) - Math.max(a.y - 5, b.y - 5));
}
export function layoutLabels(tracks: TrackedRecognition[], size: Size, selectedId?: string | null): LabelPlacement[] {
  if (size.width <= 0 || size.height <= 0) return [];
  const margin = Math.min(8, size.width / 8, size.height / 8);
  const topMargin = Math.min(48, size.height * .18), bottomMargin = Math.min(52, size.height * .2);
  const width = Math.min(164, Math.max(112, size.width * .34), size.width - margin * 2);
  const height = Math.min(64, size.height - topMargin - bottomMargin);
  const placed: LabelPlacement[] = [];
  const ordered = [...tracks].sort((a, b) => Number(b.trackId === selectedId) - Number(a.trackId === selectedId));
  for (const track of ordered) {
    const anchorX = (track.box.x + track.box.width / 2) * size.width;
    const anchorY = (track.box.y + Math.min(track.box.height / 2, .08)) * size.height;
    const baseX = anchorX - width / 2, baseY = track.box.y * size.height + 8;
    const options: LabelPlacement[] = [];
    for (const [dx, dy] of [[0, 0], [0, -height - 10], [0, height + 10], [-width - 10, 0], [width + 10, 0], [0, 2 * (height + 10)], [0, -2 * (height + 10)]]) {
      options.push({ trackId: track.trackId, x: clamp(baseX + dx, margin, size.width - width - margin), y: clamp(baseY + dy, topMargin, size.height - height - bottomMargin), width, height, anchorX, anchorY });
    }
    const cost = (p: LabelPlacement) => placed.reduce((sum, other) => sum + areaOfOverlap(p, other) * 100, 0) + Math.hypot(p.x - baseX, p.y - baseY);
    options.sort((a, b) => cost(a) - cost(b));
    placed.push(options[0]);
  }
  return placed;
}
