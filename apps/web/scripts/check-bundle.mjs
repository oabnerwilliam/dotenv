// Confere o resultado do `vite build`. Roda dentro do `pnpm build`, então o CI também o roda.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist', import.meta.url));

// A CSP da publicação só aceita fontes do próprio app: nada embutido nem do Google.
// O título da vitrine denuncia que a página de desenvolvimento entrou no build.
const FORBIDDEN = ['data:font', 'fonts.googleapis', 'Vitrine de componentes'];

function fail(message) {
  console.error(`check-bundle: ${message}`);
  process.exit(1);
}

if (!existsSync(dist)) fail('a pasta dist não existe. Rode o `vite build` antes.');

const files = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath, entry.name));

if (!files.some((file) => file.endsWith('.woff2'))) fail('nenhum arquivo .woff2 foi emitido.');

const problems = files.flatMap((file) => {
  const content = readFileSync(file, 'utf8');
  return FORBIDDEN.filter((text) => content.includes(text)).map(
    (text) => `${relative(dist, file)} contém "${text}"`,
  );
});

if (problems.length > 0) fail(problems.join('\n  '));

console.log(`check-bundle: ${files.length} arquivos conferidos, sem problemas.`);
