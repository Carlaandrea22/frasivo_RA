import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { AccountApi, ApiError, type Account, type AccountSnapshot } from './api';
import { createAccountRepository, type AccountRepository, type SyncState } from './accountRepository';
import { AuthScreen } from './AuthScreen';
import { ProfileSetup } from '../profile/ProfileSetup';
import type { LearnerProfile } from '../profile/profile';
import type { ProgressStorage } from '../storage';

interface AccountContext { user: Account; storage: ProgressStorage; suspended: boolean; notice: ReactNode; onEditProfile: () => void }
export function AccountRoot({ children }: { children: (context: AccountContext) => ReactNode }) {
  const [api] = useState(() => new AccountApi());
  const [status, setStatus] = useState<'loading' | 'guest' | 'ready' | 'error'>('loading');
  const [user, setUser] = useState<Account | null>(null);
  const [storage, setStorage] = useState<AccountRepository | null>(null);
  const activeStorage = useRef<AccountRepository | null>(null), generation = useRef(0);
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [syncState, setSyncState] = useState<SyncState>('saved');
  const accept = (snapshot: AccountSnapshot) => {
    const token = ++generation.current;
    activeStorage.current?.dispose(); activeStorage.current = null;
    setSyncState('saved'); setEditing(false); setError('');
    setUser(snapshot.user);
    if (!snapshot.user) { setStorage(null); setStatus('guest'); return; }
    const repository = createAccountRepository(snapshot.progress, (key, value, signal, write) => api.saveProgress(key, value, snapshot.csrf, signal, write), (state, cause) => {
      if (generation.current !== token) return;
      setSyncState(state);
      if (cause instanceof ApiError && (cause.status === 401 || cause.code === 'SESSION_CHANGED')) {
        void recoverSession();
      }
    });
    activeStorage.current = repository; setStorage(repository); setStatus('ready');
  };
  useEffect(() => {
    let alive = true;
    void api.session().then(snapshot => { if (alive) accept(snapshot); }).catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [api]);
  useEffect(() => () => { ++generation.current; activeStorage.current?.dispose(); }, []);
  const isSessionError = (cause: unknown) => cause instanceof ApiError && (cause.status === 401 || cause.code === 'SESSION_CHANGED');
  const recoverSession = async () => {
    ++generation.current; activeStorage.current?.dispose(); activeStorage.current = null;
    setUser(null); setStorage(null); setEditing(false); setStatus('loading');
    setNotice('Tu sesión cambió o caducó. Los cambios pendientes no pudieron guardarse.');
    try { accept(await api.session()); } catch { setStatus('error'); }
  };
  const saveProfile = async (profile: LearnerProfile) => {
    if (operation.current) return; operation.current = true; setBusy(true); setError('');
    try { const result = await api.updateProfile(profile); setUser(result.user); setEditing(false); }
    catch (cause) { if (isSessionError(cause)) await recoverSession(); else setError(cause instanceof Error ? cause.message : 'No se pudo guardar tu perfil.'); }
    finally { operation.current = false; setBusy(false); }
  };
  const logout = async () => {
    if (operation.current) return; operation.current = true; setBusy(true); setError('');
    let unsaved = false;
    try {
      try { await activeStorage.current?.flush(); } catch { unsaved = true; }
      await api.logout();
      ++generation.current; activeStorage.current?.dispose(); activeStorage.current = null;
      setUser(null); setStorage(null); setEditing(false); setStatus('loading');
      setNotice(unsaved ? 'Cerraste sesión. Los últimos cambios de progreso no pudieron guardarse.' : 'Sesión cerrada.');
      const snapshot = await api.session(); accept(snapshot);
    } catch (cause) { if (isSessionError(cause)) await recoverSession(); else { setError(cause instanceof Error ? cause.message : 'No se pudo cerrar la sesión.'); if (!activeStorage.current) setStatus('error'); } }
    finally { operation.current = false; setBusy(false); }
  };
  if (status === 'loading') return <main className="auth-loading"><LoaderCircle size={30} className="spin"/><p>Conectando con tu cuenta…</p></main>;
  if (status === 'error') return <main className="auth-loading"><h1>No pudimos conectar con Frasivo.</h1><p>Necesitas conexión con el servidor para iniciar sesión. Tu perfil local anterior no sustituye una cuenta.</p><button className="primary" onClick={() => { setStatus('loading'); void api.session().then(accept).catch(() => setStatus('error')); }}>Reintentar conexión</button></main>;
  if (status === 'guest' || !user || !storage) return <AuthScreen notice={notice} onEnter={async (mode, data) => { const snapshot = await api.enter(mode === 'login' ? '/login' : '/register', data); setNotice(''); accept(snapshot); return snapshot; }}/>;
  const syncNotice = syncState === 'saving' ? 'Guardando tu progreso en la cuenta…' : syncState === 'error' ? <span className="account-sync-notice">No pudimos sincronizar el progreso. Se conserva mientras esta página siga abierta.<button onClick={() => void storage.flush().catch(() => {})}>Reintentar guardado</button></span> : '';
  return <>
    {editing ? <ProfileSetup initial={user.profile} onSave={profile => void saveProfile(profile)} onCancel={() => setEditing(false)} onLogout={() => void logout()} notice={error} busy={busy} submitLabel={busy ? 'Guardando…' : 'Guardar perfil'} fields={<p className="auth-password-help">Cuenta: {user.email}</p>}/> : null}
    <div hidden={editing}>{children({ user, storage, suspended: editing, notice: syncNotice, onEditProfile: () => { setError(''); setEditing(true); } })}</div>
  </>;
}
