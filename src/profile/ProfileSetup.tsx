import { useState, type ReactNode } from 'react';
import { ArrowRight, ChefHat, Code2, Leaf, LogOut, Stethoscope } from 'lucide-react';
import { careers, levels, type CareerId, type EnglishLevel, type LearnerProfile } from './profile';
import './profile.css';

const careerIcons = { medicine: Stethoscope, gastronomy: ChefHat, systems: Code2 };
export function ProfileSetup({ initial, onSave, onCancel, onLogout, notice, busy = false, submitLabel, fields, footer }: {
  initial?: LearnerProfile; onSave: (profile: LearnerProfile) => void; onCancel?: () => void; onLogout?: () => void; notice?: string;
  busy?: boolean; submitLabel?: string; fields?: ReactNode; footer?: ReactNode;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [career, setCareer] = useState<CareerId | null>(initial?.career ?? null);
  const [level, setLevel] = useState<EnglishLevel | null>(initial?.level ?? null);
  return <main className="profile-page">
    <aside className="profile-intro"><a className="brand" href="#" onClick={e => e.preventDefault()}><span className="brand-mark"><Leaf size={24}/></span><span>frasivo</span></a>
      <div className="profile-intro-copy"><span>Tu profesión también se aprende en inglés.</span><h1>{initial ? 'Tu camino puede cambiar.' : 'Inglés enfocado en tu carrera.'}</h1><p>Explora palabras de tu área, escucha cómo se dicen y practica a tu ritmo.</p>
        <div className="profile-language-art" aria-hidden="true"><div><Stethoscope size={28}/><span>Heart</span><small>Corazón</small></div><div><ChefHat size={28}/><span>Whisk</span><small>Batidor</small></div><div><Code2 size={28}/><span>Framework</span><small>Marco de trabajo</small></div></div>
      </div><p className="profile-local-note">Tu cuenta conserva tu carrera, tu nivel y tu progreso para continuar en otro dispositivo.</p>
    </aside>
    <section className="profile-form-panel"><form onSubmit={event => { event.preventDefault(); if (name.trim() && career && level) onSave({ version: 1, name: name.trim(), career, level }); }}>
      <div className="profile-form-heading"><p>{initial ? 'Ajusta tu aprendizaje' : 'Empecemos por conocerte'}</p><h2>{initial ? 'Tu perfil' : 'Prepara tu espacio de inglés'}</h2><span>Elegir tu carrera y tu nivel nos ayuda a preparar tus palabras y preguntas.</span></div>
      {notice ? <p className="notice" role="status">{notice}</p> : null}
      {fields}
      <label className="profile-name">Tu nombre<input disabled={busy} name="name" autoComplete="given-name" maxLength={60} required value={name} onChange={event => setName(event.target.value)} placeholder="¿Cómo te llamas?"/></label>
      <fieldset disabled={busy} className="profile-careers"><legend>¿Cuál es tu carrera?</legend><div>{(Object.keys(careers) as CareerId[]).map(id => {
        const Icon = careerIcons[id]; return <label className="profile-career-option" key={id}><input className="profile-radio" type="radio" name="career" value={id} checked={career === id} onChange={() => setCareer(id)} required/><Icon size={23}/><span><strong>{careers[id].label}</strong><small>{careers[id].description}</small></span><i aria-hidden="true"/></label>;
      })}</div></fieldset>
      <fieldset disabled={busy} className="profile-levels"><legend>¿Cómo te sientes con tu inglés?</legend><p>Elige el nivel que mejor te describa. Puedes cambiarlo después; no es una evaluación.</p><div>{(Object.keys(levels) as EnglishLevel[]).map(id => <label className="profile-level-option" key={id}><input className="profile-radio" type="radio" name="level" value={id} checked={level === id} onChange={() => setLevel(id)} required/><span><strong>{levels[id].label}</strong><b>{levels[id].cefr}</b></span><small>{levels[id].description}</small></label>)}</div></fieldset>
      <button className="primary profile-submit" disabled={busy || !name.trim() || !career || !level}>{submitLabel ?? (initial ? 'Guardar perfil' : 'Crear mi cuenta')}<ArrowRight size={19}/></button>
      {footer}
      {initial ? <div className="profile-edit-actions"><button type="button" disabled={busy} className="text-button" onClick={onCancel}>Volver sin cambios</button><button type="button" disabled={busy} className="text-button" onClick={onLogout}><LogOut size={16}/> Cerrar sesión</button></div> : null}
    </form></section>
  </main>;
}
