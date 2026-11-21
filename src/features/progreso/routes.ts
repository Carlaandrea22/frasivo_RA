import type { RouteDefinition } from '../../shared/navegacion';
import { Progreso, Practicas } from './Progreso';

export const routes = [
  { path: 'progreso', tab: 'progreso', Screen: Progreso },
  { path: 'progreso/practicas', tab: 'progreso', Screen: Practicas },
] satisfies RouteDefinition[];
