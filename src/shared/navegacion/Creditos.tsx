import { Card } from '../ui/Card';
import { OfflineReadiness } from '../pwa/OfflineReadiness';

export function Creditos() {
  return <section className="lumar-page">
    <h1>Créditos</h1>
    <OfflineReadiness/>
    <Card>
      <h2>Modelos anatómicos</h2>
      <p lang="en">BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.</p>
      <p>LumAR adapta las mallas para móvil y renderiza las vistas del atlas en Blender.</p>
      <ul>
        <li><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html">Descargas de BodyParts3D</a></li>
        <li><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html">Licencia CC BY 4.0</a></li>
      </ul>
      <h3>Corazón en corte</h3>
      <p>Modelo didáctico original de LumAR, creado en Blender.</p>
    </Card>
    <Card>
      <h2>Seguimiento con MediaPipe</h2>
      <p>Modelos y herramientas de Google MediaPipe bajo Apache 2.0.</p>
      <ul>
        <li><a href="https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker">Pose Landmarker Lite y Full</a></li>
        <li><a href="https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker">Hand Landmarker</a></li>
        <li><a href="https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker">Face Landmarker</a></li>
        <li><a href="https://github.com/google-ai-edge/mediapipe/blob/v0.10.32/LICENSE">Licencia Apache 2.0 de MediaPipe</a></li>
      </ul>
    </Card>
    <Card>
      <h2>Referencia de anatomía</h2>
      <p>J. Gordon Betts y colaboradores, <cite lang="en">Anatomy and Physiology 2e</cite>, OpenStax.</p>
      <ul>
        <li><a href="https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy">Anatomía del corazón</a></li>
        <li><a href="https://openstax.org/books/anatomy-and-physiology-2e/pages/8-4-bones-of-the-lower-limb">Huesos del miembro inferior</a></li>
        <li><a href="https://openstax.org/books/anatomy-and-physiology-2e/pages/preface">Licencia CC BY-NC-SA 4.0 de la edición consultada</a></li>
      </ul>
    </Card>
    <Card>
      <h2>Pronunciación en inglés</h2>
      <p>Clips generados con Piper y el modelo en_US-ljspeech-medium. El conjunto de grabaciones LJ Speech es de dominio público.</p>
      <ul>
        <li><a href="https://github.com/OHF-Voice/piper1-gpl">Piper</a></li>
        <li><a href="https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/ljspeech/medium/MODEL_CARD">Modelo en_US-ljspeech-medium</a></li>
        <li><a href="https://keithito.com/LJ-Speech-Dataset/">Conjunto LJ Speech</a></li>
      </ul>
    </Card>
    <Card>
      <h2>Tipografía e interfaz</h2>
      <ul>
        <li><a href="https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt">DM Sans · SIL OFL 1.1</a></li>
        <li><a href="https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt">Manrope · SIL OFL 1.1</a></li>
        <li><a href="https://lucide.dev/license">Íconos de Lucide · ISC</a></li>
        <li><a href="https://github.com/mrdoob/three.js/blob/dev/LICENSE">three.js · MIT</a></li>
      </ul>
    </Card>
    <Card>
      <h2>Aportes del equipo</h2>
      <p>Espacio para los recursos y créditos de Carla y Nicolas.</p>
    </Card>
    <div><a className="button button--secondary lumar-link" href="#progreso">Volver a Mi progreso</a></div>
  </section>;
}
