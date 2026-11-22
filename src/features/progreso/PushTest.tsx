import { useEffect, useState, type FormEvent } from 'react';
import { BellRing } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import './push-test.css';

type Job = { id: string; sendAt: number; status: 'scheduled' | 'accepted' | 'failed'; providerStatus?: number };
type Prepared = {
  accessCode: string;
  appKey: Uint8Array<ArrayBuffer>;
  registration: ServiceWorkerRegistration;
  subscription: PushSubscription | null;
};

const receiptKey = 'lumar.push-test:last-job';

function readReceipt() {
  try { return window.localStorage.getItem(receiptKey); } catch { return null; }
}

function rememberReceipt(id: string) {
  try { window.localStorage.setItem(receiptKey, id); } catch { /* The current test still works. */ }
}

async function api<T>(path: string, code: string, subscription?: PushSubscription): Promise<T> {
  const response = await fetch('/api/push-test/' + path, {
    cache: 'no-store',
    headers: { 'X-Lumar-Push-Code': code, ...(subscription ? { 'Content-Type': 'application/json' } : {}) },
    method: subscription ? 'POST' : 'GET',
    body: subscription ? JSON.stringify(subscription.toJSON()) : undefined,
  });
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('El servidor de la prueba no está disponible en esta dirección.');
  }
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? 'No se pudo completar la solicitud.');
  return value as T;
}

function applicationKey(publicKey: string) {
  const padding = '='.repeat((4 - publicKey.length % 4) % 4);
  return Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/') + padding), byte => byte.charCodeAt(0));
}

function hasCurrentKey({ subscription, appKey }: Prepared) {
  if (!subscription) return true;
  const subscribed = subscription.options.applicationServerKey;
  if (!subscribed) return false;
  const bytes = new Uint8Array(subscribed);
  return bytes.length === appKey.length && appKey.every((byte, index) => bytes[index] === byte);
}

async function waitForWorker() {
  let timer: number | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error('LumAR todavía está preparando el servicio de notificaciones. Recarga y vuelve a probar.')), 20_000);
      }),
    ]);
  } finally {
    window.clearTimeout(timer);
  }
}

export function PushTest() {
  const [code, setCode] = useState('');
  const [prepared, setPrepared] = useState<Prepared>();
  const [job, setJob] = useState<Job>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const secure = window.isSecureContext;
  const supported = secure && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const canSchedule = prepared && hasCurrentKey(prepared);
  const jobId = job?.id;
  const monitoringCode = prepared?.accessCode;
  const pending = job?.status === 'scheduled';

  useEffect(() => {
    if (!monitoringCode || !jobId || !pending) return;
    let disposed = false;
    const timer = window.setInterval(() => {
      void api<Job>('jobs/' + jobId, monitoringCode).then(result => {
        if (!disposed) setJob(result);
      }).catch(() => { /* Keep the last confirmed receipt while offline. */ });
    }, 2800);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [jobId, monitoringCode, pending]);

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supported || busy) return;
    const accessCode = code.trim();
    setError('');
    setBusy(true);
    try {
      const { publicKey } = await api<{ publicKey: string }>('config', accessCode);
      const registration = await waitForWorker();
      const subscription = await registration.pushManager.getSubscription();
      const receipt = readReceipt();
      if (receipt) setJob(await api<Job>('jobs/' + receipt, accessCode).catch(() => undefined));
      setPrepared({ accessCode, registration, subscription, appKey: applicationKey(publicKey) });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'No se pudo preparar la prueba.');
    } finally {
      setBusy(false);
    }
  }

  async function renew() {
    if (!prepared?.subscription || busy) return;
    setBusy(true);
    setError('');
    try {
      if (!await prepared.subscription.unsubscribe()) throw new Error('No se pudo renovar la suscripción. Recarga LumAR y vuelve a probar.');
      setPrepared({ ...prepared, subscription: null });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'No se pudo renovar la suscripción.');
    } finally {
      setBusy(false);
    }
  }

  async function schedule() {
    if (!prepared || !canSchedule || busy || pending) return;
    setBusy(true);
    setError('');
    try {
      // Subscribe directly from the tap. Safari uses that gesture to show its permission prompt.
      const subscription = prepared.subscription ?? await prepared.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: prepared.appKey,
      });
      setPrepared({ ...prepared, subscription });
      const scheduled = await api<Job>('schedule', prepared.accessCode, subscription);
      rememberReceipt(scheduled.id);
      setJob(scheduled);
    } catch (issue) {
      setError(Notification.permission === 'denied'
        ? 'Las notificaciones están bloqueadas para LumAR. Puedes habilitarlas en los ajustes del navegador o del dispositivo.'
        : issue instanceof Error ? issue.message : 'No se pudo programar el aviso.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="lumar-page push-test">
    <a href="#progreso">Volver a Mi progreso</a>
    <header>
      <h1>Prueba de notificaciones</h1>
      <p className="lumar-subtitle">Programa un solo aviso y cierra LumAR para comprobar si llega a tu teléfono.</p>
    </header>
    <Card className="push-test-card">
      {!supported ? <p role="status">{secure
        ? 'Este navegador no ofrece Web Push aquí. En iPhone o iPad, agrega LumAR a la pantalla de inicio y abre ese icono.'
        : 'Abre esta prueba desde una dirección HTTPS. El enlace HTTP de la red Wi-Fi no admite notificaciones push.'}</p>
        : !prepared ? <form onSubmit={prepare}>
          <label htmlFor="push-test-code">Código de prueba</label>
          <input id="push-test-code" className="lumar-search" type="password" autoComplete="off"
            autoCapitalize="off" value={code} onChange={event => setCode(event.target.value)} required/>
          <Button type="submit" disabled={busy || !code.trim()}>{busy ? 'Preparando…' : 'Preparar prueba'}</Button>
        </form> : canSchedule ? <Button disabled={busy || pending} onClick={() => void schedule()}>
          <BellRing size={18} aria-hidden="true"/> {busy ? 'Programando…' : 'Programar aviso en 1 minuto'}
        </Button> : <>
          <p>El servidor de prueba se reinició. Renueva la suscripción antes de programar otro aviso.</p>
          <Button disabled={busy} onClick={() => void renew()}>Renovar suscripción</Button>
        </>}

      {job && <div className="push-test-receipt" role="status">
        {job.status === 'scheduled' && <><strong>Aviso programado.</strong> Ya puedes cerrar LumAR. El servidor intentará enviarlo a las {new Date(job.sendAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.</>}
        {job.status === 'accepted' && <><strong>Envío aceptado por el servicio push.</strong> Busca el aviso de LumAR en el centro de notificaciones.</>}
        {job.status === 'failed' && <><strong>No se pudo enviar el aviso.</strong> {job.providerStatus ? `El servicio respondió con el código ${job.providerStatus}.` : 'Revisa que el servidor tenga conexión a Internet y vuelve a probar.'}</>}
      </div>}
      {error && <p role="alert" className="push-test-error">{error}</p>}
    </Card>
  </section>;
}
