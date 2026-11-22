type EnglishToken = { kind: 'text' | 'term'; value: string };

export function readEnglishTerms(text: string): EnglishToken[] {
  const tokens: EnglishToken[] = [];
  const marker = /\[\[en:[ \t]*([\p{L}\p{N}][\p{L}\p{M}\p{N} .,'’()/+\-–\t]*)\]\]/gu;
  let end = 0;
  for (const match of text.matchAll(marker)) {
    if (end < match.index) tokens.push({ kind: 'text', value: text.slice(end, match.index) });
    tokens.push({ kind: 'term', value: match[1].trim() });
    end = match.index + match[0].length;
  }
  if (end < text.length) tokens.push({ kind: 'text', value: text.slice(end) });
  return tokens;
}

type AnswerBlock = {
  kind: 'paragraph' | 'unordered' | 'ordered';
  lines: string[];
  start?: number;
};

export function splitAnswerBlocks(text: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  let current: AnswerBlock | undefined;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) {
      current = undefined;
      continue;
    }
    const bullet = /^\s*[-*+•]\s+(.+)$/.exec(line);
    const number = /^\s*(\d{1,6})[.)]\s+(.+)$/.exec(line);
    const kind = bullet ? 'unordered' : number ? 'ordered' : 'paragraph';
    if (current?.kind !== kind) {
      current = { kind, lines: [], start: number ? Number(number[1]) : undefined };
      blocks.push(current);
    }
    current.lines.push(bullet?.[1] ?? number?.[2] ?? line);
  }
  return blocks;
}
