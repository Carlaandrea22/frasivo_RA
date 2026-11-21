import { useEffect, useState } from 'react';
import { Activity, BookOpen, Box, ScanLine } from 'lucide-react';
import { anatomyArea } from './content/anatomy/area';
import MedicineExplorer from './medicine/MedicineExplorer';
import { Button } from './ui/Button';

const tabs = [
  { id: 'cuerpo', label: 'Cuerpo', icon: ScanLine },
  { id: 'explorar-3d', label: 'Explorar 3D', icon: Box },
  { id: 'practicar', label: 'Practicar', icon: BookOpen },
  { id: 'mi-progreso', label: 'Mi progreso', icon: Activity },
] as const;

type Screen = typeof tabs[number]['id'] | 'creditos';

function currentScreen(): Screen {
  const hash = window.location.hash.slice(1);
  if (hash === 'creditos') return hash;
  return tabs.find(tab => tab.id === hash)?.id ?? 'cuerpo';
}

function open(screen: Screen) {
  if (currentScreen() !== screen) window.location.hash = screen;
}

export default function App() {
  const [screen, setScreen] = useState(currentScreen);
  useEffect(() => {
    const onHashChange = () => setScreen(currentScreen());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div className="app-shell" data-area={anatomyArea.id}>
      <header className="app-header">
        <div className="app-brand">
          <span className="app-mark" aria-hidden="true"><Activity size={21}/></span>
          <span>Frasivo Explore</span>
        </div>
        <span className="app-area">{anatomyArea.name}</span>
      </header>

      <main className={`app-main${screen === 'cuerpo' ? ' app-main--body' : ''}`}>
        {screen === 'cuerpo' ? <MedicineExplorer/> : <Section screen={screen}/>}
      </main>

      <nav className="app-navigation" aria-label="Navegación principal">
        <div className="app-navigation-inner">
          {tabs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant="nav"
              aria-current={screen === id || (screen === 'creditos' && id === 'mi-progreso') ? 'page' : undefined}
              onClick={() => open(id)}
            >
              <Icon size={19} aria-hidden="true"/>
              {label}
            </Button>
          ))}
        </div>
      </nav>
    </div>
  );
}

const pending = {
  'explorar-3d': { title: 'Explorar 3D', text: 'El visor del corazón en corte se incorporará en la siguiente etapa.', icon: Box },
  practicar: { title: 'Practicar', text: 'Los ejercicios se habilitarán cuando esté listo el catálogo anatómico.', icon: BookOpen },
  'mi-progreso': { title: 'Mi progreso', text: 'Aquí podrás consultar el vocabulario que has explorado y practicado.', icon: Activity },
};

function Section({ screen }: { screen: Exclude<Screen, 'cuerpo'> }) {
  if (screen === 'creditos') {
    return (
      <section className="section-panel">
        <h1>Créditos</h1>
        <h2>Modelos anatómicos</h2>
        <p>BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.</p>
        <p>Mallas adaptadas para móvil y vistas frontales renderizadas en Blender.</p>
        <ul>
          <li><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html">Descargas de BodyParts3D</a></li>
          <li><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html">Licencia de BodyParts3D · CC BY 4.0</a></li>
        </ul>
        <h2>Referencia de anatomía cardiovascular</h2>
        <p>J. Gordon Betts y colaboradores, <cite>Anatomy and Physiology 2e</cite>, OpenStax.</p>
        <ul>
          <li><a href="https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy">19.1 Heart Anatomy</a></li>
          <li><a href="https://openstax.org/books/anatomy-and-physiology-2e/pages/preface">Licencia de la edición consultada · CC BY-NC-SA 4.0</a></li>
        </ul>
        <Button variant="secondary" onClick={() => open('mi-progreso')}>Volver a Mi progreso</Button>
      </section>
    );
  }
  const { title, text, icon: Icon } = pending[screen];
  return (
    <section className="section-panel">
      <span className="section-icon" aria-hidden="true"><Icon size={24}/></span>
      <h1>{title}</h1>
      <p>{text}</p>
      {screen === 'mi-progreso' && <Button variant="secondary" onClick={() => open('creditos')}>Créditos</Button>}
    </section>
  );
}
