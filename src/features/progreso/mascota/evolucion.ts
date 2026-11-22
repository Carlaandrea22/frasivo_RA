export const etapasMascota = [
  { id: 'bebe', nombre: 'Bebé', aciertos: 0 },
  { id: 'nino', nombre: 'Niño', aciertos: 10 },
  { id: 'adolescente', nombre: 'Adolescente', aciertos: 25 },
  { id: 'medico_joven', nombre: 'Médico joven', aciertos: 50 },
  { id: 'medico_veterano', nombre: 'Médico veterano', aciertos: 100 },
] as const;

export type MascotaEtapa = (typeof etapasMascota)[number]['id'];

export function obtenerEvolucion(aciertos: number) {
  const indice = etapasMascota.reduce((actual, etapa, index) => aciertos >= etapa.aciertos ? index : actual, 0);
  return { indice, actual: etapasMascota[indice], siguiente: etapasMascota.at(indice + 1) };
}
