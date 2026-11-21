import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { anatomyParts, demoPose } from '../src/features/cuerpo/anatomy';
import { atlasMatrices, atlasParts, atlasPlacement } from '../src/features/cuerpo/atlasAlignment';
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

  it('conserva imágenes WebP en cada capa y un anclaje torácico en metros', () => {
    expect(anchors.units).toBe('m');
    expect(anchors.anchors.thorax_center).toHaveLength(3);
    for (const part of atlasParts) {
      expect(part.sprite).toHaveLength(4);
      expect(readFileSync(new URL(`sprites/${part.id}.webp`, assets)).toString('ascii', 8, 12)).toBe('WEBP');
      if (part.group.startsWith('foot')) {
        expect(part.demoSprite).toHaveLength(4);
        expect(readFileSync(new URL(`sprites/${part.id}_front.webp`, assets)).toString('ascii', 8, 12)).toBe('WEBP');
      }
    }
  });

  const front = demoPose.map(point => ({ ...point, z: 0 }));
  front[2] = { x: .525, y: .105, z: -.03, visibility: 1 };
  front[5] = { x: .475, y: .105, z: -.03, visibility: 1 };

  it('mantiene el tórax vertical y la escala de la cabeza al perder ambas caderas', () => {
    const full = atlasPlacement(front, .8);
    expect(full.complete).toBe(true);
    expect(full.matrices.head).toHaveLength(6);
    expect(full.matrices.thigh_left).toHaveLength(6);
    const partial = front.map((point, index) => index === 23 || index === 24 ? { ...point, visibility: .1 } : point);
    const torso = atlasPlacement(partial, .8);
    expect(torso.complete).toBe(false);
    expect(torso.matrices.trunk).toEqual(full.matrices.trunk);
    expect(torso.matrices.trunk?.slice(1, 3)).toEqual([0, 0]);
    expect(torso.matrices.head).toEqual(full.matrices.head);
    expect(torso.matrices.pelvis).toBeNull();
    expect(torso.matrices.thigh_left).toBeNull();
    expect(torso.visible.map(part => part.term)).not.toContain('fibula');
    const widerShoulders = partial.map((point, i) => i === 11 ? { ...point, x: point.x + .10, y: point.y - .07 } : point);
    expect(atlasPlacement(widerShoulders, .8).matrices.head).toEqual(torso.matrices.head);
  });

  it('oculta los segmentos escorzados, fuera del recorte y en una vista de espaldas', () => {
    const compressed = front.map((point, i) => i === 25 ? { ...front[23], x: .59, y: .56, z: -.3 } : point);
    expect(atlasMatrices(compressed, .8).thigh_left).toBeNull();
    expect(atlasMatrices(compressed, .8).thigh_right).toHaveLength(6);
    expect(atlasPlacement(front, 1, .32).matrices.forearm_right).toBeNull();
    const back = front.map((point, i) => ({ ...point, x: 1 - point.x, visibility: i <= 6 ? 0 : point.visibility }));
    expect(atlasPlacement(back, .8).facing).toBe('back');
    expect(atlasPlacement(back, .8).visible).toEqual([]);
  });

  it('coloca la mano y el pie solo con sus referencias visibles', () => {
    const pose = front.map(point => ({ ...point }));
    pose[17] = { x: .77, y: .65, z: 0, visibility: 1 };
    pose[19] = { x: .82, y: .62, z: 0, visibility: 1 };
    pose[21] = { x: .84, y: .58, z: 0, visibility: 1 };
    pose[29] = { x: .60, y: .955, z: 0, visibility: 1 };
    pose[31] = { x: .69, y: .97, z: 0, visibility: 1 };
    expect(atlasPlacement(pose, .8).visible.map(part => part.id)).toEqual(expect.arrayContaining([
      'carpals_left', 'metacarpals_left', 'hand_phalanges_left', 'tarsals_left', 'metatarsals_left', 'foot_phalanges_left',
    ]));
    pose[21].visibility = .2;
    pose[31].visibility = .2;
    const lost = atlasMatrices(pose, .8);
    expect(lost.hand_left).toBeNull();
    expect(lost.foot_left).toBeNull();
  });

  it('dibuja piernas con profundidad ruidosa, manos de canto y pies de frente', () => {
    const pose = front.map(point => ({ ...point }));
    const landmarks = [
      [25, .59, .73, .07, .6], [27, .60, .90, .37, .58],
      [29, .603, .92, .39, .48], [31, .61, .955, .16, .92],
      [17, .765, .604, -.07, .82], [19, .752, .606, -.15, .91], [21, .738, .585, -.03, .91],
    ];
    for (const [i, x, y, z, visibility] of landmarks) pose[i] = { x, y, z, visibility };
    const placement = atlasPlacement(pose, .8);
    expect(placement.visible.map(part => part.id)).toEqual(expect.arrayContaining([
      'tibia_left', 'fibula_left', 'patella_left', 'gastrocnemius_left', 'tibialis_anterior_left',
      'carpals_left', 'metacarpals_left', 'hand_phalanges_left', 'tarsals_left', 'metatarsals_left', 'foot_phalanges_left',
    ]));
    expect(placement.frontFeet.has('foot_left')).toBe(true);
    expect(placement.complete).toBe(false);
    pose[31].visibility = .1;
    expect(atlasMatrices(pose, .8).shin_left).toBeNull();
    pose[31].visibility = .92;
    pose[27].y = 1.03;
    expect(atlasMatrices(pose, .8).shin_left).toBeNull();
  });
});
