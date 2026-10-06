// ESLint flat config for the educational site template.
//
// Scope: product source only. The Pi harness files and their `node --test`
// suites are a different toolchain and are excluded deliberately.

import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import astro from 'eslint-plugin-astro';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      '.artifacts/**',
      '.pi/**',
      'tests/**',
      // Content is MDX prose with JSX components. ESLint's flat config has no
      // MDX parser wired up, and the content is already validated far more
      // strictly by `astro check` (type-aware) and scripts/validate-content.mjs.
      'src/content/**',
      // The Pi harness and its eval fixtures are a different toolchain.
      'evals/**',
      'scripts/ai-pr.mjs',
      'scripts/run-workflow-evals.mjs',
      'scripts/verify-affected.mjs',
      'scripts/verify-package-integrity.mjs',
      'scripts/pi-provider.mjs',
      'scripts/pi-extension-compat.mjs',
      'scripts/lib/**',
      'scripts/verify.sh',
      'scripts/pi-doctor.sh',
      'scripts/ci-install.sh',
      'scripts/pi-sandbox.sh',
    ],
  },

  js.configs.recommended,

  {
    // Build and QA scripts run in Node, but the QA scripts serialise functions
    // into the page, so browser globals legitimately appear in them.
    files: ['*.mjs', '*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { '@typescript-eslint': tseslint, react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...react.configs.flat.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Astro/Vite handle DOM globals; `any` is still discouraged.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  {
    files: ['src/content/**/*.mdx'],
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      // Content is authored prose and JSX props, not application code.
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  ...astro.configs.recommended,
  {
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: { parser: tsparser },
      // Astro's inline <script> blocks run in the browser.
      globals: { ...globals.browser },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // A catch block that intentionally swallows an error still needs a note.
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },

  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];