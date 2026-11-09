import { credentials } from '@sales-automation/shared/env';
import { newPage, waitForManualSignIn } from '@sales-automation/shared/browser';
import { log } from '@sales-automation/shared/log';

// Returns a page signed in to Grafana. An anonymous visitor can open the site but has no user,
// so the session check asks the API who is signed in.
export async function loginGrafana(browser, config) {
  const page = await newPage(browser);
  const { selectors } = config;
  const isSignedIn = () =>
    page.evaluate(async () => {
      const res = await fetch('/api/user', { credentials: 'include' });
      return res.ok && Boolean((await res.json()).login);
    });

  await page.goto(new URL(config.loginPath, config.baseUrl).href, { waitUntil: 'domcontentloaded' });

  const state = await waitForState(page, browser.defaultTimeoutMs, async () => {
    if (await isSignedIn().catch(() => false)) return 'signed-in';
    if (await page.$(selectors.username).catch(() => null)) return 'login-form';
    return null;
  });
  if (state === 'signed-in') {
    log.info('grafana: existing session reused');
    return page;
  }
  const creds = credentials(config.credentialsEnv);
  if (creds) {
    log.info('grafana: signing in');
    await page.type(selectors.username, creds.username);
    await page.type(selectors.password, creds.password);
    await page.click(selectors.submit);
    try {
      await waitForManualSignIn(page, isSignedIn, browser.defaultTimeoutMs);
    } catch {
      if (browser.manualSignInTimeoutMs) log.warn('grafana: sign-in not completed (wrong credentials?), finish it in the browser window...');
      await waitForManualSignIn(page, isSignedIn, browser.manualSignInTimeoutMs);
    }
  } else {
    log.info('grafana: no credentials in .env, sign in yourself in the browser window...');
    await waitForManualSignIn(page, isSignedIn, browser.manualSignInTimeoutMs);
  }
  log.info('grafana: signed in');
  return page;
}

async function waitForState(page, timeoutMs, probe) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await probe();
    if (state) return state;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Grafana showed neither its login form nor a signed-in session within ${timeoutMs / 1000}s (at ${page.url()})`);
}
