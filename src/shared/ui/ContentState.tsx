import type { ReactNode } from 'react';

const labels = {
  loading: 'Cargando…',
  empty: 'Todavía no hay contenido',
  error: 'No se pudo cargar el contenido',
  unavailable: 'Contenido no disponible',
};

export function ContentState({ state, title = labels[state], children }: {
  state: keyof typeof labels; title?: string; children?: ReactNode;
}) {
  return <div className="lumar-content-state" data-state={state} role={state === 'error' ? 'alert' : 'status'}>
    <p><strong>{title}</strong></p>
    {children}
  </div>;
}
