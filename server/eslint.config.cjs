const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['**/dist/**', '**/node_modules/**']
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2023
      }
    },
    plugins: {
      prettier
    },
    rules: {
      ...prettier.configs.recommended.rules,
      ...prettierConfig.rules,
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      curly: ['error', 'all'],
      'arrow-body-style': ['error', 'as-needed'],
      'lines-between-class-members': ['error', 'always']
    }
  }
];
