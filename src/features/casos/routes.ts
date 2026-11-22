import type { RouteDefinition } from '../../shared/navegacion';
import { CasoRecomendado, Casos } from './Casos';

export const routes = [
  { path: 'practicar/casos', tab: 'practicar', Screen: Casos },
  { path: 'practicar/casos/modo/:modo', tab: 'practicar', Screen: CasoRecomendado },
  { path: 'practicar/casos/modo/:modo/:formato', tab: 'practicar', Screen: CasoRecomendado },
  { path: 'practicar/casos/:id', tab: 'practicar', Screen: Casos },
] satisfies RouteDefinition[];
