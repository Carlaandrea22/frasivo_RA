import type { RouteDefinition } from '.';
import { Creditos } from './Creditos';
import { PracticarHome } from './PracticarHome';

export const baseRoutes = [
  { path: 'practicar', tab: 'practicar', Screen: PracticarHome },
  { path: 'progreso/creditos', tab: 'progreso', Screen: Creditos },
] satisfies RouteDefinition[];
