import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { waitForManualSignIn } from '@sales-automation/shared/browser';
import { runExtractor } from '../src/extractor.js';

async function run(script, timeoutMs = 10_000) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'robot-extractor-'));
  try {
    await mkdir(path.join(root, 'fake', 'src'), { recursive: true });
    await writeFile(path.join(root, 'fake', 'src', 'index.js'), script);
    return await runExtractor({ workspace: 'fake', report: 'r' }, { root, timeoutMs });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('an extractor that never ends is stopped and reported', async () => {
  const started = Date.now();
  const error = await run('setInterval(() => {}, 1000);', 500);
  assert.match(error, /did not finish within/);
  assert.ok(Date.now() - started < 5000);
});

test('an extractor that fails reports its error line', async () => {
  const error = await run("console.error('[10:00:00] ERROR Sign-in failed'); process.exit(1);");
  assert.equal(error, 'ERROR Sign-in failed');
});

test('extractors know that nobody is at the browser window', async () => {
  assert.equal(await run("process.exit(process.env.ROBOT_UNATTENDED === '1' ? 0 : 1);"), null);
});

test('without anyone at the window a failed sign-in is an error at once', async () => {
  const page = { url: () => 'https://example.test/login' };
  await assert.rejects(waitForManualSignIn(page, async () => false, 0), /nobody is at the browser window.*example\.test\/login/);
});
