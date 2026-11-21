import { vocabulary } from './vocabulary';
export function SupportedObjects() {
  const cameraWords = vocabulary.filter(w => w.label);
  const manualWords = vocabulary.filter(w => !w.label);
  return <details className="supported-objects"><summary>¿Qué puedo reconocer con la cámara? <span>{cameraWords.length} objetos</span></summary><p>Prueba un solo objeto, bien iluminado y completo dentro de la imagen. La detección puede variar según el ángulo y el tamaño.</p><div className="supported-list">{cameraWords.map(w => <span key={w.id}>{w.emoji} {w.es}</span>)}</div><p><strong>Solo práctica manual:</strong> {manualWords.map(w => w.es.toLowerCase()).join(', ')}. El modelo actual no detecta estos objetos ni distingue el valor de los billetes.</p></details>;
}
