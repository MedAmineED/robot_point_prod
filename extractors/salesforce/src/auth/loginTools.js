import { setTimeout as sleep } from 'node:timers/promises';
import { credentials } from '@sales-automation/shared/env';
import { newPage, submitAndWait, waitForManualSignIn } from '@sales-automation/shared/browser';
import { log } from '@sales-automation/shared/log';

// Opens login-tools in its own tab, signs in, and returns a function that reads a fresh
// 2FA code from the site's JSON endpoint ({ user_tokens, shared_tokens }, each { name, value, time_remaining }).
export async function openLoginTools(browser, config) {
  const page = await newPage(browser);
  const { code } = config;

  await page.goto(new URL(code.pagePath, config.url).href, { waitUntil: 'domcontentloaded' });
  if (await page.$(config.selectors.username)) {
    const creds = credentials(config.credentialsEnv);
    if (creds) {
      log.info('login-tools: signing in');
      await page.type(config.selectors.username, creds.username);
      await page.type(config.selectors.password, creds.password);
      await submitAndWait(page, config.selectors.submit);
      if (await page.$(config.selectors.username)) throw new Error('login-tools: sign-in failed, check LOGIN_TOOLS_* in .env');
    } else {
      log.info('login-tools: no credentials in .env, sign in yourself in the browser window...');
      await waitForManualSignIn(page, () => page.$(config.selectors.username).then((el) => !el), browser.manualSignInTimeoutMs);
    }
  }
  log.info('login-tools: ready');

  const fetchToken = async () => {
    const tokens = await page.evaluate(async (apiPath) => {
      const res = await fetch(apiPath, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      return [...(body.user_tokens ?? []), ...(body.shared_tokens ?? [])];
    }, code.apiPath);
    const token = tokens.find((t) => t.name === code.tokenName);
    if (!token) {
      throw new Error(`login-tools: no 2FA code named "${code.tokenName}". Available: ${tokens.map((t) => t.name).join(', ')}`);
    }
    return token;
  };

  return async function readCode() {
    let token = await fetchToken();
    if (token.time_remaining < code.minSecondsRemaining) {
      log.info(`login-tools: code expires in ${token.time_remaining}s, waiting for the next one`);
      await sleep((token.time_remaining + 1) * 1000);
      token = await fetchToken();
    }
    return String(token.value);
  };
}
