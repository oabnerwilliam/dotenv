// Para onde voltar depois do login. Fica no `sessionStorage` porque a ida ao Google recarrega
// a página, e a URL de retorno é uma lista fechada.
const STORAGE_KEY = 'env.destino';
const BASE = 'http://interno.invalid';
// Telas de login: voltar para elas prenderia a pessoa.
const LOGIN_PATHS = /^\/(login|auth\/callback)(\/|$)/;

/** Aceita só caminho do próprio app; qualquer outra coisa vira `/`. */
export function safeReturnPath(value: string | null | undefined): string {
  // Começa com uma barra só. Barra invertida e caracteres de controle ficam de fora porque o
  // navegador os converte ou apaga, e "/\site" viraria um endereço externo.
  if (!value || !value.startsWith('/') || /[\\\p{Cc}]/u.test(value)) return '/';
  const url = new URL(value, BASE);
  // Conferido depois de resolver os pontos: "/..//site" vira "//site".
  if (url.origin !== BASE || url.pathname.startsWith('//')) return '/';
  if (LOGIN_PATHS.test(url.pathname)) return '/';
  return `${url.pathname}${url.search}${url.hash}`;
}

// O navegador pode bloquear o armazenamento. Perder o destino não pode quebrar o login.
export function saveReturnPath(path: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, safeReturnPath(path));
  } catch {
    // Sem destino guardado, o login leva a "/".
  }
}

export function readReturnPath(): string {
  try {
    return safeReturnPath(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return '/';
  }
}

export function clearReturnPath(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada guardado para apagar.
  }
}
