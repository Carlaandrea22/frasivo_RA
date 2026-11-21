import type { ComponentPropsWithoutRef } from 'react';

export function Card({ className, ...props }: ComponentPropsWithoutRef<'article'>) {
  return <article className={`lumar-card${className ? ` ${className}` : ''}`} {...props}/>;
}
