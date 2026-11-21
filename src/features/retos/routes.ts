import type { RouteDefinition } from '../../shared/navegacion';
import { Retos } from './Retos';

export const routes = [
  { path: 'practicar/retos', tab: 'practicar', Screen: Retos },
  { path: 'practicar/retos/:id', tab: 'practicar', Screen: Retos },
] satisfies RouteDefinition[];
