import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import unusedImports from 'eslint-plugin-unused-imports';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['node_modules', 'dist'],
  },

  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,

  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    plugins: {
      'unused-imports': unusedImports,
    },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',

      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      'no-unused-expressions': 'error',
      'prefer-const': 'error',
      'no-undef': 'off',
    },
  },
];

// unused import auto remove command: pnpm eslint --ext .js,.ts,.jsx,.tsx . --fix OR pnpm eslint . --fix
// format all file using prettier: pnpm format
// all package latest install: pnpm add -D @eslint/js@latest eslint@latest globals@latest typescript-eslint@latest
// to check unused packages: npx depcheck OR npx knip OR npx npm-check
