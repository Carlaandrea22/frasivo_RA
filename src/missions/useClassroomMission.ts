import { useCallback, useRef, useState } from 'react';
import { createClassroomMission, transitionMission, type MissionEvent } from './classroom';

export function useClassroomMission() {
  const [state, setState] = useState(createClassroomMission);
  const current = useRef(state);
  const dispatch = useCallback((event: MissionEvent) => {
    const previous = current.current;
    const change = transitionMission(previous, event);
    const changed = change.state !== previous;
    if (changed) { current.current = change.state; setState(change.state); }
    return { ...change, changed };
  }, []);
  return { state, dispatch };
}
