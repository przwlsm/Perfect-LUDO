// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const boundaries = require('eslint-plugin-boundaries');
const prettierConfig = require('eslint-config-prettier');

// Layer boundaries mirror the Clean Architecture folders under src/, the
// same ones Ludo uses. They make the dependency rule something ESLint
// enforces rather than a convention: domain imports nothing from the outer
// layers, and only the composition root (config) sees concrete
// infrastructure classes. The rules engine (baghchal-engine) is an external
// package every layer may use, like any other library.
module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain/**' },
        { type: 'application', pattern: 'src/application/**' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**' },
        { type: 'presentation', pattern: 'src/presentation/**' },
        { type: 'config', pattern: 'src/config/**' },
        { type: 'app', pattern: 'src/app/**' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'domain' } },
              allow: { to: { element: { type: 'domain' } } },
            },
            {
              from: { element: { type: 'application' } },
              allow: { to: { element: { types: { anyOf: ['domain', 'application'] } } } },
            },
            {
              from: { element: { type: 'infrastructure' } },
              allow: { to: { element: { types: { anyOf: ['domain', 'infrastructure'] } } } },
            },
            {
              from: { element: { type: 'presentation' } },
              // `config` only exports already-wired instances typed by their
              // domain interface; presentation never sees a concrete class.
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['domain', 'application', 'presentation', 'config'] },
                  },
                },
              },
            },
            {
              from: { element: { type: 'config' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['domain', 'application', 'infrastructure', 'config'] },
                  },
                },
              },
            },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['presentation', 'application', 'domain', 'config'] },
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },
  {
    // Build-time tooling (the sound-effect generator) runs in Node, not in
    // the app runtime, so it gets Node globals rather than RN/browser ones.
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: { globals: require('globals').node },
  },
  {
    ignores: ['dist/*', 'supabase/functions/**'],
  },
]);
