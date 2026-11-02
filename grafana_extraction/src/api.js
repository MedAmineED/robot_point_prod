// Calls the Grafana API from the signed-in page, so the session cookie is used.
export async function apiRequest(page, method, apiPath, body) {
  const result = await page.evaluate(
    async (m, p, b) => {
      const res = await fetch(p, {
        method: m,
        credentials: 'include',
        headers: b ? { 'Content-Type': 'application/json' } : {},
        body: b ? JSON.stringify(b) : undefined,
      });
      return { status: res.status, text: await res.text() };
    },
    method,
    apiPath,
    body,
  );
  return { status: result.status, json: result.text ? JSON.parse(result.text) : null };
}

export async function fetchDashboardPanel(page, report) {
  const { status, json } = await apiRequest(page, 'GET', `/api/dashboards/uid/${report.dashboardUid}`);
  if (status !== 200) throw new Error(`Report "${report.name}": dashboard ${report.dashboardUid} -> HTTP ${status}`);
  const panel = findPanel(json.dashboard.panels, report.panelId);
  if (!panel) throw new Error(`Report "${report.name}": panel ${report.panelId} is no longer on the dashboard`);
  return panel;
}

// Same query as the panel, read from the dashboard so a change there is followed here.
export async function runPanelQuery(page, panel, variables) {
  const target = panel.targets?.[0];
  if (!target?.rawSql) throw new Error(`Panel ${panel.id} has no SQL query`);
  const query = { refId: target.refId, datasource: target.datasource, format: target.format, rawSql: substituteVariables(target.rawSql, variables) };
  const { json } = await apiRequest(page, 'POST', '/api/ds/query', { queries: [query], from: 'now-5m', to: 'now' });
  return json?.results?.[target.refId] ?? { error: json?.message ?? 'empty answer from Grafana' };
}

export function findPanel(panels, id) {
  for (const panel of panels ?? []) {
    if (panel.id === id) return panel;
    const nested = findPanel(panel.panels, id);
    if (nested) return nested;
  }
  return null;
}

export function substituteVariables(sql, variables = {}) {
  return sql.replace(/\$\{(\w+)(?::\w+)?\}|\$(\w+)/g, (found, braced, plain) => {
    const name = braced ?? plain;
    if (!(name in variables)) throw new Error(`The query uses "${found}": add "${name}" to "variables" in the report config`);
    return variables[name];
  });
}

// The value Grafana shows, or null where it shows "No data": no matching row, no value, or the
// live table being empty (its query then divides by zero). Any other query error is a real failure.
export function readValue(result, report) {
  if (result.error) {
    if (/division by zero/i.test(result.error)) return null;
    throw new Error(`Report "${report.name}": ${result.error}`);
  }
  const frame = result.frames?.[0];
  const names = frame?.schema?.fields?.map((f) => f.name.toLowerCase()) ?? [];
  const matchColumn = frame?.data?.values?.[names.indexOf(report.match.field.toLowerCase())];
  const valueColumn = frame?.data?.values?.[names.indexOf(report.valueField.toLowerCase())];
  if (!matchColumn || !valueColumn) return null;
  const value = valueColumn[matchColumn.indexOf(report.match.value)];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
