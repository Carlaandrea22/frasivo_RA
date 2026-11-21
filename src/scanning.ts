import { vocabulary } from './vocabulary';

export function detectorConfig() {
  return { runningMode: 'VIDEO' as const, scoreThreshold: .65, maxResults: 8, categoryAllowlist: vocabulary.flatMap(w => w.label ? [w.label] : []) };
}

// Target up to 10 analyses/s without queueing frames or monopolizing a slow device.
export function nextFrameDelay(elapsedMs: number): number {
  return Math.max(16, 100 - Math.max(0, elapsedMs));
}
