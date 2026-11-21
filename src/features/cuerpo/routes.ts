import type { RouteDefinition } from '../../shared/navegacion';
import MedicineExplorer from './MedicineExplorer';

export const routes = [
  { path: 'cuerpo', tab: 'cuerpo', Screen: MedicineExplorer },
] satisfies RouteDefinition[];
