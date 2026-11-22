import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { EnglishTerm } from '../../shared/ui/EnglishTerm';
import { recordConsultation } from '../../shared/progreso';
import { estructuras } from '../../content/anatomy/catalogo';
import { anatomyParts, type AnatomyLayer } from './anatomy';
import heartCutaway from '../../../assets/anatomy/cardiovascular/heart-cutaway.glb?url';
import { arrangeBoneLabels, type BoneTarget } from './boneLabelPlacement';
import { regionalBoneTerms } from './regionalBoneTerms';
import './boneLabels.css';

export type { BoneTarget } from './boneLabelPlacement';

export const mainBoneIds = ['skull', 'humerus', 'ribs', 'pelvis', 'femur', 'tibia'];
export const mainAnatomyIds: Record<AnatomyLayer, readonly string[]> = {
  bones: mainBoneIds,
  muscles: ['pectoralis_major', 'biceps_brachii', 'rectus_abdominis', 'quadriceps_femoris', 'tibialis_anterior', 'gastrocnemius'],
  organs: ['brain', 'lungs', 'heart', 'liver', 'small_intestine', 'urinary_bladder'],
};
const groups: Record<AnatomyLayer, string> = { bones: 'huesos', muscles: 'musculos', organs: 'organos' };
const names = new Map([...anatomyParts, ...regionalBoneTerms].map(part => [part.id, part]));
const HeartViewer = lazy(() => import('../../shared/visor3d/Viewer3D'));

export function BoneLabels({ targets, selected, showAll = false, layer = 'bones', reservedTop, reservedBottom, preferredIds, provisionalIds = [], detailRequest }: {
  targets: readonly BoneTarget[]; selected?: string; showAll?: boolean; layer?: AnatomyLayer; reservedTop?: number; reservedBottom?: number;
  preferredIds?: readonly string[]; provisionalIds?: readonly string[]; detailRequest?: { id: string };
}) {
  const host = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const marker = useId();
  const [detail, setDetail] = useState('');
  const [provisional, setProvisional] = useState(false);
  const [heartOpen, setHeartOpen] = useState(false);
  const consumedRequest = useRef<typeof detailRequest>(undefined);
  const [size, setSize] = useState({ width: 375, height: 600 });
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(host.current!);
    return () => observer.disconnect();
  }, []);
  const opened = names.get(detail);
  const catalog = estructuras.find(item => item.id === detail);
  function openDetail(id: string, pending: boolean) {
    const part = names.get(id);
    if (!part || part.layer !== layer) return;
    setDetail(id);
    setHeartOpen(false);
    setProvisional(pending || Boolean(part.provisional));
    recordConsultation({ areaId: 'anatomy', groupId: groups[layer], itemId: id });
    if (!sheet.current?.open) sheet.current?.showModal();
  }
  useEffect(() => {
    if (!detailRequest || consumedRequest.current === detailRequest) return;
    consumedRequest.current = detailRequest;
    openDetail(detailRequest.id, provisionalIds.includes(detailRequest.id));
  }, [detailRequest]);
  const targetIds = new Set(targets.map(target => target.id));
  const choices = new Set([...(preferredIds?.length ? preferredIds : mainAnatomyIds[layer]), ...targets.map(target => target.id)]);
  const featured = showAll ? [...choices].filter(id => id !== selected && targetIds.has(id)
    && (selected || !id.startsWith('phalanx_'))).slice(0, selected ? 5 : 6) : [];
  const ids = selected ? [selected, ...featured] : featured;
  const cardHeight = layer === 'bones' ? 62 : 80;
  const positioned = arrangeBoneLabels(targets, ids, selected, { ...size, reservedTop, reservedBottom, cardHeight }).flatMap(label => {
    const bone = names.get(label.id);
    return bone ? [{ ...label, bone }] : [];
  });

  return <div className="bone-labels" ref={host}>
    <svg className="bone-label-lines" width={size.width} height={size.height} aria-hidden="true">
      <defs><marker id={marker} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#ffe9a2"/>
      </marker></defs>
      {positioned.map(label => (
        <line key={label.id} x1={label.edge} y1={label.edgeY} x2={label.x} y2={label.y}
          stroke="#ffe9a2" strokeWidth="2" markerEnd={`url(#${marker})`} data-bone-arrow={label.id}
          data-anatomy-arrow={label.id} data-bone-source={label.source} data-label-side={label.side} data-body-center={label.centerX ?? .5}/>
      ))}
    </svg>
    {positioned.map(label => (
      <div key={label.id} className="bone-label-card"
        style={{ top: label.top, width: label.cardWidth, height: cardHeight, left: label.columnX }}
        data-label-side={label.side} data-bone-label={label.id} data-anatomy-label={label.id}>
        <button type="button" className="bone-label-open" aria-label={`Ver ficha de ${label.bone.es}`}
          onClick={() => openDetail(label.id, provisionalIds.includes(label.id))}>{label.bone.es}</button>
        <EnglishTerm term={label.bone.en}/>
      </div>
    ))}
    <dialog ref={sheet} className="lumar-sheet bone-detail" aria-label={opened?.es ?? 'Ficha anatómica'} onClose={() => setHeartOpen(false)}
      onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      {opened && <div className="bone-detail-content">
        <header><h2>{opened.es}</h2><Button variant="text" aria-label="Cerrar ficha" onClick={() => sheet.current?.close()}><X size={18}/></Button></header>
        {provisional && <small>Provisional</small>}
        <EnglishTerm term={opened.en}/>
        <p><strong>Ubicación</strong> {provisional ? opened.location : catalog?.ubicacion ?? opened.location}</p>
        <p><strong>Función</strong> {provisional ? opened.description : catalog?.funcion ?? opened.description}</p>
        {catalog && <a className="button button--primary lumar-link" href={`#explorar/estructura/${catalog.id}`}
          onClick={() => sheet.current?.close()}>{detail === 'heart' ? 'Ver corazón en 3D' : 'Ver en Explorar 3D'}</a>}
        {detail === 'heart' && !catalog && !heartOpen && <Button variant="secondary" onClick={() => setHeartOpen(true)}>
          Ver corazón en 3D
        </Button>}
        {heartOpen && <Suspense fallback={<p role="status">Cargando corazón en 3D…</p>}>
          <HeartViewer src={heartCutaway} label="Corazón en corte 3D"/>
        </Suspense>}
      </div>}
    </dialog>
  </div>;
}
