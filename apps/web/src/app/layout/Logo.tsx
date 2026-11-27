/** Marca do app. O cursor é enfeite: fica fora do que o leitor de tela fala. */
export function Logo() {
  return (
    <span className="font-mono text-[21px] font-bold">
      .env
      <span aria-hidden="true" className="cursor-blink text-accent">
        _
      </span>
    </span>
  );
}
