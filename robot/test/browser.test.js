import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { launchBrowser } from '@sales-automation/shared/browser';

test('browser mode can be overridden for unattended hosts without changing Windows defaults', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'browser-mode-'));
  const previous = process.env.CHROME_HEADLESS;
  let launched;
  mock.method(puppeteer, 'launch', async options => { launched = options; return {}; });
  t.after(async () => {
    mock.restoreAll();
    if (previous === undefined) delete process.env.CHROME_HEADLESS;
    else process.env.CHROME_HEADLESS = previous;
    await rm(root, { recursive: true, force: true });
  });
  const config = { executablePath: 'test-chrome', userDataDir: 'profile', headless: false, timeoutMs: 1000, manualSignInTimeoutMs: 5000 };
  process.env.CHROME_HEADLESS = 'true';
  await launchBrowser(config, root);
  assert.equal(launched.headless, true);
  process.env.CHROME_HEADLESS = 'false';
  await launchBrowser({ ...config, headless: true }, root);
  assert.equal(launched.headless, false);
  delete process.env.CHROME_HEADLESS;
  await launchBrowser(config, root);
  assert.equal(launched.headless, false);
  process.env.CHROME_HEADLESS = 'invalid';
  await assert.rejects(launchBrowser(config, root), /CHROME_HEADLESS/);
});
