// The Deploy and Build APK workflows offer the apps as a dropdown, which is
// a fixed list in their YAML. This fails CI when that list and the folders
// in apps/ drift apart, so a new app can never be missing from the dropdown.
//
//   node scripts/ci/check-app-lists.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const apps = fs
  .readdirSync(path.join(root, 'apps'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, 'apps', d.name, 'package.json')))
  .map((d) => d.name)
  .sort();

let failed = false;
for (const file of ['deploy.yml', 'build-apk.yml']) {
  const yml = fs.readFileSync(path.join(root, '.github', 'workflows', file), 'utf8');
  // The options block of the `app` input: "- name" lines up to the next key.
  const block = yml.match(/\n {6}app:\n(?: {8}.*\n)*? {8}options:\n((?: {10}- .*\n)+)/);
  if (!block) {
    console.error(`${file}: no dropdown of apps found under workflow_dispatch.inputs.app`);
    failed = true;
    continue;
  }
  const listed = block[1]
    .split('\n')
    .map((l) => l.replace(/^\s*-\s*/, '').trim())
    .filter((l) => l && l !== 'all')
    .sort();
  const missing = apps.filter((a) => !listed.includes(a));
  const extra = listed.filter((a) => !apps.includes(a));
  if (missing.length || extra.length) {
    failed = true;
    if (missing.length) console.error(`${file}: add to the app dropdown: ${missing.join(', ')}`);
    if (extra.length) console.error(`${file}: no such app folder, remove: ${extra.join(', ')}`);
  } else {
    console.log(`${file}: the dropdown lists every app (${apps.length}).`);
  }
}
process.exit(failed ? 1 : 0);
