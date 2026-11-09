import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

// A persistent profile (userDataDir, relative to rootDir) keeps sessions between runs,
// so sign-ins and verification codes are only needed when a site asks again.
export async function launchBrowser(browserConfig, rootDir) {
  const mode = process.env.CHROME_HEADLESS;
  if (mode !== undefined && mode !== 'true' && mode !== 'false') throw new Error('CHROME_HEADLESS must be true or false');
  const userDataDir = path.resolve(rootDir, browserConfig.userDataDir);
  await markCleanExit(userDataDir);
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || browserConfig.executablePath,
    headless: mode === undefined ? browserConfig.headless : mode === 'true',
    userDataDir,
    defaultViewport: browserConfig.viewport,
    args: ['--lang=fr-FR', '--hide-crash-restore-bubble', '--no-first-run', '--no-default-browser-check'],
  });
  browser.defaultTimeoutMs = browserConfig.timeoutMs;
  // Under the robot nobody is at the window: a failed sign-in must be reported, not waited on.
  browser.manualSignInTimeoutMs = process.env.ROBOT_UNATTENDED ? 0 : browserConfig.manualSignInTimeoutMs;
  return browser;
}

// Puppeteer stops Chrome before it records a clean shutdown, so the next launch would show
// "Chrome didn't shut down correctly". Resetting the flag keeps the profile (and session) quiet.
async function markCleanExit(userDataDir) {
  const file = path.join(userDataDir, 'Default', 'Preferences');
  const raw = await readFile(file, 'utf8').catch(() => null);
  if (!raw) return;
  const prefs = JSON.parse(raw);
  if (prefs.profile?.exit_type === 'Normal') return;
  prefs.profile = { ...prefs.profile, exit_type: 'Normal', exited_cleanly: true };
  await writeFile(file, JSON.stringify(prefs));
}

// Closes tabs first so Chrome saves the session cookies before the process stops.
export async function closeBrowser(browser) {
  for (const page of await browser.pages()) await page.close().catch(() => {});
  await browser.close();
}

// Polls until isSignedIn() is true; survives the navigations a sign-in causes.
export async function waitForManualSignIn(page, isSignedIn, timeoutMs) {
  if (timeoutMs === 0) {
    throw new Error(`Sign-in failed (wrong or missing credentials, or a check such as reCAPTCHA) and nobody is at the browser window (stopped at ${page.url()})`);
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isSignedIn().catch(() => false)) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Manual sign-in not completed within ${timeoutMs / 1000}s (stopped at ${page.url()})`);
}

export async function newPage(browser) {
  const page = await browser.newPage();
  page.setDefaultTimeout(browser.defaultTimeoutMs);
  page.setDefaultNavigationTimeout(browser.defaultTimeoutMs);
  return page;
}

export async function submitAndWait(page, submitSelector) {
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click(submitSelector)]);
}
