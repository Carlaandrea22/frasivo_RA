import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { EnglishTerm } from '../../shared/ui/EnglishTerm';
import { recordConsultation } from '../../shared/progreso';
import { estructuras } from '../../content/anatomy/catalogo';
import { anatomyParts } from './anatomy';
import { arrangeBoneLabels, type BoneTarget } from './boneLabelPlacement';
import './boneLabels.css';

export type { BoneTarget } from './boneLabelPlacement';

export const mainBoneIds = ['skull', 'humerus', 'ribs', 'pelvis', 'femur', 'tibia'];
const names = new Map(anatomyParts.filter(part => part.layer === 'bones').map(part => [part.id, part]));
const details: Record<string, readonly [string, string]> = {
  skull: ['En la cabeza, alrededor del encéfalo.', 'Protege el encéfalo y sostiene las estructuras de la cara.'],
  mandible: ['En la parte inferior de la cara.', 'Sostiene los dientes inferiores y se mueve al masticar.'],
  clavicle: ['Entre el esternón y la escápula.', 'Conecta el hombro con el tronco.'],
  sternum: ['En el centro de la parte anterior del tórax.', 'Sostiene las uniones anteriores de varias costillas.'],
  ribs: ['Rodean la cavidad torácica.', 'Protegen órganos del tórax y se mueven durante la respiración.'],
  spine: ['Desde la base del cráneo hasta la pelvis.', 'Sostiene el tronco y protege la médula espinal.'],
  pelvis: ['En la base del tronco, entre las caderas.', 'Transmite el peso hacia los miembros inferiores.'],
  humerus: ['Entre el hombro y el codo.', 'Forma parte de ambas articulaciones y transmite fuerzas en el brazo.'],
  radius: ['En el antebrazo, del lado del pulgar.', 'Participa en la rotación del antebrazo y en el apoyo de la muñeca.'],
  ulna: ['En el antebrazo, del lado del meñique.', 'Contribuye a la estabilidad del codo.'],
  femur: ['En el muslo, entre la cadera y la rodilla.', 'Sostiene el peso y transmite fuerzas entre la cadera y la rodilla.'],
  patella: ['En la parte anterior de la rodilla.', 'Protege la parte anterior de la articulación y mejora la palanca del cuádriceps.'],
  tibia: ['En la pierna, entre la rodilla y el tobillo.', 'Es el principal hueso de carga de la pierna.'],
  fibula: ['En el lado externo de la pierna.', 'Da estabilidad al tobillo y permite inserciones musculares.'],
  carpals: ['En la muñeca.', 'Unen la mano al antebrazo y contribuyen a su movilidad.'],
  metacarpals: ['Entre la muñeca y los dedos de la mano.', 'Forman el armazón de la palma.'],
  hand_phalanges: ['En los dedos de la mano.', 'Permiten la prensión y los movimientos finos.'],
  tarsals: ['En el talón y la parte posterior y media del pie.', 'Transmiten cargas entre el tobillo y el resto del pie.'],
  metatarsals: ['Entre el tarso y los dedos del pie.', 'Sostienen el antepié durante el apoyo y la marcha.'],
  foot_phalanges: ['En los dedos del pie.', 'Ayudan al equilibrio y al impulso al caminar.'],
};

export function BoneLabels({ targets, selected, showAll = false, reservedBottom }: {
  targets: readonly BoneTarget[]; selected?: string; showAll?: boolean; reservedBottom?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const marker = useId();
  const [detail, setDetail] = useState('');
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
  const featured = (showAll ? mainBoneIds.filter(id => id !== selected).slice(0, selected ? 5 : 6) : []);
  const ids = selected ? [selected, ...featured] : featured;
  const positioned = arrangeBoneLabels(targets, ids, selected, { ...size, reservedBottom }).flatMap(label => {
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
          data-bone-source={label.source} data-label-side={label.side} data-body-center={label.centerX ?? .5}/>
      ))}
    </svg>
    {positioned.map(label => (
      <div key={label.id} className="bone-label-card" style={{ top: label.top, width: label.cardWidth, left: label.columnX }} data-label-side={label.side} data-bone-label={label.id}>
        <button type="button" className="bone-label-open" aria-label={`Ver ficha de ${label.bone.es}`} onClick={() => {
          setDetail(label.id);
          recordConsultation({ areaId: 'anatomy', groupId: 'huesos', itemId: label.id });
          sheet.current?.showModal();
        }}>{label.bone.es}</button>
        <EnglishTerm term={label.bone.en}/>
      </div>
    ))}
    <dialog ref={sheet} className="lumar-sheet bone-detail" aria-label={opened?.es ?? 'Ficha del hueso'}
      onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      {opened && <div className="bone-detail-content">
        <header><h2>{opened.es}</h2><Button variant="text" aria-label="Cerrar ficha" onClick={() => sheet.current?.close()}><X size={18}/></Button></header>
        <EnglishTerm term={opened.en}/>
        <p><strong>Ubicación</strong> {catalog?.ubicacion ?? details[detail]?.[0]}</p>
        <p><strong>Función</strong> {catalog?.funcion ?? details[detail]?.[1]}</p>
        {catalog && <a className="button button--primary lumar-link" href={`#explorar/estructura/${catalog.id}`}
          onClick={() => sheet.current?.close()}>Ver en Explorar 3D</a>}
      </div>}
    </dialog>
  </div>;
}
