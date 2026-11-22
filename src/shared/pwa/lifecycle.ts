interface InstallPrompt extends Event {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const displayMode = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui), (display-mode: window-controls-overlay)');
const appleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => displayMode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

let installPrompt: InstallPrompt | undefined;
let installed = false;
let pendingUpdate: ServiceWorker | null = null;
const listeners = new Set<() => void>();

export function subscribePwa(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notify() {
  listeners.forEach(listener => listener());
}

export function getInstallMode() {
  if (installed || standalone()) return 'hidden';
  if (installPrompt) return 'prompt';
  return appleMobile ? 'instructions' : 'hidden';
}

export async function promptInstall() {
  const event = installPrompt;
  if (!event) return;
  installPrompt = undefined;
  notify();
  try {
    await event.prompt();
    if ((await event.userChoice).outcome === 'accepted') {
      installed = true;
      notify();
    }
  } catch (error) {
    console.warn('No se pudo abrir el instalador de LumAR:', error);
  }
}

export function getPendingUpdate() {
  return pendingUpdate;
}

export function activateUpdate(worker: ServiceWorker) {
  worker.postMessage({ type: 'LUMAR_ACTIVATE_UPDATE' });
}

export function initPwa() {
  displayMode.addEventListener('change', notify);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    if (installed || standalone()) return;
    installPrompt = event as InstallPrompt;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    installPrompt = undefined;
    notify();
  });

  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const serviceWorker = navigator.serviceWorker;
  let controller = serviceWorker.controller;
  serviceWorker.addEventListener('controllerchange', () => {
    if (controller && serviceWorker.controller && controller !== serviceWorker.controller) {
      window.location.reload();
    }
    controller = serviceWorker.controller;
  });

  async function register() {
    try {
      const registration = await serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      function syncUpdate() {
        pendingUpdate = serviceWorker.controller ? registration.waiting : null;
        notify();
      }
      function observeInstallation() {
        const worker = registration.installing;
        worker?.addEventListener('statechange', syncUpdate);
        syncUpdate();
      }
      registration.addEventListener('updatefound', observeInstallation);
      serviceWorker.addEventListener('controllerchange', syncUpdate);
      observeInstallation();
    } catch (error) {
      console.warn('No se pudo preparar el modo sin conexión:', error);
    }
  }

  if (document.readyState === 'complete') void register();
  else window.addEventListener('load', register, { once: true });
}
