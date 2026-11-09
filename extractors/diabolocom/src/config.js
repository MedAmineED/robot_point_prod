import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadExtractorConfig } from '@sales-automation/shared/config';
import { PERIODS } from './period.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function validateReport(report, file) {
  const fail = (msg) => { throw new Error(`Invalid report config ${file}: ${msg}`); };
  if (!report.name) fail('"name" is required');
  if (!report.apiPath?.startsWith('/api/')) fail('"apiPath" must be a Diabolocom API path (/api/...)');
  if (!PERIODS.includes(report.period)) fail(`"period" must be one of: ${PERIODS.join(', ')}`);
  if (!Array.isArray(report.groups) || report.groups.length === 0) fail('"groups" needs at least one group name');
  for (const column of report.columns ?? []) {
    if (!column.field || !column.header) fail('each column needs "field" (API field) and "header"');
  }
  return report;
}

export const loadConfig = () => loadExtractorConfig(ROOT, validateReport);
