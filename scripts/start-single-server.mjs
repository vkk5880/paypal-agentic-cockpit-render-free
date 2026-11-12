import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const renderPort = process.env.PORT || '10000';
console.log(`[SingleServer] Starting AegisPay Web Cockpit on port ${renderPort}...`);

const nextBinLocal = path.resolve('apps/web-cockpit/node_modules/next/dist/bin/next');
const nextBinRoot = path.resolve('node_modules/next/dist/bin/next');
const nextBin = fs.existsSync(nextBinLocal) ? nextBinLocal : (fs.existsSync(nextBinRoot) ? nextBinRoot : null);

const webEnv = {
  ...process.env,
  PORT: renderPort,
  HOSTNAME: '0.0.0.0',
};

let webProcess;
if (nextBin) {
  webProcess = spawn('node', [nextBin, 'start', '-p', renderPort, '-H', '0.0.0.0'], {
    cwd: path.resolve('apps/web-cockpit'),
    env: webEnv,
    stdio: 'inherit',
  });
} else {
  webProcess = spawn('pnpm', ['--filter', '@aegispay/web-cockpit', 'start'], {
    cwd: path.resolve('apps/web-cockpit'),
    env: webEnv,
    stdio: 'inherit',
  });
}

webProcess.on('exit', (code) => {
  console.log(`[SingleServer] Web Cockpit exited with code ${code}`);
  process.exit(code || 0);
});

process.on('SIGTERM', () => {
  if (webProcess) webProcess.kill('SIGTERM');
  process.exit(0);
});
process.on('SIGINT', () => {
  if (webProcess) webProcess.kill('SIGINT');
  process.exit(0);
});
