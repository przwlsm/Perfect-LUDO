// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const boundaries = require('eslint-plugin-boundaries');
const prettierConfig = require('eslint-config-prettier');

// Layer boundaries mirror the Clean Architecture folders under src/.
// This is what makes "SOLID" an enforced rule, not just a convention:
// domain must never import application/infrastructure/presentation/app,
// and the composition root (config) is the only place allowed to see
// concrete infrastructure implementations.
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
              allow: {
                to: { element: { types: { anyOf: ['domain', 'application'] } } },
              },
            },
            {
              from: { element: { type: 'infrastructure' } },
              allow: {
                to: { element: { types: { anyOf: ['domain', 'infrastructure'] } } },
              },
            },
            {
              from: { element: { type: 'presentation' } },
              allow: {
                // `config` is allowed here only because it exports
                // already-wired instances typed by their domain interface
                // (e.g. `randomProvider: IRandomProvider`) — presentation
                // never imports a concrete infrastructure class directly.
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
    // react-three-fiber renders 3D primitives (mesh, geometry, material...)
    // as JSX host elements with their own prop set — eslint-plugin-react's
    // no-unknown-property rule only knows DOM/RN props, so it false-positives
    // on every r3f-specific one. This is the fix documented by r3f itself.
    files: ['src/presentation/board/Board3D.tsx', 'src/presentation/board/AnimatedPiece3D.tsx'],
    rules: {
      'react/no-unknown-property': [
        'error',
        {
          ignore: [
            'args',
            'position',
            'rotation',
            'intensity',
            'transparent',
            'emissive',
            'emissiveIntensity',
            'depthWrite',
            'roughness',
            'metalness',
          ],
        },
      ],
    },
  },
  {
    // Build-time tooling (e.g. the sound-effect generator) runs in Node, not
    // in the app runtime, so it gets Node globals rather than RN/browser ones.
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: { globals: require('globals').node },
  },
  {
    // .test-browser/.test-artifacts hold a Playwright/Chromium profile
    // (including installed extension bundles) used by local E2E scripts —
    // vendored, minified, not ours to lint. Already excluded from git and
    // Prettier; this closes the same gap for ESLint.
    ignores: ['dist/*', '.test-browser/**', '.test-artifacts/**'],
  },
]);
