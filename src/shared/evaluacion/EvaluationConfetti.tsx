import type { CSSProperties } from 'react';
import './evaluacion.css';

const colors = ['#2f9670', '#efb441', '#ed836d', '#698be0', '#b873b5'];

const pieces = Array.from({ length: 28 }, (_, index) => ({
  '--confetti-x': `${4 + (index * 37) % 92}%`,
  '--confetti-drift': `${(index * 19) % 140 - 70}px`,
  '--confetti-spin': `${index % 2 === 0 ? 1 : -1}turn`,
  '--confetti-delay': `${(index * 53) % 360}ms`,
  '--confetti-duration': `${1550 + (index * 41) % 650}ms`,
  '--confetti-color': colors[index % colors.length],
} as CSSProperties));

export function EvaluationConfetti({ className = '' }: { className?: string }) {
  return <div className={`evaluation-confetti ${className}`.trim()} aria-hidden="true">
    {pieces.map((style, index) => <span key={index} style={style}/>)}
  </div>;
}
