import { expect, test } from 'vitest';
import { estructuras } from '../src/content/anatomy/catalogo';
import { anatomyParts } from '../src/features/cuerpo/anatomy';
import { regionalBoneTerms } from '../src/features/cuerpo/regionalBoneTerms';
import { pronunciacionUrl as explorarUrl } from '../src/features/explorar/Pronunciacion';
import { pronunciacionUrl } from '../src/shared/audio/pronunciacion';

const cuerpo = [...new Set([...anatomyParts, ...regionalBoneTerms].map(part => part.en))];
const catalogo = estructuras.flatMap(item => [item.terminoEn, ...item.partes.map(part => part.terminoEn)]);
const clips = Object.keys(import.meta.glob('../src/content/anatomy/pronunciacion/*.mp3'))
  .map(path => path.split('/').at(-1)!.slice(0, -4));

test('Cuerpo y Explorar resuelven el mismo MP3 para todos los términos', () => {
  for (const term of new Set([...cuerpo, ...catalogo, ...clips])) {
    expect(pronunciacionUrl(term), term).toBe(explorarUrl(term));
  }
});

test('todos los términos ingleses de Cuerpo tienen clip', () => {
  expect(cuerpo.filter(term => !pronunciacionUrl(term))).toEqual([]);
});
