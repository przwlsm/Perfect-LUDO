// Links every app in apps/ to its own EAS project and turns on EAS Update,
// once, from your computer (it needs your Expo login, which CI does not have).
//
//   npx eas-cli@latest login
//   node scripts/eas-link-apps.mjs            # every app not linked yet
//   node scripts/eas-link-apps.mjs diya kolam # just these
//
// For each app it runs, inside the app's folder:
//   eas init --force --non-interactive        -> writes extra.eas.projectId into app.json
//   eas update:configure --platform android   -> writes updates.url into app.json
// Then commit the app.json changes. Android only until there is an Apple account.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const only = process.argv.slice(2);
const apps = fs
  .readdirSync(path.join(root, 'apps'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, 'apps', d.name, 'app.json')))
  .map((d) => d.name)
  .filter((name) => only.length === 0 || only.includes(name));

const config = (app) =>
  JSON.parse(fs.readFileSync(path.join(root, 'apps', app, 'app.json'), 'utf8')).expo ?? {};

function eas(app, args) {
  const result = spawnSync('npx', ['eas-cli@latest', ...args], {
    cwd: path.join(root, 'apps', app),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

const summary = [];
for (const app of apps) {
  const before = config(app);
  if (before.extra?.eas?.projectId && before.updates?.url) {
    summary.push(`${app}: already linked`);
    continue;
  }
  console.log(`\n=== ${app} ===`);
  if (!before.extra?.eas?.projectId && !eas(app, ['init', '--force', '--non-interactive'])) {
    summary.push(`${app}: eas init FAILED (are you logged in? npx eas-cli@latest login)`);
    continue;
  }
  if (!eas(app, ['update:configure', '--platform', 'android', '--non-interactive'])) {
    summary.push(`${app}: linked, but update:configure FAILED`);
    continue;
  }
  const after = config(app);
  summary.push(
    after.extra?.eas?.projectId && after.updates?.url
      ? `${app}: linked (${after.extra.eas.projectId})`
      : `${app}: commands ran but app.json is missing projectId or updates.url`,
  );
}

console.log(`\n${summary.join('\n')}\n\nNext: commit the changed app.json files and push.`);
