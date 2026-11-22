import { EnglishTerm } from '../../shared/ui/EnglishTerm';

export function Bilingual({ es, en, audio = true }: { es: string; en: string; audio?: boolean }) {
  return <span className="clinical-bilingual">
    <span lang="es">{es}</span>
    {audio ? <EnglishTerm key={en} term={en} variant="compact"/> : <small lang="en">{en}</small>}
  </span>;
}
