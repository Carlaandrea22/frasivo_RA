import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeftRight, ArrowUp, Bone, ChevronRight, Languages, ListChecks, Plus, Square, WifiOff } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Mascota } from '../progreso/mascota/Mascota';
import { Answer } from './Answer';
import { ChatError, streamChat, type ChatMessage, type ErrorCode } from './chatApi';
import './chatbot.css';

const historyKey = 'lumar.chatbot.historial';
const historyLimit = 30;
const messageLimit = 1000;
let messageSequence = 0;

const suggestions = [
  { text: '¿Cómo se dice clavícula en inglés?', Icon: Languages },
  { text: 'Explícame el fémur', Icon: Bone },
  { text: 'Hazme 3 preguntas de músculos', Icon: ListChecks },
  { text: '¿Qué diferencia hay entre tendon y ligament?', Icon: ArrowLeftRight },
];

const errors: Record<ErrorCode, string> = {
  sin_conexion: 'Se interrumpió la conexión.',
  no_configurado: 'El chat aún no está activado',
  limite: 'Espera un momento',
  no_disponible: 'El chat no está disponible en este momento.',
  entrada_invalida: 'No se pudo enviar el mensaje. Revisa que tenga hasta 1 000 caracteres.',
};

type ActiveReply = { controller: AbortController; text: string };
type HistoryMessage = ChatMessage & { id: number };

function withId(message: ChatMessage): HistoryMessage {
  return { ...message, id: ++messageSequence };
}

function readHistory(): HistoryMessage[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(historyKey) ?? '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((item): item is ChatMessage => item && typeof item === 'object'
      && (item.role === 'user' || item.role === 'assistant')
      && typeof item.content === 'string' && item.content.trim()
      && (item.role !== 'user' || item.content.length <= messageLimit)).slice(-historyLimit).map(withId);
  } catch {
    return [];
  }
}

function TutorAvatar() {
  return <span className="chatbot-avatar"><Mascota etapa="medico_joven" animacion="estatica"/></span>;
}

function resizeComposer(field: HTMLTextAreaElement | null) {
  if (!field) return;
  field.style.height = '0px';
  field.style.height = `${field.scrollHeight + 2}px`;
}

function Message({ message, live = false }: { message: ChatMessage; live?: boolean }) {
  const tutor = message.role === 'assistant';
  return <div className={`chatbot-message chatbot-message--${message.role}`} aria-hidden={live || undefined}>
    {tutor && <TutorAvatar/>}
    <div className="chatbot-bubble">
      <span className="chatbot-message-author">{tutor ? 'Tutor LumAR' : 'Tú'}</span>
      {tutor ? <Answer content={message.content} interactive={!live}/>
        : <p className="chatbot-user-text">{message.content}</p>}
    </div>
  </div>;
}

