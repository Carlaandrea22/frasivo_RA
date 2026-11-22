import { ContentState } from '../../shared/ui/ContentState';
import './chatbot.css';

export function Chatbot() {
  return <section className="lumar-page chatbot-page">
    <header>
      <h1>Chatbot</h1>
      <p className="lumar-subtitle">Pronto podrás preguntar sobre anatomía y practicar términos en inglés.</p>
    </header>
    <ContentState state="empty" title="En construcción"/>
  </section>;
}
