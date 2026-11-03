import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import path from 'node:path';

// Chrome runs under the extractor, so on Windows the whole process tree has to be stopped.
function stop(child) {
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill();
}

// Resolves with null on success, or with the error to report. Never waits longer than timeoutMs.
export function runExtractor(source, { root, timeoutMs }) {
  return new Promise((resolve) => {
    const tail = [];
    // The robot's environment (robot/.env) is passed to the extractor; the extractor's own .env
    // only fills what the robot does not set.
    const cwd = path.join(root, source.workspace);
    const own = path.join(cwd, '.env');
    const env = { ...(existsSync(own) ? parseEnv(readFileSync(own, 'utf8')) : {}), ...process.env, ROBOT_UNATTENDED: '1' };
    const child = spawn(process.execPath, ['src/index.js', '--report', source.report], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => {
      stop(child);
      resolve(`stopped: did not finish within ${Math.round(timeoutMs / 1000)}s`);
    }, timeoutMs);
    const forward = (stream, out) =>
      stream.on('data', (chunk) => {
        out.write(chunk);
        tail.push(...chunk.toString().split('\n').filter(Boolean));
        tail.splice(0, Math.max(0, tail.length - 20));
      });
    forward(child.stdout, process.stdout);
    forward(child.stderr, process.stderr);
    child.on('close', (code) => {
      clearTimeout(timer);
      const error = tail.filter((l) => /ERROR/.test(l)).at(-1) ?? tail.at(-1) ?? `exit code ${code}`;
      resolve(code === 0 ? null : error.replace(/^\[[\d:]+\]\s*/, ''));
    });
  });
}
