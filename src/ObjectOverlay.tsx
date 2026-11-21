import { useLayoutEffect, useRef, useState } from 'react';
import type { TrackedRecognition } from './objectTracking';
import { layoutLabels } from './overlayLayout';

interface Props { detections: TrackedRecognition[]; selectedTrackId: string | null; onSelect: (detection: TrackedRecognition) => void }
export function ObjectOverlay({ detections, selectedTrackId, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      setSize(old => old.width === width && old.height === height ? old : { width, height });
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure); observer.observe(element);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  const placements = layoutLabels(detections, size, selectedTrackId);
  const byId = new Map(detections.map(d => [d.trackId, d]));
  const selected = selectedTrackId ? byId.get(selectedTrackId) : undefined;
  return <div ref={container} className="ar-overlay" aria-label="Objetos reconocidos en la cámara">
    {size.width > 0 && size.height > 0 ? <svg className="ar-connectors" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">{placements.map(p => <g key={p.trackId} className={p.trackId === selectedTrackId ? 'is-selected' : ''}><line x1={p.x + p.width / 2} y1={p.y + p.height / 2} x2={p.anchorX} y2={p.anchorY}/><circle cx={p.anchorX} cy={p.anchorY} r="3"/></g>)}</svg> : null}
    {selected ? <div className={`ar-selected-object ${selected.observed ? '' : 'reacquiring'}`} data-selected-track={selected.trackId} aria-hidden="true" style={{ left: `${selected.box.x * 100}%`, top: `${selected.box.y * 100}%`, width: `${selected.box.width * 100}%`, height: `${selected.box.height * 100}%` }}/> : null}
    {placements.map(p => {
      const detection = byId.get(p.trackId)!;
      const isSelected = detection.trackId === selectedTrackId;
      return <button key={detection.trackId} type="button" className={`ar-tag ${isSelected ? 'selected' : ''} ${detection.observed ? '' : 'reacquiring'}`} data-track-id={detection.trackId} data-word-id={detection.word.id} aria-pressed={isSelected} aria-controls="educational-panel" aria-label={`${detection.word.en}, ${detection.word.es}. Ver vocabulario`} title={`${detection.word.en} — ${detection.word.es}`} style={{ left: p.x, top: p.y, width: p.width, height: p.height }} onClick={() => onSelect(detection)}>
        <span className="ar-tag-heading"><strong>{detection.word.en}</strong><span className="ar-score">{Math.round(detection.score * 100)}%</span></span>
        <span className="ar-translation">{detection.word.es}</span>
      </button>;
    })}
  </div>;
}
