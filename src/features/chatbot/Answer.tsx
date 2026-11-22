import { Fragment, useState } from 'react';
import { Box, Volume2 } from 'lucide-react';
import { estructuras } from '../../content/anatomy/catalogo';
import { canPronounce, playPronunciation } from '../../shared/audio/pronunciacion';
import { Button } from '../../shared/ui/Button';
import { readEnglishTerms, splitAnswerBlocks } from './format';

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const atlasByTerm = new Map(estructuras.map(item => [normalize(item.terminoEn), item]));

function CompactEnglishTerm({ term }: { term: string }) {
  const [failed, setFailed] = useState(false);
  return <span className="chatbot-term">
    <span lang="en">{term}</span>
    <Button variant="sound" aria-label={`Escuchar ${term}`} disabled={!canPronounce(term)} onClick={() => {
      setFailed(false);
      playPronunciation(term, () => setFailed(true));
    }}><Volume2 size={16} aria-hidden="true"/></Button>
    {failed && <span role="status" className="chatbot-audio-error">No se pudo reproducir la pronunciación. Inténtalo de nuevo.</span>}
  </span>;
}

function AnswerLine({ line, interactive }: { line: string; interactive: boolean }) {
  return line.split(/(\*\*[^*]+\*\*)/).map((piece, index) => {
    const bold = index % 2 === 1;
    const tokens = readEnglishTerms(bold ? piece.slice(2, -2) : piece);
    const children = tokens.map(({ kind, value }, tokenIndex) => {
      if (kind === 'text') return value;
      return interactive ? <CompactEnglishTerm key={tokenIndex} term={value}/>
        : <span key={tokenIndex} className="chatbot-term" lang="en">{value}</span>;
    });
    return bold ? <strong key={index}>{children}</strong> : <Fragment key={index}>{children}</Fragment>;
  });
}

export function Answer({ content, interactive }: { content: string; interactive: boolean }) {
  const related = new Set(readEnglishTerms(content).flatMap(({ kind, value }) => {
    const item = kind === 'term' && atlasByTerm.get(normalize(value));
    return item ? [item] : [];
  }));

  return <div className="chatbot-answer">
    {splitAnswerBlocks(content).map(({ kind, lines, start }, index) => {
      if (kind === 'paragraph') return <p key={index}>{lines.map((line, lineIndex) => <Fragment key={lineIndex}>
        {lineIndex > 0 && <br/>}<AnswerLine line={line} interactive={interactive}/>
      </Fragment>)}</p>;
      const List = kind === 'ordered' ? 'ol' : 'ul';
      return <List key={index} start={start}>{lines.map((line, lineIndex) => <li key={lineIndex}>
        <AnswerLine line={line} interactive={interactive}/>
      </li>)}</List>;
    })}
    {interactive && related.size > 0 && <div className="chatbot-atlas-links">
      {[...related].map(item => <a key={item.id} href={`#explorar/estructura/${item.id}`}>
        <Box size={15} aria-hidden="true"/> Ver en Explorar 3D{related.size > 1 && ` (${item.nombreEs})`}
      </a>)}
    </div>}
  </div>;
}
