import { describe, expect, it } from 'vitest';
import { nextFrameDelay, detectorConfig } from '../src/scanning';

describe('cadencia de análisis sin cola de fotogramas', () => {
  it('solo espera el tiempo restante del intervalo y cede el hilo en equipos lentos', () => {
    expect(nextFrameDelay(20)).toBe(80);
    expect(nextFrameDelay(90)).toBe(16);
    expect(nextFrameDelay(156)).toBe(16);
    expect(nextFrameDelay(800)).toBe(16);
  });
});
describe('configuración enfocada en vocabulario compatible', () => {
  it('no deja que personas u otras categorías ocupen los resultados del vocabulario', () => {
    const config = detectorConfig();
    expect(config.categoryAllowlist).toContain('cell phone');
    expect(config.categoryAllowlist).toContain('mouse');
    expect(config.categoryAllowlist).not.toContain('person');
    expect(config.scoreThreshold).toBeGreaterThanOrEqual(.65);
  });
});
