import js from '@eslint/js';
import globals from 'globals';
export default [
  { ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  { files: ['src/**/*.{js,jsx}'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } }, rules: { 'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_', ignoreRestSiblings: true }], 'no-undef': 'error', 'no-empty': ['error', { allowEmptyCatch: true }] } },
  { files: ['server/**/*.js', 'api/**/*.js', 'scripts/**/*.js', '*.config.js', 'tests/**/*.js'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node, ...globals.browser } }, rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_', ignoreRestSiblings: true }], 'no-empty': ['error', { allowEmptyCatch: true }] } }
];
