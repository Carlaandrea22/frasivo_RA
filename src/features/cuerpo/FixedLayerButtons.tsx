import { Bone, Dumbbell, HeartPulse } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import type { AnatomyLayer } from './anatomy';

const layers = [
  { id: 'bones', name: 'Huesos', Icon: Bone },
  { id: 'muscles', name: 'Músculos', Icon: Dumbbell },
  { id: 'organs', name: 'Órganos', Icon: HeartPulse },
] as const;

export function FixedLayerButtons({ layer, available, onChange }: {
  layer: AnatomyLayer;
  available: readonly AnatomyLayer[];
  onChange: (layer: AnatomyLayer) => void;
}) {
  return <div role="group" className="anatomy-layers" aria-label="Capa anatómica">
    {layers.map(({ id, name, Icon }) => (
      <Button key={id} variant="secondary" aria-pressed={layer === id}
        disabled={!available.includes(id)} onClick={() => onChange(id)}>
        <Icon size={15} aria-hidden="true"/> {name}
      </Button>
    ))}
  </div>;
}
