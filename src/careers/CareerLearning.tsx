import { ArrowRight, Box, GraduationCap, Volume2 } from 'lucide-react';
import { careers, levels, type LearnerProfile } from '../profile/profile';
import { careerTerms } from './catalog';
import { careerQuestions } from './learning';
import { Practice } from '../Practice';
import type { Progress } from '../storage';

export function CareerHome({ profile, onExplore, onPractice }: { profile: LearnerProfile; onExplore: () => void; onPractice: () => void }) {
  return <section className="career-home"><div><h2>Hola, {profile.name}.</h2><p>Tu colección de {careers[profile.career].label} ya está lista. Empieza por una palabra y dale contexto.</p><div className="career-home-meta"><span>{careers[profile.career].label}</span><span>{levels[profile.level].label} · {levels[profile.level].cefr}</span><span>{careerTerms(profile.career).length} palabras iniciales</span></div></div><div className="career-home-actions"><button className="primary" onClick={onExplore}><Box size={17}/> Explorar mi carrera<ArrowRight size={16}/></button><button className="text-button" onClick={onPractice}><GraduationCap size={17}/> Practicar mi carrera</button></div></section>;
}
export function CareerPractice({ profile, onAnswer, onExplore }: { profile: LearnerProfile; onAnswer: (id: string, correct: boolean) => void; onExplore: () => void }) {
  return <><div className="career-practice-context"><strong>{careers[profile.career].label}</strong><span>{levels[profile.level].label} · {levels[profile.level].cefr}</span><p>{profile.level === 'beginner' ? 'Relaciona cada palabra con su significado.' : profile.level === 'intermediate' ? 'Elige el término que completa la frase.' : 'Lee una definición en inglés y escribe el término.'}</p></div><Practice activityLabel={profile.level === 'beginner' ? 'Traduce la palabra' : profile.level === 'intermediate' ? 'Palabra en contexto' : 'Definición en inglés'} ids={[]} questions={careerQuestions(profile.career, profile.level)} instructions={profile.level === 'advanced' ? 'Escribe el término en inglés que corresponde a la definición.' : profile.level === 'intermediate' ? 'Completa la frase con la opción correcta.' : 'Elige el significado en español.'} showVisual={profile.level === 'beginner'} onAnswer={onAnswer} onExplore={onExplore}/></>;
}
export function CareerCollection({ profile, progress, onSpeak, onOpen }: { profile: LearnerProfile; progress: Progress; onSpeak: (text: string) => void; onOpen: (id: string) => void }) {
  const terms = careerTerms(profile.career);
  const learned = terms.filter(term => { const s = progress.words[term.id]; return s && s.correct >= 2 && s.correct / s.attempts >= .8; }).length;
  return <section className="career-collection"><div className="career-collection-heading"><h2>Tu vocabulario de {careers[profile.career].label}</h2><p>{learned} de {terms.length} palabras reforzadas. Seguiremos incorporando palabras y modelos a tu colección.</p></div><div className="vocabulary-grid">{terms.map(term => {
    const stat = progress.words[term.id]; return <article className="collection-word" key={term.id}><div className="collection-word-top"><span aria-hidden="true">{term.emoji}</span><button className="sound-button" aria-label={`Escuchar ${term.en}`} onClick={() => onSpeak(term.en)}><Volume2 size={18}/></button></div><h2>{term.en}</h2><p>{term.es}</p><span className="recognition-type">{term.sceneId ? 'Modelo 3D disponible' : 'Modelo 3D pendiente'}</span><small>{stat ? `${stat.correct}/${stat.attempts} aciertos` : 'Aún sin practicar'}</small><button className="text-button" onClick={() => onOpen(term.id)}>Ver palabra<ArrowRight size={15}/></button></article>;
  })}</div></section>;
}
