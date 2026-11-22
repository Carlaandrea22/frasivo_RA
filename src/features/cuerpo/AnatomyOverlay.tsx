import { useLayoutEffect, useRef, useState } from 'react';
import type { AnatomyLayer, Matrix } from './anatomy';
import { atlasParts, atlasSprite, referenceFrame, type atlasPlacement, type AtlasPart } from './atlasAlignment';
import { BoneLabels, type BoneTarget } from './BoneLabels';
import { OneEuro } from './oneEuro';
import { applyBoneTransform, boneSpritePoints } from './boneLabelPlacement';
import reference from '../../../assets/anatomy/body/body-reference.webp?url';

const sprites = import.meta.glob<string>('../../../assets/anatomy/body/sprites/*.webp', {
  query: '?url', import: 'default', eager: true,
});
const organOrder = ['kidneys', 'lungs', 'small_intestine', 'large_intestine', 'stomach', 'liver', 'heart', 'brain'];
const muscleOrder = ['triceps_brachii', 'biceps_brachii', 'deltoid'];
const layers = {
  bones: atlasParts.filter(part => part.layer === 'bones'),
  muscles: atlasParts.filter(part => part.layer === 'muscles')
    .sort((a, b) => muscleOrder.indexOf(a.term) - muscleOrder.indexOf(b.term)),
  organs: atlasParts.filter(part => part.layer === 'organs')
    .sort((a, b) => organOrder.indexOf(a.term) - organOrder.indexOf(b.term)),
};

type Group = AtlasPart['group'];
type Placement = ReturnType<typeof atlasPlacement>;

interface Props {
  placement: Placement;
  live: boolean;
  layer: AnatomyLayer;
  aspect: number;
  opacity: number;
  selected?: string;
  onSelect: (id: string) => void;
  onFrame?: (time: number) => void;
  showLabels?: boolean;
  showSelection?: boolean;
  reservedBottom?: number;
}

function mirrored([a, b, c, d]: Matrix) {
  return a*d < b*c;
}

