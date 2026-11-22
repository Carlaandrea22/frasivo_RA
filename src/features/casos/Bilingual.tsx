export function Bilingual({ es, en }: { es: string; en: string }) {
  return <span className="clinical-bilingual">
    <span lang="es">{es}</span>
    <small lang="en">{en}</small>
  </span>;
}
