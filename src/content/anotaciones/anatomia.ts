import type { Anotacion, Punto3D } from '../types';
import { estructuras } from '../anatomy/catalogo';
import { partesCorazon, revisionCorazon } from '../anatomy/corazon';
import puntosCorazon from './puntos-corazon.json';
import puntosRegiones from './puntos-regiones.json';

export const anotaciones: readonly Anotacion[] = [
  ...partesCorazon.map((parte): Anotacion => ({
    id: `heart-${parte.id}`, estructuraId: 'heart', parteId: parte.id,
    etiquetaEs: parte.nombreEs, etiquetaEn: parte.terminoEn, nodeId: parte.id,
    punto: puntosCorazon[parte.id as keyof typeof puntosCorazon] as [number,number,number], revision: revisionCorazon,
  })),
  ...estructuras.filter(item => item.id !== 'heart').flatMap(item =>
    item.partes.map((parte): Anotacion => {
      const nodeId = `${item.modelo!.nodeId}__${parte.id}`;
      return {
        id: `${item.id}-${parte.id}`, estructuraId: item.id, parteId: parte.id,
        etiquetaEs: parte.nombreEs, etiquetaEn: parte.terminoEn, nodeId,
        punto: puntosRegiones[nodeId as keyof typeof puntosRegiones] as unknown as Punto3D,
        revision: item.revision,
      };
    }),
  ),
];
