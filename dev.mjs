import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const children = [];

function start(label, cwdRel, args) {
  const cwd = path.resolve(__dirname, cwdRel);
  console.log(`[${label}] Starting in ${cwd}...`);
  const child = spawn(npmCmd, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      FORCE_COLOR: '1',
    },
  });

  child.on('exit', (code, signal) => {
    const exitCode = typeof code === 'number' ? code : 0;
    if (signal) {
      process.exit(0);
    }
    if (exitCode !== 0) {
      console.error(`[${label}] exited with code ${exitCode}`);
      process.exit(exitCode);
    }
  });

  children.push(child);
  return child;
}

function shutdown() {
  for (const child of children) {
    try {
      child.kill('SIGINT');
    } catch {
      // ignore
    }
  }
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});

start('backend', './backend', ['run', 'dev']);
start('frontend', './frontend', ['run', 'dev']);
