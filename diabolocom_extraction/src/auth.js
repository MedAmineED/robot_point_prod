import { credentials } from '@sales-automation/shared/env';
import { newPage, waitForManualSignIn } from '@sales-automation/shared/browser';
import { log } from '@sales-automation/shared/log';

// Returns a page signed in to Diabolocom. The session check calls a small API endpoint,
// which is more reliable than watching URLs in the single-page app.
export async function loginDiabolocom(browser, config) {
  const page = await newPage(browser);
  const { selectors } = config;
  const isSignedIn = () =>
    page.evaluate(async (apiPath) => (await fetch(apiPath, { credentials: 'include' })).ok, config.groupsApiPath);

  await page.goto(new URL(config.loginPath, config.baseUrl).href, { waitUntil: 'domcontentloaded' });

  // With a saved session the app redirects away from the login page while loading, so a single
  // check can land mid-navigation: wait until either the session answers or the login form shows.
  const state = await waitForState(page, browser.defaultTimeoutMs, async () => {
    if (await isSignedIn().catch(() => false)) return 'signed-in';
    if (await page.$(selectors.username).catch(() => null)) return 'login-form';
    return null;
  });
  if (state === 'signed-in') {
    log.info('diabolocom: existing session reused');
    return page;
  }
  const creds = credentials(config.credentialsEnv);
  if (creds) {
    log.info('diabolocom: signing in');
    await page.type(selectors.username, creds.username);
    await page.type(selectors.password, creds.password);
    await page.click(selectors.submit);
    try {
      await waitForManualSignIn(page, isSignedIn, browser.defaultTimeoutMs);
    } catch {
      // Usually a reCAPTCHA challenge or wrong credentials: let a person finish in the window.
      log.warn('diabolocom: sign-in not completed (reCAPTCHA or wrong credentials?), finish it in the browser window...');
      await waitForManualSignIn(page, isSignedIn, browser.manualSignInTimeoutMs);
    }
  } else {
    log.info('diabolocom: no credentials in .env, sign in yourself in the browser window...');
    await waitForManualSignIn(page, isSignedIn, browser.manualSignInTimeoutMs);
  }
  log.info('diabolocom: signed in');
  return page;
}

async function waitForState(page, timeoutMs, probe) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await probe();
    if (state) return state;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Diabolocom showed neither its login form nor a signed-in session within ${timeoutMs / 1000}s (at ${page.url()})`);
}
