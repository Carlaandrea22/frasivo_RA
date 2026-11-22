import type { RouteDefinition } from '../../shared/navegacion';
import { RelacionaInicio, Retos, SenalaInicio, UbicaInicio } from './Retos';

export const routes = [
  { path: 'practicar/retos', tab: 'practicar', Screen: Retos },
  { path: 'practicar/retos/ubicar', tab: 'practicar', Screen: UbicaInicio },
  { path: 'practicar/retos/ubicar/estructura/:estructuraId', tab: 'practicar', Screen: UbicaInicio },
  { path: 'practicar/retos/senalar', tab: 'practicar', Screen: SenalaInicio },
  { path: 'practicar/retos/senalar/estructura/:estructuraId', tab: 'practicar', Screen: SenalaInicio },
  { path: 'practicar/retos/relacionar', tab: 'practicar', Screen: RelacionaInicio },
  { path: 'practicar/retos/relacionar/estructura/:estructuraId', tab: 'practicar', Screen: RelacionaInicio },
  { path: 'practicar/retos/estructura/:estructuraId', tab: 'practicar', Screen: Retos },
  { path: 'practicar/retos/:id', tab: 'practicar', Screen: Retos },
  { path: 'practicar/retos/:id/resultado/:intento', tab: 'practicar', Screen: Retos },
] satisfies RouteDefinition[];
