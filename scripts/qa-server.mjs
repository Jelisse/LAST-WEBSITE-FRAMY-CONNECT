import { spawn } from 'node:child_process';
const child = spawn(
  process.execPath,
  ['node_modules/vinext/dist/cli.js', 'dev', '--port', '3017'],
  {
    stdio: 'inherit',
    env: { ...process.env, FRAMY_QA: 'true', FRAMY_STAGING: 'false' },
  },
);
child.on('exit', (code) => process.exit(code ?? 1));
