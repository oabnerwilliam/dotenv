import type { ComponentProps } from 'react';
import { buttonClass, type ButtonStyle } from './buttonClass';

type ButtonProps = ComponentProps<'button'> &
  Omit<ButtonStyle, 'className'> & {
    /** Glifo `>` das ações principais. */
    prompt?: boolean;
  };

export function Button({
  variant,
  size,
  prompt = false,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass({ variant, size, className })} {...props}>
      {prompt && <Prompt />}
      {children}
    </button>
  );
}

/** O `>` das ações principais: enfeite, fora do nome do botão ou do link. */
export function Prompt() {
  return (
    <span aria-hidden="true" className="font-mono">
      &gt;
    </span>
  );
}
