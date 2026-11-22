import type { RouteDefinition } from '../../shared/navegacion';
import { Progreso } from './Progreso';
import { Practicas } from './PracticeHistory';
import { PushTest } from './PushTest';

export const routes = [
  { path: 'progreso', tab: 'progreso', Screen: Progreso },
  { path: 'progreso/practicas', tab: 'progreso', Screen: Practicas },
  ...(import.meta.env.MODE === 'push-test' ? [{ path: 'progreso/notificaciones', tab: 'progreso', Screen: PushTest } as const] : []),
] satisfies RouteDefinition[];
