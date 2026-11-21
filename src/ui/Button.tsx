import type { ComponentPropsWithoutRef } from 'react';

type Variant = 'primary' | 'secondary' | 'text' | 'sound' | 'answer' | 'nav';
type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: Variant;
  result?: 'correct' | 'incorrect';
};

export function Button({
  variant = 'primary',
  type = 'button',
  result,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`button button--${variant}${className ? ` ${className}` : ''}`}
      data-result={result}
    />
  );
}
