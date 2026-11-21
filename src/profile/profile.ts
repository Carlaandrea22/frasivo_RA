import type { ProgressStorage } from '../storage';

export const careers = {
  medicine: { label: 'Medicina', short: 'Medicina', description: 'Anatomía y vocabulario del cuerpo humano', symbol: '✚' },
  gastronomy: { label: 'Gastronomía', short: 'Gastronomía', description: 'Utensilios, técnicas y lenguaje de cocina', symbol: '♧' },
  systems: { label: 'Ingeniería de Sistemas', short: 'Sistemas', description: 'Código, estructuras y desarrollo de software', symbol: '</>' },
} as const;
export const levels = {
  beginner: { label: 'Básico', cefr: 'A1–A2', description: 'Reconozco palabras y entiendo frases sencillas.' },
  intermediate: { label: 'Intermedio', cefr: 'B1–B2', description: 'Entiendo conversaciones y puedo usar palabras en contexto.' },
  advanced: { label: 'Avanzado', cefr: 'C1–C2', description: 'Comprendo explicaciones en inglés y escribo términos técnicos.' },
} as const;
export type CareerId = keyof typeof careers;
export type EnglishLevel = keyof typeof levels;
export interface LearnerProfile { version: 1; name: string; career: CareerId; level: EnglishLevel }
export const profileKey = 'frasivo-profile:v1';
export function validProfile(value: unknown): value is LearnerProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as LearnerProfile;
  return p.version === 1 && typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 60
    && Object.hasOwn(careers, p.career) && Object.hasOwn(levels, p.level);
}
export function loadProfile(storage: Pick<ProgressStorage, 'getItem'>): LearnerProfile | null {
  try { const value: unknown = JSON.parse(storage.getItem(profileKey) ?? 'null'); return validProfile(value) ? { ...value, name: value.name.trim() } : null; }
  catch { return null; }
}
export function saveProfile(storage: Pick<ProgressStorage, 'setItem'>, profile: LearnerProfile | null): boolean {
  if (profile !== null && !validProfile(profile)) return false;
  try { storage.setItem(profileKey, JSON.stringify(profile ? { ...profile, name: profile.name.trim() } : null)); return true; } catch { return false; }
}
