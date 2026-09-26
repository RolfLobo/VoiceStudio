import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const APP_NAME = 'VoiceStudio';
const here = dirname(fileURLToPath(import.meta.url));
const electronRoot = resolve(here, '..');
const repoRoot = resolve(electronRoot, '..');
const require = createRequire(import.meta.url);

export function createMacDevBundlePlan({
  electronExecutable,
  electronVersion,
  appVersion,
  architecture = process.arch,
  cacheRoot = join(tmpdir(), 'voicestudio-electron-dev'),
}) {
  const sourceBundle = resolve(dirname(electronExecutable), '../..');
  const cacheKey = `${electronVersion}-${appVersion}-${architecture}`;
  const destinationRoot = join(cacheRoot, cacheKey);
  const destinationBundle = join(destinationRoot, `${APP_NAME}.app`);

  return {
    sourceBundle,
    destinationRoot,
    destinationBundle,
    // Keep Electron's executable name so electron-vite continues to detect a
    // development launch. macOS takes the visible name from the app bundle.
    destinationExecutable: join(
      destinationBundle,
      'Contents',
      'MacOS',
      basename(electronExecutable),
    ),
    infoPlist: join(destinationBundle, 'Contents', 'Info.plist'),
    resourcesDirectory: join(destinationBundle, 'Contents', 'Resources'),
    manifest: join(destinationRoot, 'brand-manifest.json'),
  };
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`;
    throw new Error(`${command} failed: ${detail}`);
  }
}

function replacePlistValue(infoPlist, key, value) {
  run('plutil', ['-replace', key, '-string', value, infoPlist]);
}

export function prepareMacDevElectron({
  electronExecutable,
  electronVersion,
  appVersion,
  iconPath,
  cacheRoot = join(tmpdir(), 'voicestudio-electron-dev'),
}) {
  const plan = createMacDevBundlePlan({
    electronExecutable,
    electronVersion,
    appVersion,
    cacheRoot,
  });
  const expectedManifest = JSON.stringify({
    electronVersion,
    appVersion,
    architecture: process.arch,
    iconSize: statSync(iconPath).size,
    iconModified: statSync(iconPath).mtimeMs,
  });

  if (
    existsSync(plan.destinationExecutable) &&
    existsSync(plan.manifest) &&
    readFileSync(plan.manifest, 'utf8') === expectedManifest
  ) {
    return plan.destinationExecutable;
  }

  mkdirSync(cacheRoot, { recursive: true });
  const stagingRoot = join(cacheRoot, `.staging-${process.pid}`);
  const stagingBundle = join(stagingRoot, `${APP_NAME}.app`);
  rmSync(stagingRoot, { recursive: true, force: true });
  mkdirSync(stagingRoot);

  try {
    // APFS clone-copy keeps this fast and avoids duplicating Electron's full
    // framework bundle. The copied bundle is then re-signed after branding.
    run('cp', ['-cR', plan.sourceBundle, stagingBundle]);
    const infoPlist = join(stagingBundle, 'Contents', 'Info.plist');
    replacePlistValue(infoPlist, 'CFBundleDisplayName', APP_NAME);
    replacePlistValue(infoPlist, 'CFBundleName', APP_NAME);
    replacePlistValue(infoPlist, 'CFBundleIdentifier', 'com.voicestudio.desktop.dev');
    replacePlistValue(infoPlist, 'CFBundleIconFile', `${APP_NAME}.icns`);
    replacePlistValue(infoPlist, 'CFBundleShortVersionString', appVersion);
    replacePlistValue(infoPlist, 'CFBundleVersion', appVersion);
    copyFileSync(iconPath, join(stagingBundle, 'Contents', 'Resources', `${APP_NAME}.icns`));
    run('codesign', ['--force', '--deep', '--sign', '-', stagingBundle]);

    rmSync(plan.destinationRoot, { recursive: true, force: true });
    renameSync(stagingRoot, plan.destinationRoot);
    writeFileSync(plan.manifest, expectedManifest);
  } finally {
    rmSync(stagingRoot, { recursive: true, force: true });
  }

  return plan.destinationExecutable;
}

function launchElectronVite() {
  const electronVitePackage = require.resolve('electron-vite/package.json');
  const { bin } = JSON.parse(readFileSync(electronVitePackage, 'utf8'));
  const electronViteBin = resolve(dirname(electronVitePackage), bin['electron-vite']);
  const env = { ...process.env };

  if (process.platform === 'darwin') {
    const electronPackage = require.resolve('electron/package.json');
    const { version: electronVersion } = JSON.parse(readFileSync(electronPackage, 'utf8'));
    const { version: appVersion } = JSON.parse(
      readFileSync(join(repoRoot, 'frontend', 'package.json'), 'utf8'),
    );
    env.ELECTRON_EXEC_PATH = prepareMacDevElectron({
      electronExecutable: require('electron'),
      electronVersion,
      appVersion,
      iconPath: join(repoRoot, 'frontend', 'src-tauri', 'icons', 'icon.icns'),
      cacheRoot: join(tmpdir(), 'voicestudio-electron-dev'),
    });
  }

  const child = spawn(process.execPath, [electronViteBin, 'dev', ...process.argv.slice(2)], {
    cwd: electronRoot,
    env,
    stdio: 'inherit',
  });
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exitCode = code ?? 1;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  launchElectronVite();
}
