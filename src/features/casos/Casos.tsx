import { UserRound } from 'lucide-react';
import { casos } from '../../content/casos/rodilla';
import { estructuras } from '../../content/anatomy/catalogo';
import type { RouteProps } from '../../shared/navegacion';
import { PracticeTabs } from '../../shared/navegacion/PracticarHome';
import { Card } from '../../shared/ui/Card';
import { ContentState } from '../../shared/ui/ContentState';

export function Casos({ params }: RouteProps) {
  const caso = params.id ? casos.find(item => item.id === params.id) : undefined;
  return <section className="lumar-page">
    <header>
      <h1>{caso?.titulo ?? 'Casos clínicos'}</h1>
      <p className="lumar-subtitle">En construcción</p>
    </header>
    <PracticeTabs active="casos"/>
    {caso ? <>
      <Card>
        <p className="lumar-card-meta">Paciente virtual · Recurso visual provisional</p>
        <div className="lumar-actions"><UserRound size={24} aria-hidden="true"/><h2>{caso.paciente.nombre}</h2></div>
        <p>«{caso.motivoConsulta}»</p>
      </Card>
      <Card>
        <h2>Inicio de la entrevista</h2>
        <ul>{caso.primerTurno.map(question => <li key={question.id}>{question.pregunta}</li>)}</ul>
        <div className="lumar-actions">
          {estructuras.filter(item => caso.estructurasRelacionadas.includes(item.id)).map(item =>
            <a key={item.id} className="button button--secondary lumar-link" href={`#explorar/estructura/${item.id}`}>Consultar el {item.nombreEs.toLocaleLowerCase('es')}</a>,
          )}
        </div>
      </Card>
    </> : params.id ? (
      <ContentState state="unavailable" title="Caso no disponible"/>
    ) : casos.map(item => <Card key={item.id}>
      <p className="lumar-card-meta">Muestra provisional</p>
      <h2>{item.titulo}</h2>
      <p>{item.descripcion}</p>
      <a className="button button--primary lumar-link" href={`#practicar/casos/${item.id}`}>Ver caso de muestra</a>
    </Card>)}
  </section>;
}
