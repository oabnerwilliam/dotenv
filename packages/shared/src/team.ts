import { z } from 'zod';

const SLUG_MIN = 2;
const SLUG_MAX = 40;
const NAME_MAX = 60;

// Blocos de letras e números separados por um único hífen.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Sugere um slug a partir de um nome. O resultado pode ser vazio ou curto demais: quem usa
// ainda valida com o `slugSchema`.
export function slugify(texto: string): string {
  return (
    texto
      .toLowerCase()
      // NFD separa "ú" em "u" + acento, e a linha seguinte apaga o acento.
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-/, '')
      .slice(0, SLUG_MAX)
      // Depois do corte, porque ele pode terminar em hífen.
      .replace(/-$/, '')
  );
}

export const slugSchema = z
  .string({ error: 'Informe o endereço.' })
  .min(SLUG_MIN, `O endereço precisa ter pelo menos ${SLUG_MIN} caracteres.`)
  .max(SLUG_MAX, `O endereço pode ter no máximo ${SLUG_MAX} caracteres.`)
  .regex(SLUG_PATTERN, 'Use letras minúsculas sem acento, números e hífens, sem hífen nas pontas.');

// Caracteres de controle (`Cc`), de formato (`Cf`: largura zero, inversão de direção) e
// separadores de linha e de parágrafo (`Zl`, `Zp`). Não aparecem na tela, mas permitiriam nomes
// que parecem iguais sem ser, e o `\u0000` o Postgres nem grava. Efeito colateral: emojis
// compostos usam o `U+200D` (de formato) e também são recusados.
const NAME_PATTERN = /^[^\p{Cc}\p{Cf}\p{Zl}\p{Zp}]*$/u;

// Nome de equipe ou de projeto. `subject` completa as frases: "da equipe", "do projeto".
export function nameSchema(subject: string) {
  const required = `Informe o nome ${subject}.`;
  return z
    .string({ error: required })
    .trim()
    .min(1, required)
    .max(NAME_MAX, `O nome ${subject} pode ter no máximo ${NAME_MAX} caracteres.`)
    .regex(NAME_PATTERN, `O nome ${subject} tem caracteres que não são permitidos.`);
}

// Corpo de `POST /team`: a equipe e o primeiro projeto.
export const createTeamSchema = z.object({
  name: nameSchema('da equipe'),
  slug: slugSchema,
  project: z.object(
    { name: nameSchema('do projeto'), slug: slugSchema },
    { error: 'Informe o primeiro projeto.' },
  ),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
