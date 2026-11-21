import { useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export function BottomSheet({ title, trigger, children }: { title: string; trigger: string; children: ReactNode }) {
  const id = useId();
  const sheet = useRef<HTMLDialogElement>(null);
  return <>
    <Button variant="secondary" aria-haspopup="dialog" onClick={event => {
      event.currentTarget.focus();
      sheet.current?.showModal();
    }}>{trigger}</Button>
    <dialog className="lumar-sheet" ref={sheet} aria-labelledby={id}>
      <header>
        <h2 id={id}>{title}</h2>
        <Button variant="text" aria-label="Cerrar" onClick={() => sheet.current?.close()}>
          <X size={18} aria-hidden="true"/>
        </Button>
      </header>
      {children}
    </dialog>
  </>;
}
