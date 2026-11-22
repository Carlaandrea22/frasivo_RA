import { useEffect, useMemo, useRef, useState } from 'react';
import { chooseRegions, confirmRegions } from './regionPolicy';

type Decision = ReturnType<typeof chooseRegions>;

export function useBodyRegions(active: boolean, ...input: Parameters<typeof chooseRegions>) {
  const [points, aspect, viewportAspect, hands, face, facing, , layer] = input;
  const previous = useRef(new Set<string>());
  const retained = useRef<ReadonlySet<string>>(new Set());
  const [confirmed, setConfirmed] = useState<ReadonlySet<string>>(new Set());
  const candidate = useMemo(() => active ? chooseRegions(points, aspect, viewportAspect, hands, face, facing, retained.current, layer) : null,
    [active, points, aspect, viewportAspect, hands, face, facing, layer]);
  useEffect(() => {
    const keys = new Set<string>();
    if (candidate) {
      candidate.groups.forEach(group => keys.add(group));
      for (const hand of candidate.hands) keys.add(`detail_hand_${hand.side}`);
      for (const foot of candidate.feet) keys.add(`detail_foot_${foot.side}`);
      if (candidate.face) keys.add('detail_face');
      if (candidate.neck) keys.add('neck');
      keys.add(`status:${candidate.status}`);
      if (candidate.fullBody) keys.add('full');
    }
    const next = confirmRegions(previous.current, keys, retained.current);
    previous.current = keys;
    if (next.size !== retained.current.size || [...next].some(key => !retained.current.has(key))) {
      retained.current = next;
      setConfirmed(next);
    }
  }, [candidate]);
  return useMemo(() => candidate && ({
    ...candidate,
    groups: new Set([...candidate.groups].filter(group => confirmed.has(group))),
    feet: candidate.feet.filter(foot => confirmed.has(`detail_foot_${foot.side}`)),
    hands: candidate.hands.filter(hand => confirmed.has(`detail_hand_${hand.side}`)),
    face: confirmed.has('detail_face') ? candidate.face : null,
    neck: confirmed.has('neck') ? candidate.neck : null,
    legsMissingAnkle: candidate.legsMissingAnkle.filter(side => confirmed.has(`thigh_${side}`)),
    fullBody: candidate.fullBody && confirmed.has('full'),
    status: confirmed.has(`status:${candidate.status}`) ? candidate.status : 'Buscando…',
  } satisfies Decision), [candidate, confirmed]);
}
