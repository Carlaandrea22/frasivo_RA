import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { anatomyParts, demoPose } from '../src/medicine/anatomy';
import { atlasMatrices, atlasParts, comparisonTechnique } from '../src/medicine/atlasAlignment';
import anchors from '../assets/anatomy/body/anchors.json';

const assets = new URL('../assets/anatomy/body/', import.meta.url);

describe('atlas anatómico de BodyParts3D', () => {
  for (const layer of ['bones', 'muscles', 'organs'] as const) {
    it(`publica los nodos declarados de ${layer} en menos de 4 MB`, () => {
      const glb = readFileSync(new URL(`${layer}.glb`, assets));
      expect(glb.toString('ascii', 0, 4)).toBe('glTF');
      expect(glb.length).toBeLessThanOrEqual(4_000_000);
      const json = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
      const nodes = json.nodes.filter((node: { mesh?: number }) => node.mesh !== undefined);
      const parts = atlasParts.filter(part => part.layer === layer);
      expect(nodes.map((node: { name: string }) => node.name).sort()).toEqual(parts.map(part => part.id).sort());
      expect(new Set(parts.map(part => part.term))).toEqual(new Set(anatomyParts.filter(term => term.layer === layer).map(term => term.id)));
    });
  }

  it('conserva un WebP frontal por hueso y un anclaje torácico en metros', () => {
    expect(anchors.units).toBe('m');
    expect(anchors.anchors.thorax_center).toHaveLength(3);
    for (const part of atlasParts.filter(part => part.layer === 'bones')) {
      expect(part.sprite).toHaveLength(4);
      expect(readFileSync(new URL(`sprites/${part.id}.webp`, assets)).toString('ascii', 8, 12)).toBe('WEBP');
    }
  });

  it('coloca el atlas de demostración y oculta un segmento al perder su punto', () => {
    expect(atlasMatrices(null, .8).head).toHaveLength(6);
    expect(atlasMatrices(demoPose, .8).upper_arm_left).toHaveLength(6);
    const missing = demoPose.map((point, index) => index === 11 ? { ...point, visibility: .1 } : point);
    expect(atlasMatrices(missing, .8).trunk).toBeNull();
    expect(atlasMatrices(missing, .8).upper_arm_left).toBeNull();
  });

  it('activa el selector solo con las dos técnicas válidas', () => {
    expect(comparisonTechnique('?tecnica=a')).toBe('a');
    expect(comparisonTechnique('?tecnica=b')).toBe('b');
    expect(comparisonTechnique('?tecnica=experimental')).toBeNull();
    expect(comparisonTechnique('')).toBeNull();
  });
});
