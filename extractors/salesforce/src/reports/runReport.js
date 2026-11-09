import { log } from '@sales-automation/shared/log';

// Lightning reports return their data through this Aura action, as the standard
// Analytics API JSON (reportMetadata + factMap). Reading it avoids scraping the grid.
const RUN_REPORT_ACTION = 'ReportPage.runReport';

// fvN overrides the value of the report's Nth filter for this view only (the saved report is not changed).
export function buildReportUrl(appUrl, report) {
  const params = new URLSearchParams();
  for (const filter of report.filters ?? []) params.set(`fv${filter.index}`, filter.values.join(','));
  const query = params.toString().replace(/\+/g, '%20');
  return `${appUrl}/lightning/r/Report/${report.reportId}/view${query ? `?${query}` : ''}`;
}

export function extractReportResult(body, reportId) {
  for (const action of body?.actions ?? []) {
    if (action.state !== 'SUCCESS' || !action.returnValue) continue;
    const value = typeof action.returnValue === 'string' ? JSON.parse(action.returnValue) : action.returnValue;
    if (value?.attributes?.reportId === reportId && value.factMap) return value;
  }
  return null;
}

const asSet = (values) => new Set(values.map((v) => v.trim()));

// Returns the list of configured filters the result does not reflect (empty = all applied).
export function filterMismatches(result, report) {
  const applied = result.reportMetadata?.reportFilters;
  if (!applied) return [];
  return (report.filters ?? []).filter((filter) => {
    const actual = asSet(String(applied[filter.index]?.value ?? '').split(','));
    const expected = asSet(filter.values);
    return actual.size !== expected.size || [...expected].some((v) => !actual.has(v));
  });
}

export async function runReport(page, appUrl, report, timeoutMs) {
  let lastMismatch = null;

  const result = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      page.off('response', onResponse);
      const detail = lastMismatch
        ? `filters not applied: ${lastMismatch.map((f) => `${f.label} (fv${f.index})`).join(', ')}`
        : 'no report data received';
      reject(new Error(`Report "${report.name}": ${detail}`));
    }, timeoutMs);

    async function onResponse(response) {
      if (!response.url().includes(RUN_REPORT_ACTION)) return;
      const body = await response.json().catch(() => null);
      const reportResult = extractReportResult(body, report.reportId);
      if (!reportResult) return;
      const mismatches = filterMismatches(reportResult, report);
      if (mismatches.length) {
        lastMismatch = mismatches;
        return;
      }
      clearTimeout(timer);
      page.off('response', onResponse);
      resolve(reportResult);
    }

    page.on('response', onResponse);
  });

  const url = buildReportUrl(appUrl, report);
  log.info(`report "${report.name}": opening ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  return result;
}
