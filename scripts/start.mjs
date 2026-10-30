import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
let activeChild;
let interrupted = false;

function stopChild() {
  if (!activeChild?.pid || activeChild.exitCode !== null || activeChild.signalCode !== null) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill.exe', ['/pid', String(activeChild.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    killer.on('error', () => activeChild?.kill());
  } else activeChild.kill('SIGTERM');
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    interrupted = true;
    stopChild();
  });
}

function launch(command, args, quiet = false) {
  if (interrupted) throw new Error('Startup canceled.');
  const child = spawn(command, args, {
    cwd: root,
    stdio: quiet ? 'ignore' : 'inherit',
    windowsHide: true,
  });
  activeChild = child;
  const done = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (activeChild === child) activeChild = undefined;
      if (code === 0) resolve();
      else
        reject(
          new Error(`${path.basename(command)} ${args.join(' ')} failed (${signal || code}).`)
        );
    });
  });
  return { child, done };
}

function npm(args, quiet = false) {
  // npm.cmd needs cmd.exe on Windows; all arguments here are fixed by this script.
  return process.platform === 'win32'
    ? launch(
        process.env.ComSpec || 'cmd.exe',
        ['/d', '/s', '/c', `npm.cmd ${args.join(' ')}`],
        quiet
      ).done
    : launch('npm', args, quiet).done;
}

async function exists(filename) {
  try {
    await fs.access(filename);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function availablePort(preferred) {
  for (let port = preferred; port <= Math.min(preferred + 19, 65535); port++) {
    try {
      await new Promise((resolve, reject) => {
        const probe = net.createServer();
        probe.once('error', reject);
        probe.listen(port, '127.0.0.1', () =>
          probe.close((error) => (error ? reject(error) : resolve()))
        );
      });
      if (port !== preferred)
        console.log(`Port ${preferred} is in use. Using port ${port} for this session.`);
      return port;
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
    }
  }
  throw new Error(
    `No free port near ${preferred}. Stop an old server with Ctrl+C or change PORT in .env.`
  );
}

async function waitUntilReady(url, signal) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    signal.throwIfAborted();
    let health;
    try {
      health = await fetch(`${url}/api/health`, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(1_000)]),
      });
    } catch {
      await delay(300, undefined, { signal });
      continue;
    }
    if (!health.ok) throw new Error(`Health check failed: HTTP ${health.status}.`);
    // Read the workbook before opening the browser, so the data is ready too.
    const response = await fetch(`${url}/api/bookings?source=original&pageSize=1`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(120_000)]),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || `Data check failed: HTTP ${response.status}.`);
    if (!result.total)
      throw new Error('No original bookings found. Run npm.cmd run import:data and try again.');
    return result.total;
  }
  throw new Error('The server did not become ready within 120 seconds.');
}

function openBrowser(url) {
  // The URL is constructed from a validated numeric port, never from shell input.
  const command =
    process.platform === 'win32' ? 'cmd.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', `start "" "${url}"`] : [url];
  const browser = spawn(command, args, { stdio: 'ignore', windowsHide: true });
  browser.on('error', () => console.log(`Open your browser at ${url}`));
  browser.unref();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: .\\start.cmd [--no-open]  OR  npm.cmd run ready -- [--no-open]');
    console.log(
      'Prepares dependencies, configuration and data, builds, then serves the app. Ctrl+C stops it.'
    );
    return;
  }
  if (args.some((arg) => arg !== '--no-open'))
    throw new Error('Unknown option. Use --help or --no-open.');
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 12))
    throw new Error('Install Node.js 22.12 or newer, then try again.');

  console.log('\nHotel Booking Analytics - one-command startup\n');
  try {
    await fs.copyFile('.env.example', '.env', constants.COPYFILE_EXCL);
    console.log('[1/5] Created .env from .env.example.');
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log('[1/5] Using existing .env.');
  }

  console.log('[2/5] Checking dependencies...');
  try {
    await npm(['ls', '--depth=0', '--include=dev'], true);
  } catch (error) {
    if (interrupted) throw error;
    console.log('Installing dependencies (internet access may be needed)...');
    await npm(['ci', '--include=dev', '--no-audit', '--no-fund']);
  }
  const { config: loadEnv } = await import('dotenv');
  loadEnv({ path: path.join(root, '.env'), quiet: true });
  const preferredPort = Number(process.env.PORT || 3001);
  if (!Number.isInteger(preferredPort) || preferredPort < 1 || preferredPort > 65535)
    throw new Error('PORT in .env must be an integer from 1 to 65535.');
  const port = await availablePort(preferredPort);
  process.env.PORT = String(port);

  console.log('[3/5] Preparing booking data...');
  const rawFile = path.resolve(
    process.env.RAW_DATA_PATH || path.join(process.env.DATA_DIR || 'data', 'raw_data.xlsx')
  );
  if (await exists(rawFile)) console.log('Using existing workbook.');
  else {
    const dataset = path.resolve(process.env.DATASET_PATH || 'dataset/hotel_bookings.csv');
    if (!(await exists(dataset))) {
      const defaultDataset = path.join(root, 'dataset', 'hotel_bookings.csv');
      if (dataset !== defaultDataset || process.platform !== 'win32')
        throw new Error(
          `Dataset missing: ${dataset}. Place hotel_bookings.csv at that path and try again.`
        );
      console.log('Downloading the original Hotel Booking Demand dataset...');
      await launch('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        path.join(root, 'scripts', 'download-dataset.ps1'),
      ]).done;
    }
    console.log('Importing the dataset for the first run. Please wait...');
    await npm(['run', 'import:data']);
  }

  console.log('[4/5] Building the website and API...');
  await npm(['run', 'build']);

  console.log('[5/5] Starting the server and checking the data...');
  const url = `http://127.0.0.1:${port}`;
  const server = launch(process.execPath, ['dist/server/server.js']);
  const controller = new AbortController();
  let total;
  try {
    total = await Promise.race([
      waitUntilReady(url, controller.signal),
      server.done.then(() => {
        throw new Error('The server stopped before it became ready.');
      }),
    ]);
  } finally {
    controller.abort();
  }
  console.log(`\nReady: ${url} (${total.toLocaleString('en-US')} original bookings)`);
  console.log('Keep this terminal open. Press Ctrl+C to stop.\n');
  if (!args.includes('--no-open')) openBrowser(url);
  await server.done;
}

main().catch((error) => {
  stopChild();
  if (!interrupted) console.error(`\nStartup failed: ${error.message}`);
  process.exitCode = interrupted ? 130 : 1;
});
