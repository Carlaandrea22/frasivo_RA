import { lazy, Suspense, useMemo, useState } from 'react';
import { Box } from 'lucide-react';
import { modelos } from '../../content/anatomy/modelos';
import { resolveCaseAnatomy, type CaseAnatomyRegion } from '../../content/casos/caseAnatomy';
import { Button } from '../../shared/ui/Button';
import type { Viewer3DProjectedAnchor } from '../../shared/visor3d/Viewer3D';
import { Bilingual } from './Bilingual';

const Viewer3D = lazy(() => import('../../shared/visor3d/Viewer3D'));

function ClinicalRegionModel({ anatomy }: { anatomy: NonNullable<ReturnType<typeof resolveCaseAnatomy>> }) {
  const [points, setPoints] = useState<readonly Viewer3DProjectedAnchor[]>([]);
  const anchors = useMemo(() => [anatomy.anchor], [anatomy.anchor]);
  const point = points[0];
  const preview = <img src={anatomy.image} alt={anatomy.name} className="clinical-anatomy-image"/>;

  return <Suspense fallback={<div className="clinical-anatomy-loading">{preview}<p role="status">Cargando visor 3D…</p></div>}>
    <Viewer3D src={modelos[anatomy.model.assetId]} nodeId={anatomy.model.nodeId}
      label={`Modelo 3D · ${anatomy.name}`} fallback={preview} selectedNodeId={anatomy.selectedNodeId}
      anchors={anchors} onProject={setPoints}>
      {point?.visible && <span className="clinical-anatomy-pin" aria-hidden="true" style={{ left: point.x, top: point.y }}/>}
    </Viewer3D>
  </Suspense>;
}

export function ClinicalAnatomy({ structures }: { structures: readonly CaseAnatomyRegion[] }) {
  const [selected, setSelected] = useState(structures[0]?.structureId);
  const regions = structures.flatMap(region => {
    const anatomy = resolveCaseAnatomy(region);
    return anatomy ? [{ region, anatomy }] : [];
  });
  const active = regions.find(({ region }) => region.structureId === selected) ?? regions[0];
  if (!active) return null;
  const { region, anatomy } = active;

  return <section className="clinical-anatomy" aria-labelledby="clinical-anatomy-title">
    <header>
      <Box size={21} aria-hidden="true"/>
      <div><h3 id="clinical-anatomy-title">Anatomía del caso</h3><p>Gira el modelo para ver la zona de referencia.</p></div>
    </header>
    {regions.length > 1 ? <div className="clinical-anatomy-options" role="group" aria-label="Estructura anatómica">
      {regions.map(({ region: option, anatomy: model }) => <Button variant="secondary" key={option.structureId}
        aria-pressed={option.structureId === region.structureId} onClick={() => setSelected(option.structureId)}>
        {model.name}
      </Button>)}
    </div> : <strong>{anatomy.name}</strong>}
    <ClinicalRegionModel key={region.structureId} anatomy={anatomy}/>
    <div className="clinical-anatomy-note">
      <strong><Bilingual es={anatomy.partEs} en={anatomy.partEn}/></strong>
      <p><Bilingual es={region.contextEs} en={region.contextEn}/></p>
    </div>
  </section>;
}