export function AnatomyOverlay({ placement, live, layer, aspect, opacity, selected, onSelect, onFrame, showLabels, showSelection, reservedBottom }: Props) {
  const { matrices, visible, frontFeet } = placement;
  const groups = useRef(new Map<Group, SVGGElement>());
  const current = useRef(new Map<Group, Matrix>());
  const filters = useRef(new Map<Group, OneEuro[]>());
  const svg = useRef<SVGSVGElement>(null);
  const candidates = useRef<(BoneTarget & { key: string })[]>([]);
  const [projected, setProjected] = useState<BoneTarget[]>([]);
  const [preferred, setPreferred] = useState('');
  const parts = layers[layer].filter(part => visible.includes(part));
  const visibleGroups = new Set(parts.map(part => part.group));
  const focusedOrgan = layer === 'organs' ? selected : undefined;
  const focusedMuscle = layer === 'muscles' ? selected : undefined;
  const [x, y, width, height] = referenceFrame;
  const viewBox = `0 0 ${aspect} 1`;

  useLayoutEffect(() => {
    let request: number;
    let last = performance.now();
    const targets = new Map<Group, Matrix>();
    for (const [group, node] of groups.current) {
      const target = matrices[group];
      if (!target) continue;
      const previous = current.current.get(group);
      const initial = live && previous && mirrored(previous) === mirrored(target) ? previous : target;
      if (initial === target || !filters.current.has(group)) {
        filters.current.set(group, initial.map(value => new OneEuro(value, last)));
      }
      targets.set(group, target);
      current.current.set(group, initial);
      node.setAttribute('transform', `matrix(${initial.join(' ')})`);
    }
    for (const group of current.current.keys()) {
      if (!targets.has(group)) {
        current.current.delete(group);
        filters.current.delete(group);
      }
    }

    const publish = () => {
      const element = svg.current;
      if (layer !== 'bones' || !element) return;
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      const scale = (live ? Math.max : Math.min)(width/aspect, height);
      const left = (width-aspect*scale)/2, top = (height-scale)/2;
      const trunk = current.current.get('trunk') ?? current.current.get('pelvis') ?? current.current.get('head');
      const centerX = trunk ? (left+scale*applyBoneTransform(trunk, [0, -1.2])[0])/width : .5;
      candidates.current = parts.flatMap(part => {
        const matrix = current.current.get(part.group);
        if (!matrix) return [];
        const spriteId = part.demoSprite && (!live || frontFeet.has(part.group)) ? `${part.id}_front` : part.id;
        return boneSpritePoints(spriteId, atlasSprite(part, live, frontFeet)).map(anchor => {
          const [x, y] = applyBoneTransform(matrix, anchor);
          return { id: part.term, key: part.id, source: part.id, centerX,
            x: (left+scale*x)/width, y: (top+scale*y)/height };
        });
      });
      if (showLabels || showSelection) {
        setProjected(preferred
          ? [...candidates.current.filter(item => item.key === preferred), ...candidates.current.filter(item => item.key !== preferred)]
          : candidates.current);
      }
    };
    publish();
    const resize = new ResizeObserver(publish);
    if (layer === 'bones' && svg.current) resize.observe(svg.current);

    const draw = (now: number) => {
      const mix = 1 - Math.exp(-Math.max(0, now - last) / 27);
      last = now;
      let animated = false;
      for (const [group, target] of targets) {
        const from = current.current.get(group)!;
        if (from === target) continue;
        const next = (layer === 'bones'
          ? filters.current.get(group)!.map((filter, i) => filter.filter(target[i], now))
          : from.map((value, i) => value + (target[i] - value) * mix)) as Matrix;
        const settled = next.every((value, i) => Math.abs(value - target[i]) < .00015);
        const result = settled ? target : next;
        current.current.set(group, result);
        groups.current.get(group)?.setAttribute('transform', `matrix(${result.join(' ')})`);
        animated = true;
      }
      if (animated) { onFrame?.(now); publish(); }
      if (animated) request = requestAnimationFrame(draw);
    };

    if (live && targets.size > 0) request = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(request); resize.disconnect(); };
  }, [matrices, layer, live, onFrame, preferred, showLabels, showSelection, aspect]);

  return <>
    {!live && matrices.trunk && (
      <svg className="anatomy-reference" viewBox={viewBox} aria-hidden="true">
        <image href={reference} x={x} y={y} width={width} height={height} transform={`matrix(${matrices.trunk.join(' ')})`}/>
      </svg>
    )}
    <svg ref={svg} className={`anatomy-overlay anatomy-sprites layer-${layer}`} viewBox={viewBox}
      preserveAspectRatio={live ? 'xMidYMid slice' : 'xMidYMid meet'} aria-hidden="true"
      onClick={layer === 'bones' ? event => {
        const direct = (event.target as Element).getAttribute('data-part');
        const box = event.currentTarget.getBoundingClientRect();
        const distance = (item: BoneTarget) =>
          Math.hypot(box.left+item.x*box.width-event.clientX, box.top+item.y*box.height-event.clientY);
        const near = direct ? candidates.current.find(item => item.key === direct)
          : candidates.current.reduce<(typeof candidates.current)[number] | undefined>((best, item) =>
            distance(item) <= 22 && (!best || distance(item) < distance(best)) ? item : best, undefined);
        if (near) { setPreferred(near.key); onSelect(near.id); }
      } : undefined}
      data-rendered={layer} data-visible-parts={parts.length} data-focused-organ={focusedOrgan} style={{ opacity }}>
      {Array.from(visibleGroups, group => (
        <g key={group} ref={node => {
          if (node) groups.current.set(group, node);
          else groups.current.delete(group);
        }}>
          {parts.filter(part => part.group === group).map(part => {
            const [x, y, width, height] = atlasSprite(part, live, frontFeet);
            const spriteId = part.demoSprite && (!live || frontFeet.has(part.group)) ? `${part.id}_front` : part.id;
            const recedes = (focusedOrgan && focusedOrgan !== part.term)
              || (focusedMuscle && focusedMuscle !== part.term && parts.some(p => p.group === group && p.term === focusedMuscle));
            return <image
              key={part.id}
              data-part={part.id}
              className={part.term === selected ? 'selected' : undefined}
              href={sprites[`../../../assets/anatomy/body/sprites/${spriteId}.webp`]}
              x={x} y={y} width={width} height={height}
              opacity={recedes ? .19 : 1}
              onClick={layer === 'bones' ? undefined : () => onSelect(part.term)}
            />;
          })}
        </g>
      ))}
    </svg>
    {layer === 'bones' && (showSelection || showLabels) &&
      <BoneLabels targets={projected} selected={showSelection ? selected : undefined} showAll={showLabels} reservedBottom={reservedBottom}/>}
  </>;
}
