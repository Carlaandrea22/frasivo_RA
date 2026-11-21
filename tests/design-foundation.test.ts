import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from '../src/shared/ui/Button';
import { torsoTransform, demoPose, segmentTransform } from '../src/features/cuerpo/anatomy';

describe('Button', () => {
  it('conserva el elemento nativo y su estado deshabilitado', () => {
    const html = renderToStaticMarkup(createElement(Button, { disabled: true, variant: 'secondary' }, 'Activar'));
    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('button--secondary');
  });

  it('expone el estado de una respuesta sin perder el tipo ni la etiqueta', () => {
    const html = renderToStaticMarkup(createElement(Button, { variant: 'answer', result: 'correct', type: 'submit' }, 'Heart'));
    expect(html).toContain('type="submit"');
    expect(html).toContain('data-result="correct"');
    expect(html).toContain('Heart');
  });
});

describe('alineación del atlas corporal', () => {
  it('alinea torso y brazo cuando las referencias están visibles', () => {
    expect(torsoTransform(demoPose)).toHaveLength(6);
    expect(segmentTransform(demoPose, 11, 13)).toHaveLength(6);
  });

  it('omite un segmento y el torso al perder un hombro', () => {
    const pose = demoPose.map((point, index) => index === 11 ? { ...point, visibility: .1 } : point);
    expect(torsoTransform(pose)).toBeNull();
    expect(segmentTransform(pose, 11, 13)).toBeNull();
  });
});
