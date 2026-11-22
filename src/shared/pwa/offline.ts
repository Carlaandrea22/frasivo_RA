export interface OfflineStatus {
  base: boolean;
  camera: boolean;
  muscles: boolean;
  organs: boolean;
  explore: boolean;
  full: boolean;
  hand: boolean;
  face: boolean;
}

export async function warmAnatomyLayer(layer: 'bones' | 'muscles' | 'organs') {
  if (layer === 'bones' || !import.meta.env.PROD || !navigator.onLine || !('serviceWorker' in navigator)) return;
  const serviceWorker = navigator.serviceWorker;
  const worker = serviceWorker.controller ?? (await serviceWorker.ready).active;
  worker?.postMessage({ type: 'LUMAR_WARM_LAYER', layer });
}

export function requestOfflineStatus(): Promise<OfflineStatus | null> {
  const worker = navigator.serviceWorker?.controller;
  if (!worker) return Promise.resolve(null);
  return new Promise(resolve => {
    const channel = new MessageChannel();
    function finish(status: OfflineStatus | null) {
      window.clearTimeout(timeout);
      channel.port1.close();
      resolve(status);
    }
    const timeout = window.setTimeout(() => finish(null), 3_000);
    channel.port1.onmessage = ({ data }: MessageEvent<OfflineStatus>) => finish(data);
    try {
      worker.postMessage({ type: 'LUMAR_OFFLINE_STATUS' }, [channel.port2]);
    } catch {
      finish(null);
    }
  });
}
