import { validProfile, type LearnerProfile } from '../profile/profile';
import type { Progress } from '../storage';
export interface Account { id: string; email: string; profile: LearnerProfile }
export interface AccountSnapshot { user: Account | null; csrf: string; progress: Record<string, Progress> }
export class ApiError extends Error { constructor(message: string, public status: number, public code?: string) { super(message); } }
export class AccountApi {
  csrf = '';
  private pendingSession: Promise<AccountSnapshot> | null = null;
  async request<T>(path: string, method = 'GET', data?: unknown, token = this.csrf, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timer = window.setTimeout(abort, 15000);
    try {
      const response = await fetch(`/api${path}`, { method, credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...(method === 'GET' ? {} : { 'X-CSRF-Token': token }) }, body: data === undefined ? undefined : JSON.stringify(data) });
      if (response.status === 204) return undefined as T;
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new ApiError(body.error ?? 'No se pudo completar la solicitud.', response.status, body.code);
      if (!response.headers.get('Content-Type')?.includes('application/json')) throw new ApiError('El servidor de cuentas no está disponible.', 503);
      return body as T;
    } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError('No pudimos conectar con Frasivo. Comprueba tu conexión y vuelve a intentarlo.', 0); }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  session(): Promise<AccountSnapshot> {
    if (!this.pendingSession) this.pendingSession = this.request<AccountSnapshot>('/session').then(data => { this.validateSnapshot(data); this.csrf = data.csrf; return data; }).finally(() => { this.pendingSession = null; });
    return this.pendingSession;
  }
  async enter(path: '/login' | '/register', data: unknown): Promise<AccountSnapshot> {
    try { const result = await this.request<AccountSnapshot>(path, 'POST', data); this.validateSnapshot(result); if (!result.user) throw new ApiError('No se pudo iniciar sesión.', 503); this.csrf = result.csrf; return result; }
    catch (error) { if (error instanceof ApiError && error.status === 403) await this.session(); throw error; }
  }
  updateProfile(profile: LearnerProfile) { return this.request<{ user: Account }>('/me', 'PUT', profile); }
  logout() { return this.request<void>('/logout', 'POST', {}); }
  saveProgress(key: string, value: Progress, token: string, signal: AbortSignal, write: { base: Progress; requestId: string }) { return this.request('/progress', 'PUT', { key, value, ...write }, token, signal).then(() => {}); }
  private validateSnapshot(data: AccountSnapshot) {
    if (!data || typeof data.csrf !== 'string' || !/^[a-f0-9]{64}$/.test(data.csrf) || !data.progress || typeof data.progress !== 'object' || Array.isArray(data.progress) || (data.user !== null && (!data.user || typeof data.user.id !== 'string' || !data.user.id || typeof data.user.email !== 'string' || !validProfile(data.user.profile)))) throw new ApiError('La respuesta del servidor de cuentas no es válida.', 503);
  }
}
