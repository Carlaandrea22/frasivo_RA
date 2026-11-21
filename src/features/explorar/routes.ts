import type { RouteDefinition } from '../../shared/navegacion';
import { Catalogo, DetalleEstructura } from './Explorar';

export const routes = [
  { path: 'explorar', tab: 'explorar', Screen: Catalogo },
  { path: 'explorar/:categoria', tab: 'explorar', Screen: Catalogo },
  { path: 'explorar/estructura/:id', tab: 'explorar', Screen: DetalleEstructura },
] satisfies RouteDefinition[];
