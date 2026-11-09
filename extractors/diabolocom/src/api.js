// Calls the Diabolocom API from inside the signed-in page, so the session cookies are used as-is.
export async function apiRequest(page, method, apiPath, body = null) {
  const { status, text } = await page.evaluate(
    async (method, apiPath, body) => {
      const res = await fetch(apiPath, {
        method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, text: await res.text() };
    },
    method, apiPath, body,
  );
  if (status < 200 || status >= 300) throw new Error(`${method} ${apiPath} -> HTTP ${status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

export function resolveGroupIds(groups, names) {
  const byName = new Map(groups.map((g) => [g.name, g.id]));
  const missing = names.filter((n) => !byName.has(n));
  if (missing.length) {
    throw new Error(`Unknown Diabolocom group(s): ${missing.join(', ')}. Available: ${[...byName.keys()].sort().join(', ')}`);
  }
  return names.map((n) => byName.get(n));
}

// Same request the "Statistics reports" page sends when its filters change.
export function buildReportRequest(report, period, groupIds) {
  const onlyActive = report.onlyActive ?? true;
  return {
    path: `${report.apiPath}?onlyActive=${onlyActive}`,
    body: { startDate: period.startDate, endDate: period.endDate, groups: groupIds, onlyActive },
  };
}
