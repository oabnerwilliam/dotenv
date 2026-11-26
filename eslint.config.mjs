import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const WEB_FILES = ['apps/web/**/*.{js,jsx,ts,tsx}'];

export default defineConfig(
  globalIgnores([
    '**/dist/**',
    '**/coverage/**',
    'apps/api/src/generated/**',
    'playwright-report/**',
    'test-results/**',
    'docs/**',
  ]),
  js.configs.recommended,
  // Sem as regras com tipos: assim o lint não depende de build.
  tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML é proibido (risco de XSS).',
        },
      ],
    },
  },
  {
    files: WEB_FILES,
    extends: [reactHooks.configs.flat.recommended, jsxA11y.flatConfigs.recommended],
    languageOptions: { globals: globals.browser },
  },
);
