import { Card } from '../ui/Card';

export function Creditos() {
  return <section className="lumar-page">
    <h1>Créditos</h1>
    <Card>
      <h2>Modelos anatómicos</h2>
      <p>BodyParts3D, © The Database Center for Life Science, con licencia CC BY 4.0 Internacional.</p>
      <p>Mallas adaptadas para móvil y vistas frontales renderizadas en Blender.</p>
      <ul>
        <li><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html">Descargas de BodyParts3D</a></li>
        <li><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html">Licencia de BodyParts3D</a></li>
      </ul>
    </Card>
    <Card>
      <h2>Referencia de anatomía</h2>
      <p>J. Gordon Betts y colaboradores, <cite>Anatomy and Physiology 2e</cite>, OpenStax.</p>
      <ul>
        <li><a href="https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy">Anatomía del corazón</a></li>
        <li><a href="https://openstax.org/books/anatomy-and-physiology-2e/pages/8-4-bones-of-the-lower-limb">Huesos del miembro inferior</a></li>
        <li><a href="https://openstax.org/books/anatomy-and-physiology-2e/pages/preface">Licencia de la edición consultada · CC BY-NC-SA 4.0</a></li>
      </ul>
    </Card>
    <div><a className="button button--secondary lumar-link" href="#progreso">Volver a Mi progreso</a></div>
  </section>;
}
