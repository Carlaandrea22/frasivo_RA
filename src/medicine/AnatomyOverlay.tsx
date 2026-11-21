import { type ReactNode } from 'react';
import { segmentTransform, torsoTransform, type AnatomyLayer, type BodyPoint, type Matrix } from './anatomy';

export function AnatomyOverlay({ points, layer, opacity, selected }: { points: BodyPoint[]; layer: AnatomyLayer; opacity: number; selected: string }) {
  const trunk = torsoTransform(points);
  const shapes: ReactNode[] = [];
  const part = (id: string, transform: Matrix | null, children: ReactNode, key = id) => {
    if (!transform) return;
    shapes.push(<g key={key} transform={`matrix(${transform.join(' ')})`} data-part={id} className={`anatomy-part${id === selected ? ' selected' : ''}`}>{children}</g>);
  };
  if (layer === 'organs') {
    part('lungs', trunk, <g fill="#e995a9"><path d="M43 7 Q23 4 17 27 Q9 53 17 58 Q34 64 44 49Z"/><path d="M57 7 Q77 4 83 27 Q91 53 83 58 Q66 64 56 49Z"/><path d="M50 -3V20 M50 16L34 29 M50 16L66 29" fill="none" stroke="#f8d6d8" strokeWidth="4"/></g>);
    part('heart', trunk, <g fill="#c64250"><path d="M51 29 C43 19 35 30 42 41 Q50 52 59 55 Q74 32 64 27 Q57 23 51 29Z"/><path d="M54 30V20Q63 14 67 23 M48 30L43 20" fill="none" stroke="#e57880" strokeWidth="5"/></g>);
    part('liver', trunk, <path fill="#a66c54" d="M14 61 Q24 53 49 59 L65 64 Q49 75 34 79 Q15 78 14 61Z"/>);
    part('stomach', trunk, <path fill="#efb585" d="M66 58 C62 69 67 71 75 69 C92 74 83 89 71 88 C55 88 52 80 54 76 Q62 74 61 60Z"/>);
    part('intestines', trunk, <g><path d="M25 86 Q17 82 17 93V115 Q18 122 28 118H75Q84 118 83 108V90Q84 82 75 84Z" fill="#ca8878"/><path d="M30 92H67Q77 96 66 100H32Q22 104 34 108H68Q76 112 65 114H34" stroke="#f4bb9e" strokeWidth="5" fill="none"/></g>);
  }
  if (layer === 'muscles') {
    part('pectorals', trunk, <g fill="#bd6661"><path d="M4 0 Q23 -8 47 6 L46 33 Q26 43 5 25Z"/><path d="M96 0 Q77 -8 53 6 L54 33 Q74 43 95 25Z"/><path d="M10 8L42 22 M14 20L43 28 M90 8L58 22 M86 20L57 28" fill="none" stroke="#e8a59b" strokeWidth="1.2"/></g>);
    part('abdominals', trunk, <g fill="#c87769">{[40,57,74,91].flatMap((y, i) => [<rect key={`l${i}`} x="32" y={y} width="16" height="14" rx="4"/>, <rect key={`r${i}`} x="52" y={y} width="16" height="14" rx="4"/>])}</g>);
    for (const [side, shoulder, elbow, hip, knee] of [['l',11,13,23,25],['r',12,14,24,26]] as const) {
      part('biceps', segmentTransform(points, shoulder, elbow), <g fill="#c9756c"><path d="M0 4 C-20 18 -19 75 0 95 C19 75 20 18 0 4Z"/><path d="M0 16V80 M-6 25V68 M6 25V68" stroke="#edaa9d" strokeWidth="1"/></g>, `biceps-${side}`);
      part('quadriceps', segmentTransform(points, hip, knee), <g fill="#c9756c"><path d="M0 3 C-22 15 -26 62 -6 95 L6 95 C26 62 22 15 0 3Z"/><path d="M0 12V85 M-10 22L-5 79 M10 22L5 79" stroke="#edaa9d" strokeWidth="1"/></g>, `quad-${side}`);
    }
  }
  if (layer === 'bones') {
    part('spine', trunk, <g fill="#e3d5b6">{Array.from({length:12},(_,i)=><rect key={i} x="46" y={i*8-4} width="8" height="6" rx="2"/>)}</g>);
    part('ribs', trunk, <g fill="none" stroke="#f2e7cf" strokeWidth="3.3"><path d="M50 2V50 M7 0Q25 -6 47 2 M93 0Q75 -6 53 2"/>{[10,18,26,34,42,50].map((y,i)=><path key={i} d={`M47 ${y} Q${4+i*2} ${y-12} ${12+i*3} ${y+6} Q27 ${y+18} 47 ${y+8} M53 ${y} Q${96-i*2} ${y-12} ${88-i*3} ${y+6} Q73 ${y+18} 53 ${y+8}`}/>)}</g>);
    part('pelvis', trunk, <g fill="#e5d7b9"><path d="M15 91 Q30 83 46 97L50 118L39 124Q24 113 18 116Z"/><path d="M85 91 Q70 83 54 97L50 118L61 124Q76 113 82 116Z"/></g>);
    const head = segmentTransform(points, 8, 7);
    // The ear-to-ear frame's local vertical axis runs across the face.
    part('skull', head, <g transform="translate(0 50) rotate(90)"><path fill="#ede2c9" d="M-48 0 Q-50 -56 0 -58 Q50 -56 48 0L32 39Q0 53 -32 39Z"/><g fill="#6e7b70"><ellipse cx="-19" cy="-6" rx="12" ry="13"/><ellipse cx="19" cy="-6" rx="12" ry="13"/><path d="M0 3L-7 19H7Z"/></g><path d="M-20 30H20 M-10 25V37 M0 25V39 M10 25V37" fill="none" stroke="#aa9f86" strokeWidth="2"/></g>);
    for (const [side, shoulder, elbow, hip, knee, ankle] of [['l',11,13,23,25,27],['r',12,14,24,26,28]] as const) {
      const bone = <g fill="#f0e4ca"><path d="M-7 4 Q-15 -3 -9 -7 Q0 -12 9 -7 Q15 -3 7 4 L5 88 Q15 93 8 99Q0 104 -8 99Q-15 93 -5 88Z"/><path d="M0 10V81" stroke="#cbbb9c" strokeWidth="1.5"/></g>;
      part('humerus', segmentTransform(points, shoulder, elbow), bone, `humerus-${side}`);
      part('femur', segmentTransform(points, hip, knee), bone, `femur-${side}`);
      part('tibia', segmentTransform(points, knee, ankle), bone, `tibia-${side}`);
    }
  }
  return <svg className={`anatomy-overlay layer-${layer}`} viewBox="0 0 1000 1000" preserveAspectRatio="none" opacity={opacity} aria-hidden="true">{shapes}</svg>;
}
