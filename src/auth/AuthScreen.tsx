import { useState } from 'react';
import { ArrowRight, Leaf, LoaderCircle } from 'lucide-react';
import { ProfileSetup } from '../profile/ProfileSetup';
import type { LearnerProfile } from '../profile/profile';
import type { AccountSnapshot } from './api';
import './auth.css';

export function AuthScreen({ onEnter, notice = '' }: { onEnter: (mode: 'login' | 'register', data: { email: string; password: string; profile?: LearnerProfile }) => Promise<AccountSnapshot>; notice?: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const enter = async (profile?: LearnerProfile) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await onEnter(mode, { email, password, ...(profile ? { profile } : {}) }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos iniciar sesión.'); }
    finally { setBusy(false); }
  };
  const credentials = <div className="auth-credentials"><label className="profile-name">Correo electrónico<input type="email" name="email" autoComplete="email" maxLength={254} required value={email} disabled={busy} onChange={event => setEmail(event.target.value)} placeholder="tu@correo.com"/></label><label className="profile-name">Contraseña<input type="password" name="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={12} maxLength={128} required value={password} disabled={busy} onChange={event => setPassword(event.target.value)}/></label>{mode === 'register' ? <p className="auth-password-help">Usa entre 12 y 128 caracteres. Puedes usar una frase larga que recuerdes.</p> : null}</div>;
  const switchMode = () => { setError(''); setPassword(''); setMode(mode === 'login' ? 'register' : 'login'); };
  if (mode === 'register') return <ProfileSetup onSave={profile => void enter(profile)} notice={error || notice} busy={busy} submitLabel={busy ? 'Creando cuenta…' : 'Crear mi cuenta'} fields={credentials} footer={<p className="auth-switch">¿Ya tienes una cuenta? <button type="button" disabled={busy} onClick={switchMode}>Iniciar sesión</button></p>}/>;
  return <main className="auth-page"><section className="auth-brand"><div className="brand"><span className="brand-mark"><Leaf size={25}/></span><span>frasivo</span></div><h1>El inglés que conecta con tu carrera.</h1><p>Medicina, Gastronomía e Ingeniería de Sistemas. Tus palabras, tu nivel y tu progreso en una cuenta.</p></section><section className="auth-login"><form onSubmit={event => { event.preventDefault(); void enter(); }}><p className="auth-welcome">Tu espacio de aprendizaje</p><h2>Inicia sesión</h2><p className="auth-login-copy">Continúa donde lo dejaste.</p>{notice && !error ? <p className="notice" role="status">{notice}</p> : null}{error ? <p className="notice" role="alert">{error}</p> : null}{credentials}<button className="primary profile-submit" disabled={busy || !email.trim() || !password}>{busy ? <LoaderCircle className="spin" size={18}/> : null}{busy ? 'Iniciando sesión…' : 'Iniciar sesión'}<ArrowRight size={18}/></button><p className="auth-switch">¿Es tu primera vez? <button type="button" disabled={busy} onClick={switchMode}>Crear cuenta</button></p></form></section></main>;
}
