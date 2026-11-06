// Some Grafana cards combine several data sources and client-side transformations.
// Read their final displayed value instead of duplicating those calculations.
export function parsePanelPercent(text) {
  const trimmed = text.trim();
  if (trimmed === 'No data') return null;
  const match = /^(\d+(?:[.,]\d+)?)\s*%$/.exec(trimmed);
  const value = match ? Number(match[1].replace(',', '.')) / 100 : NaN;
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`Invalid Grafana percent: ${JSON.stringify(text)}`);
  return value;
}

export function panelUrl(baseUrl, report) {
  const url = new URL(`/d/${report.dashboardUid}`, baseUrl);
  url.searchParams.set('viewPanel', String(report.panelId));
  for (const [key, value] of Object.entries(report.variables ?? {})) url.searchParams.set(`var-${key}`, value);
  return url.href;
}

// This function runs in the page. A full-screen panel must be present before a value is accepted.
export function panelPercentText(selector) {
  const panels = document.querySelectorAll('[data-testid="Panel"]');
  if (panels.length !== 1) return null;
  if (panels[0].querySelector('[aria-label="Panel status"]')) throw new Error('Grafana panel error');
  if (panels[0].querySelector('[aria-label="Panel loading bar"]')) return null;
  const values = panels[0].querySelectorAll(selector);
  if (values.length > 1) throw new Error('Ambiguous Grafana percent selector');
  if (values.length === 1) return values[0].textContent.trim() || null;
  return /\bNo data\b/.test(panels[0].textContent) ? 'No data' : null;
}

export async function readPanelPercent(page, baseUrl, report) {
  await page.goto(panelUrl(baseUrl, report), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(panelPercentText, {}, report.valueSelector);
  return parsePanelPercent(await page.evaluate(panelPercentText, report.valueSelector));
}
