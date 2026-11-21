import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { AnatomyLayer, BodyPoint } from './anatomy';
import { atlasParts, atlasMatrices, referenceFrame, type Technique } from './atlasAlignment';
import reference from '../../assets/anatomy/body/body-reference.webp?url';

const Anatomy3D = lazy(() => import('./Anatomy3D'));
const sprites = import.meta.glob<string>('../../assets/anatomy/body/sprites/*.webp', {
  query: '?url', import: 'default', eager: true,
});

interface Props {
  points: BodyPoint[] | null;
  layer: AnatomyLayer;
  aspect: number;
  opacity: number;
  selected: string;
  focusSelection: boolean;
  technique: Technique;
  onSelect: (id: string) => void;
  onFrame?: () => void;
}

export function AnatomyOverlay({ points, layer, aspect, opacity, selected, focusSelection, technique, onSelect, onFrame }: Props) {
  const matrices = useMemo(() => atlasMatrices(points, aspect), [points, aspect]);
  const frame = useRef(onFrame);
  const [failed, setFailed] = useState(false);
  frame.current = onFrame;
  const useSprites = layer === 'bones' && (technique === 'a' || failed);
  const [x, y, width, height] = referenceFrame;
  const guide = points === null && matrices.trunk && (
    <svg className="anatomy-reference" viewBox={`0 0 ${aspect} 1`} aria-hidden="true">
      <image href={reference} x={x} y={y} width={width} height={height} transform={`matrix(${matrices.trunk.join(' ')})`}/>
    </svg>
  );

  useEffect(() => {
    if (useSprites && points?.length) frame.current?.();
  }, [points, useSprites]);

  if (useSprites) {
    return <>{guide}
      <svg className="anatomy-overlay anatomy-sprites layer-bones" viewBox={`0 0 ${aspect} 1`} aria-hidden="true" style={{ opacity }}>
        {atlasParts.filter(part => part.layer === 'bones').map(part => {
          const transform = matrices[part.group];
          if (!transform || !part.sprite) return null;
          const [x, y, width, height] = part.sprite;
          return (
            <image
              key={part.id}
              data-part={part.id}
              className={part.term === selected ? 'selected' : undefined}
              transform={`matrix(${transform.join(' ')})`}
              href={sprites[`../../assets/anatomy/body/sprites/${part.id}.webp`]}
              x={x} y={y} width={width} height={height}
              onClick={() => onSelect(part.term)}
            />
          );
        })}
      </svg>
    </>;
  }

  if (failed) return <>{guide}<p className="anatomy-render-message" role="alert">El atlas 3D necesita WebGL. Puedes consultar el vocabulario de la capa.</p></>;
  return (
    <>{guide}
      <Suspense fallback={<p className="anatomy-render-message">Cargando atlas…</p>}>
        <Anatomy3D
          layer={layer} matrices={matrices} aspect={aspect} opacity={opacity} selected={selected} focusSelection={focusSelection}
          onSelect={onSelect} onFrame={onFrame} onError={() => setFailed(true)}
        />
      </Suspense>
    </>
  );
}
