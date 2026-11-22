import { describe, expect, it } from 'vitest';
import { readEnglishTerms } from '../src/features/chatbot/format';

describe('readEnglishTerms', () => {
  it('reads each complete English term without consuming surrounding punctuation', () => {
    expect(readEnglishTerms('Entre [[en: femur ]] y [[en:knee joint]].')).toEqual([
      { kind: 'text', value: 'Entre ' },
      { kind: 'term', value: 'femur' },
      { kind: 'text', value: ' y ' },
      { kind: 'term', value: 'knee joint' },
      { kind: 'text', value: '.' },
    ]);
  });

  it('handles adjacent markers', () => {
    expect(readEnglishTerms('[[en:tendon]][[en:ligament]]')).toEqual([
      { kind: 'term', value: 'tendon' },
      { kind: 'term', value: 'ligament' },
    ]);
  });

  it('keeps empty, unfinished, multiline and unsupported markers as text', () => {
    const value = '[[en:]] [[en:  ]] [[es:fémur]] [[en:hip\n joint]] [[en:cla';
    expect(readEnglishTerms(value)).toEqual([{ kind: 'text', value }]);
  });

  it('leaves HTML-looking content as text', () => {
    const value = '<img onerror="alert(1)"> [[en:<b>heart</b>]]';
    expect(readEnglishTerms(value)).toEqual([{ kind: 'text', value }]);
  });
});