export function Chatbot() {
  const [messages, setMessages] = useState(readHistory);
  const [draft, setDraft] = useState('');
  const [partial, setPartial] = useState('');
  const [writing, setWriting] = useState(false);
  const [failure, setFailure] = useState<ErrorCode>();
  const [online, setOnline] = useState(() => navigator.onLine);
  const active = useRef<ActiveReply | null>(null);
  const page = useRef<HTMLElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const confirmation = useRef<HTMLDialogElement>(null);
  const followLatest = useRef(true);

  const scrollToLatest = useCallback(() => {
    const element = scroller.current;
    if (element && followLatest.current) {
      element.scrollTop = element.querySelector('.chatbot-empty') ? 0 : element.scrollHeight;
    }
  }, []);

  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    const shell = page.current?.closest<HTMLElement>('.app-shell');
    if (!viewport || !shell) return;
    const update = () => {
      const zoomed = Math.abs(viewport.scale - 1) > .01;
      shell.style.setProperty('--chatbot-viewport-height', zoomed ? '100dvh' : `${viewport.height}px`);
      shell.style.setProperty('--chatbot-viewport-top', zoomed ? '0px' : `${viewport.offsetTop}px`);
      resizeComposer(textarea.current);
      scrollToLatest();
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      shell.style.removeProperty('--chatbot-viewport-height');
      shell.style.removeProperty('--chatbot-viewport-top');
    };
  }, [scrollToLatest]);

  useLayoutEffect(() => resizeComposer(textarea.current), [draft, writing]);

  useLayoutEffect(scrollToLatest, [draft, messages, partial, writing, failure, online, scrollToLatest]);

  useEffect(() => {
    try {
      localStorage.setItem(historyKey, JSON.stringify(messages.map(({ role, content }) => ({ role, content }))));
    } catch {
      // La conversación sigue disponible durante la sesión si el almacenamiento está bloqueado.
    }
  }, [messages]);

  useEffect(() => {
    const connect = () => setOnline(true);
    const disconnect = () => {
      setOnline(false);
      const reply = active.current;
      if (!reply) return;
      active.current = null;
      reply.controller.abort();
      setWriting(false);
      setFailure('sin_conexion');
    };
    window.addEventListener('online', connect);
    window.addEventListener('offline', disconnect);
    return () => {
      window.removeEventListener('online', connect);
      window.removeEventListener('offline', disconnect);
      active.current?.controller.abort();
      active.current = null;
    };
  }, []);

  function focusComposer() {
    if (!confirmation.current?.open) textarea.current?.focus({ preventScroll: true });
  }

  function saveReply(text: string) {
    if (text.trim()) {
      const message = withId({ role: 'assistant', content: text });
      setMessages(previous => [...previous, message].slice(-historyLimit));
    }
    setPartial('');
  }

  async function requestReply(history: ChatMessage[]) {
    const reply: ActiveReply = { controller: new AbortController(), text: '' };
    active.current = reply;
    followLatest.current = true;
    setFailure(undefined);
    setPartial('');
    setWriting(true);
    focusComposer();

    try {
      await streamChat(history, reply.controller.signal, text => {
        if (active.current !== reply) return;
        reply.text += text;
        setPartial(reply.text);
      });
      if (active.current === reply) {
        if (!reply.text.trim()) throw new ChatError('no_disponible');
        saveReply(reply.text);
      }
    } catch (error) {
      if (active.current === reply) {
        setFailure(!navigator.onLine ? 'sin_conexion' : error instanceof ChatError ? error.code : 'no_disponible');
      }
    } finally {
      if (active.current === reply) {
        active.current = null;
        setWriting(false);
      }
    }
  }

  function send(text: string) {
    const content = text.trim();
    if (!online || active.current || !content || content.length > messageLimit) return;
    const next = [...messages, withId({ role: 'user', content })].slice(-historyLimit);
    setMessages(next);
    setDraft('');
    void requestReply(next);
  }

  function stop() {
    const reply = active.current;
    if (!reply) return;
    active.current = null;
    reply.controller.abort();
    setWriting(false);
    saveReply(reply.text);
    focusComposer();
  }

  function reset() {
    const reply = active.current;
    active.current = null;
    reply?.controller.abort();
    setMessages([]);
    setDraft('');
    setPartial('');
    setFailure(undefined);
    setWriting(false);
    followLatest.current = true;
    confirmation.current?.close();
    focusComposer();
  }

  const remaining = messageLimit - draft.length;
  const nearLimit = remaining <= 100;

  return <section className="chatbot-page" aria-labelledby="chatbot-title" ref={page}>
    <header className="chatbot-header">
      <h1 id="chatbot-title">Chatbot</h1>
      <Button variant="text" disabled={!messages.length && !draft} onClick={() => confirmation.current?.showModal()}>
        <Plus size={17} aria-hidden="true"/> Nueva conversación
      </Button>
    </header>

    <div className="chatbot-scroll" ref={scroller} onScroll={event => {
      const element = event.currentTarget;
      followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 44;
    }}>
      {messages.length === 0 && <div className="chatbot-empty">
        <div className="chatbot-welcome">
          <TutorAvatar/>
          <div>
            <h2>Hola, soy tu tutor de LumAR</h2>
            <p>Pregúntame sobre anatomía o practica vocabulario médico en inglés.</p>
          </div>
        </div>
        <div className="chatbot-suggestions" aria-label="Preguntas sugeridas" role="group">
          {suggestions.map(({ text, Icon }) => <Button key={text} variant="secondary" disabled={!online} onClick={() => send(text)}>
            <Icon size={18} aria-hidden="true"/>
            <span>{text}</span>
            <ChevronRight size={16} aria-hidden="true"/>
          </Button>)}
        </div>
      </div>}
      <div className="chatbot-log" role="log" aria-label="Conversación" aria-live="polite" aria-relevant="additions">
        {messages.map(message => <Message key={message.id} message={message}/>)}
      </div>
      {partial && <Message message={{ role: 'assistant', content: partial }} live={writing}/>}
      {writing && <p className="chatbot-typing" role="status">El tutor está escribiendo<span aria-hidden="true">…</span></p>}
      {failure && online && <div className="chatbot-error">
        <p role="alert">{errors[failure]}</p>
        <Button variant="secondary" onClick={() => !active.current && void requestReply(messages)}>Reintentar</Button>
      </div>}
    </div>

    <form className="chatbot-composer" onSubmit={event => { event.preventDefault(); send(draft); }}>
      {!online && <p className="chatbot-offline" role="status"><WifiOff size={16} aria-hidden="true"/> Necesitas internet para usar el chat</p>}
      <div className="chatbot-input-row">
        <textarea ref={textarea} aria-label="Mensaje" placeholder="Escribe tu pregunta…" rows={1} maxLength={messageLimit}
          aria-describedby={nearLimit ? 'chatbot-limit' : undefined}
          value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => {
            if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            send(draft);
          }}/>
        {writing ? <Button variant="secondary" onClick={stop}><Square size={15} aria-hidden="true"/> Detener</Button>
          : <Button type="submit" aria-label="Enviar" disabled={!online || !draft.trim()}><ArrowUp size={22} aria-hidden="true"/></Button>}
      </div>
      <span className="chatbot-sr-only" role="status">{nearLimit && 'Te estás acercando al límite de 1 000 caracteres.'}</span>
      {nearLimit && <p className="chatbot-limit" id="chatbot-limit">{remaining} de 1 000 caracteres disponibles</p>}
      <p className="chatbot-notice">Las respuestas las genera una IA y pueden tener errores. No escribas datos personales ni de salud. No reemplaza una consulta médica.</p>
    </form>

    <dialog className="chatbot-confirmation" ref={confirmation} aria-labelledby="chatbot-confirmation-title">
      <h2 id="chatbot-confirmation-title">¿Empezar una nueva conversación?</h2>
      <p>Se borrará el historial del chat de este dispositivo.</p>
      <div>
        <Button variant="secondary" onClick={() => confirmation.current?.close()}>Cancelar</Button>
        <Button onClick={reset}>Empezar de nuevo</Button>
      </div>
    </dialog>
  </section>;
}
