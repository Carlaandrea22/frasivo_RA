export const etapasMascota = [
  { id: 'bebe', nombre: 'Bebé', dias: 0 },
  { id: 'nino', nombre: 'Niño', dias: 1 },
  { id: 'adolescente', nombre: 'Adolescente', dias: 3 },
  { id: 'medico_joven', nombre: 'Médico joven', dias: 7 },
  { id: 'medico_veterano', nombre: 'Médico veterano', dias: 14 },
] as const;

export type MascotaEtapa = (typeof etapasMascota)[number]['id'];

export function obtenerEvolucion(dias: number) {
  const indice = etapasMascota.reduce((actual, etapa, index) => dias >= etapa.dias ? index : actual, 0);
  return { indice, actual: etapasMascota[indice], siguiente: etapasMascota.at(indice + 1) };
}
