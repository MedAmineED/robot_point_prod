import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadExtractorConfig } from '@sales-automation/shared/config';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function validateReport(report, file) {
  const fail = (msg) => { throw new Error(`Invalid report config ${file}: ${msg}`); };
  for (const key of ['name', 'kpi', 'dashboardUid']) {
    if (!report[key]) fail(`"${key}" is required`);
  }
  if (!Number.isInteger(report.panelId)) fail('"panelId" must be the id of a dashboard panel');
  if (report.readMode && report.readMode !== 'panel-percent') fail('unknown "readMode"');
  if (report.readMode === 'panel-percent') {
    if (typeof report.valueSelector !== 'string' || !report.valueSelector.trim()) fail('"valueSelector" is required for panel-percent');
  } else {
    if (!report.valueField) fail('"valueField" is required');
    if (!report.match?.field || report.match.value === undefined) fail('"match" needs "field" and "value"');
  }
  return report;
}

export const loadConfig = () => loadExtractorConfig(ROOT, validateReport);
