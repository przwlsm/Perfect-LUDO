// Links every app in apps/ to its own EAS project and turns on EAS Update,
// once, from your computer (it needs your Expo login, which CI does not have).
//
//   npx eas-cli@latest login
//   node scripts/eas-link-apps.mjs                      # every app not linked yet
//   node scripts/eas-link-apps.mjs diya kolam           # just these
//   node scripts/eas-link-apps.mjs --account=my-org     # projects owned by an Expo organisation
//
// For each app it runs, inside the app's folder:
//   eas init --force --non-interactive        -> creates/links the project
//   eas update:configure --platform android   -> turns on EAS Update
// EAS writes the whole resolved config back into app.json (plugin-added
// permissions, router defaults), so afterwards the hand-written app.json is
// restored with only the owner, project id and update URL added.
// Then commit the app.json changes. Android only until there is an Apple account.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const account = args.find((a) => a.startsWith('--account='))?.slice('--account='.length);
const only = args.filter((a) => !a.startsWith('--'));
const apps = fs
  .readdirSync(path.join(root, 'apps'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, 'apps', d.name, 'app.json')))
  .map((d) => d.name)
  .filter((name) => only.length === 0 || only.includes(name));

const appJson = (app) => path.join(root, 'apps', app, 'app.json');
/** Ludo builds updates.url from the project id in app.config.ts. */
const derivesUrl = (app) => {
  const file = path.join(root, 'apps', app, 'app.config.ts');
  return fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes('u.expo.dev');
};
const config = (app) => JSON.parse(fs.readFileSync(appJson(app), 'utf8')).expo ?? {};

function eas(app, easArgs) {
  const result = spawnSync('npx', ['eas-cli@latest', ...easArgs], {
    cwd: path.join(root, 'apps', app),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

/** Restores the hand-written app.json, adding only what linking is for. */
function keepOnlyLinkFields(app, original) {
  const linked = config(app);
  const next = JSON.parse(original);
  if (linked.owner) next.expo.owner = linked.owner;
  if (linked.extra?.eas?.projectId) {
    next.expo.extra = {
      ...(next.expo.extra ?? {}),
      eas: { projectId: linked.extra.eas.projectId },
    };
  }
  if (linked.updates?.url)
    next.expo.updates = { ...(next.expo.updates ?? {}), url: linked.updates.url };
  fs.writeFileSync(appJson(app), `${JSON.stringify(next, null, 2)}\n`);
}

const summary = [];
for (const app of apps) {
  const before = config(app);
  if (before.extra?.eas?.projectId && (before.updates?.url || derivesUrl(app))) {
    summary.push(`${app}: already linked`);
    continue;
  }
  console.log(`\n=== ${app} ===`);
  const original = fs.readFileSync(appJson(app), 'utf8');
  const initArgs = [
    'init',
    '--force',
    '--non-interactive',
    ...(account ? ['--account', account] : []),
  ];
  if (!before.extra?.eas?.projectId && !eas(app, initArgs)) {
    keepOnlyLinkFields(app, original);
    summary.push(`${app}: eas init FAILED (are you logged in? npx eas-cli@latest login)`);
    continue;
  }
  const configured = eas(app, ['update:configure', '--platform', 'android', '--non-interactive']);
  keepOnlyLinkFields(app, original);
  if (!configured) {
    summary.push(`${app}: linked, but update:configure FAILED`);
    continue;
  }
  const after = config(app);
  summary.push(
    after.extra?.eas?.projectId && (after.updates?.url || derivesUrl(app))
      ? `${app}: linked to ${after.owner ?? 'your account'} (${after.extra.eas.projectId})`
      : `${app}: commands ran but app.json is missing projectId or updates.url`,
  );
}

console.log(`\n${summary.join('\n')}\n\nNext: commit the changed app.json files and push.`);
