import { lazy, Suspense, useState } from 'react';
import { Box } from 'lucide-react';
import { modelos } from '../../content/anatomy/modelos';
import { caseAnatomy, type CaseAnatomyId } from '../../content/casos/caseAnatomy';
import { Button } from '../../shared/ui/Button';

const Viewer3D = lazy(() => import('../../shared/visor3d/Viewer3D'));

export function ClinicalAnatomy({ structures }: { structures: readonly [CaseAnatomyId, ...CaseAnatomyId[]] }) {
  const [selected, setSelected] = useState(structures[0]);
  const anatomy = caseAnatomy[selected];
  const label = `Modelo 3D · ${anatomy.nombre}`;
  const preview = <img src={anatomy.imagen} alt={anatomy.nombre} className="clinical-anatomy-image"/>;

  return <section className="clinical-anatomy" aria-labelledby="clinical-anatomy-title">
    <header>
      <Box size={21} aria-hidden="true"/>
      <div><h3 id="clinical-anatomy-title">Anatomía del caso</h3><p>Explora la zona relacionada con los hallazgos.</p></div>
    </header>
    {structures.length > 1 ? <div className="clinical-anatomy-options" role="group" aria-label="Estructura anatómica">
      {structures.map(id => <Button variant="secondary" key={id} aria-pressed={id === selected} onClick={() => setSelected(id)}>
        {caseAnatomy[id].nombre}
      </Button>)}
    </div> : <strong>{anatomy.nombre}</strong>}
    <Suspense fallback={<div className="clinical-anatomy-loading">{preview}<p role="status">Cargando visor 3D…</p></div>}>
      <Viewer3D src={modelos[anatomy.assetId]} nodeId={anatomy.nodeId} label={label} fallback={preview}/>
    </Suspense>
  </section>;
}
