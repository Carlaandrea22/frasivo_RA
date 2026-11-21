import { retos } from '../../content/ejercicios/retos';
import type { RouteProps } from '../../shared/navegacion';
import { PracticeTabs } from '../../shared/navegacion/PracticarHome';
import { Card } from '../../shared/ui/Card';
import { ContentState } from '../../shared/ui/ContentState';

export function Retos({ params }: RouteProps) {
  const reto = params.id ? retos.find(item => item.id === params.id) : undefined;
  return <section className="lumar-page">
    <header>
      <h1>{reto?.titulo ?? 'Retos de anatomía'}</h1>
      <p className="lumar-subtitle">En construcción</p>
    </header>
    <PracticeTabs active="retos"/>
    {reto ? <Card>
      <p className="lumar-card-meta">Muestra provisional · Relaciona estructura y función</p>
      <h2>{reto.preguntas[0].enunciado}</h2>
      <ul>{reto.preguntas[0].respuestas.map(option => <li key={option.id}>{option.texto}</li>)}</ul>
      <a className="button button--secondary lumar-link" href={`#explorar/estructura/${reto.preguntas[0].estructuraId}`}>Revisar el fémur</a>
    </Card> : params.id ? (
      <ContentState state="unavailable" title="Reto no disponible"/>
    ) : retos.map(item => <Card key={item.id}>
      <p className="lumar-card-meta">Muestra provisional</p>
      <h2>{item.titulo}</h2>
      <p>Relaciona una estructura anatómica con su función.</p>
      <a className="button button--primary lumar-link" href={`#practicar/retos/${item.id}`}>Ver reto de muestra</a>
    </Card>)}
  </section>;
}
