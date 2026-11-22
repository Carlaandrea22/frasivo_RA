import { createElement, lazy, Suspense } from 'react';
import type { RouteDefinition } from '../../shared/navegacion';
import { Progreso } from './Progreso';
import { Practicas } from './PracticeHistory';

const PushTest = import.meta.env.MODE === 'push-test'
  ? lazy(() => import('./PushTest').then(screen => ({ default: screen.PushTest })))
  : undefined;

function PushTestScreen() {
  return PushTest ? createElement(Suspense, { fallback: null }, createElement(PushTest)) : null;
}

export const routes = [
  { path: 'progreso', tab: 'progreso', Screen: Progreso },
  { path: 'progreso/actividad/:formato', tab: 'progreso', Screen: Progreso },
  { path: 'progreso/practicas', tab: 'progreso', Screen: Practicas },
  { path: 'progreso/practicas/:formato', tab: 'progreso', Screen: Practicas },
  ...(PushTest ? [{ path: 'progreso/notificaciones', tab: 'progreso', Screen: PushTestScreen } as const] : []),
] satisfies RouteDefinition[];
