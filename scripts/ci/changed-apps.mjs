// Prints `apps=<JSON array>` for $GITHUB_OUTPUT: the app folders under apps/
// that a push touched, so the deploy workflow updates only those apps.
//
//   node scripts/ci/changed-apps.mjs <before-sha> <after-sha> [app|all]
//
// - A named app (workflow_dispatch) deploys just that app; `all` deploys every app.
// - A change inside apps/<name>/ selects that app.
// - A change inside packages/<pkg>/ selects every app that depends on <pkg>.
// - Root files every app builds from (package.json, package-lock.json, this
//   script, the deploy workflow) select every app.
// - An unknown or empty "before" (first push of a branch) selects every app.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [before = '', after = 'HEAD', requested = ''] = process.argv.slice(2);
const root = process.cwd();

const apps = fs
  .readdirSync(path.join(root, 'apps'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, 'apps', d.name, 'app.json')))
  .map((d) => d.name)
  .sort();

function emit(list) {
  const unique = [...new Set(list)].filter((a) => apps.includes(a)).sort();
  console.log(`apps=${JSON.stringify(unique)}`);
}

if (requested && requested !== 'all') {
  emit([requested]);
  process.exit(0);
}
if (requested === 'all' || !before || /^0+$/.test(before)) {
  emit(apps);
  process.exit(0);
}

let files;
try {
  files = execFileSync('git', ['diff', '--name-only', `${before}..${after}`], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
} catch {
  // The old commit is not in this clone (a force-push): be safe and deploy everything.
  emit(apps);
  process.exit(0);
}

const everyApp = new Set([
  'package.json',
  'package-lock.json',
  'scripts/ci/changed-apps.mjs',
  '.github/workflows/deploy.yml',
]);

/** Package folder → the apps whose package.json depends on that package. */
function dependents(pkgFolder) {
  const manifest = path.join(root, 'packages', pkgFolder, 'package.json');
  if (!fs.existsSync(manifest)) return [];
  const name = JSON.parse(fs.readFileSync(manifest, 'utf8')).name;
  return apps.filter((app) => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps', app, 'package.json'), 'utf8'));
    return Boolean(pkg.dependencies?.[name] || pkg.devDependencies?.[name]);
  });
}

const picked = [];
for (const file of files) {
  if (everyApp.has(file)) {
    emit(apps);
    process.exit(0);
  }
  const [top, name] = file.split('/');
  if (top === 'apps' && name) picked.push(name);
  if (top === 'packages' && name) picked.push(...dependents(name));
}
emit(picked);
