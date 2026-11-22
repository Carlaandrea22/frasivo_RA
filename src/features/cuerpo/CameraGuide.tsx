import { useId, type CSSProperties, type RefObject } from 'react';
import { MoveHorizontal, ScanLine, Sun, X } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import silhouette from '../../../assets/anatomy/body/body-reference.webp?url';
import './cameraGuide.css';

const steps = [
  { icon: MoveHorizontal, title: 'Colócate a 2–3 metros' },
  { icon: ScanLine, title: 'Que se vea el cuerpo completo, de frente', detail: 'Acerca una mano o tu cara para ver solo esa parte.' },
  { icon: Sun, title: 'Busca buena luz' },
];

interface GuideProps {
  sheet: RefObject<HTMLDialogElement | null>;
  onUnderstand: () => void;
  onClose: () => void;
}

export function CameraGuide({ sheet, onUnderstand, onClose }: GuideProps) {
  const title = useId();
  return <dialog className="lumar-sheet camera-guide" ref={sheet} aria-labelledby={title} onClose={onClose}>
    <header>
      <h2 id={title}>Guía de cámara</h2>
      <Button variant="text" aria-label="Cerrar guía" onClick={() => sheet.current?.close()}>
        <X size={19} aria-hidden="true"/>
      </Button>
    </header>
    <ol>
      {steps.map(({ icon: Icon, title, detail }) => <li key={title}>
        <span className="camera-guide-icon"><Icon size={22} aria-hidden="true"/></span>
        <div><strong>{title}</strong>{detail && <p>{detail}</p>}</div>
      </li>)}
    </ol>
    <p className="camera-guide-privacy">La cámara se procesa en tu teléfono. No se guarda ni se envía nada.</p>
    <Button className="camera-guide-confirm" onClick={onUnderstand} autoFocus>Entendido</Button>
  </dialog>;
}

export function FramingGuide({ reservedBottom }: { reservedBottom: number }) {
  return <div className="camera-framing-guide" style={{ '--guide-reserved-bottom': `${reservedBottom}px` } as CSSProperties}>
    <img src={silhouette} alt=""/>
    <p>Encuadra a la persona dentro de la silueta</p>
  </div>;
}
