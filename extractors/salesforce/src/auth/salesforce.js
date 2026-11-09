import { credentials } from '@sales-automation/shared/env';
import { newPage, submitAndWait, waitForManualSignIn } from '@sales-automation/shared/browser';
import { log } from '@sales-automation/shared/log';

const isInApp = (page, appUrl) => page.url().startsWith(appUrl) && page.url().includes('/lightning/');

// Returns a page signed in to Salesforce Lightning.
// getCode is only called when Salesforce asks for a verification code.
export async function loginSalesforce(browser, config, getCode) {
  const page = await newPage(browser);
  const { selectors } = config;

  await page.goto(`${config.appUrl}/lightning/page/home`, { waitUntil: 'domcontentloaded' });
  if (isInApp(page, config.appUrl)) {
    log.info('salesforce: existing session reused');
    return page;
  }

  if (!(await page.$(selectors.username))) await page.goto(config.loginUrl, { waitUntil: 'domcontentloaded' });
  const creds = credentials(config.credentialsEnv);
  if (!creds) {
    log.info('salesforce: no credentials in .env, sign in yourself in the browser window (code included)...');
    await waitForManualSignIn(page, async () => isInApp(page, config.appUrl), browser.manualSignInTimeoutMs);
    log.info('salesforce: signed in');
    return page;
  }

  log.info('salesforce: signing in');
  await page.type(selectors.username, creds.username);
  // This org uses identifier-first login: the password field only appears after submitting the username.
  if (!(await page.$(selectors.password))) {
    await page.click(selectors.submit);
    await page.waitForSelector(selectors.password, { visible: true });
  }
  await page.type(selectors.password, creds.password);
  await submitAndWait(page, selectors.passwordSubmit ?? selectors.submit);

  if (await page.$(selectors.verificationInput)) {
    log.info('salesforce: verification code requested');
    const code = await getCode();
    await page.type(selectors.verificationInput, code);
    await submitAndWait(page, selectors.verificationSubmit);
  }

  await page.waitForFunction((appUrl) => location.href.startsWith(appUrl), {}, config.appUrl).catch(() => {});
  if (!page.url().startsWith(config.appUrl)) {
    throw new Error(`salesforce: sign-in did not reach the app (stopped at ${page.url()})`);
  }
  log.info('salesforce: signed in');
  return page;
}
