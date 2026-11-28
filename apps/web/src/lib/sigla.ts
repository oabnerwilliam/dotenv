// Um "grafema" é o que a pessoa vê como um caractere: um emoji ou uma letra com o acento escrito
// em separado ocupam várias posições no texto, e cortar no meio quebraria o desenho.
const segmenter = new Intl.Segmenter('pt-BR');

function graphemes(word: string, count: number): string {
  return Array.from(segmenter.segment(word), (part) => part.segment)
    .slice(0, count)
    .join('');
}

/**
 * As duas letras de uma equipe ou projeto: de uma palavra só, as duas primeiras; de várias, as
 * iniciais da primeira e da última. Na caixa original: as maiúsculas são só estilo (`uppercase`).
 */
export function sigla(name: string): string {
  const [first = '', ...others] = name.trim().split(/\s+/);
  const last = others.at(-1);
  return last === undefined ? graphemes(first, 2) : graphemes(first, 1) + graphemes(last, 1);
}
