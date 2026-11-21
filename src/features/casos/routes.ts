import type { RouteDefinition } from '../../shared/navegacion';
import { Casos } from './Casos';

export const routes = [
  { path: 'practicar/casos', tab: 'practicar', Screen: Casos },
  { path: 'practicar/casos/:id', tab: 'practicar', Screen: Casos },
] satisfies RouteDefinition[];
