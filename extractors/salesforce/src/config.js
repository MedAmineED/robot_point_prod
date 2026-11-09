import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadExtractorConfig } from '@sales-automation/shared/config';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function validateReport(report, file) {
  const fail = (msg) => { throw new Error(`Invalid report config ${file}: ${msg}`); };
  if (!report.name) fail('"name" is required');
  if (!/^00O\w{12,15}$/.test(report.reportId ?? '')) fail('"reportId" must be a Salesforce report id (00O...)');
  for (const filter of report.filters ?? []) {
    if (!Number.isInteger(filter.index) || filter.index < 0) fail(`filter "${filter.label}" needs a numeric "index"`);
    if (!Array.isArray(filter.values) || filter.values.length === 0) fail(`filter "${filter.label}" needs "values"`);
    if (filter.values.some((v) => v.includes(','))) fail(`filter "${filter.label}" values cannot contain commas`);
  }
  for (const column of report.columns ?? []) {
    if (!column.column || !column.header) fail('each column needs "column" (API name) and "header"');
  }
  return report;
}

export const loadConfig = () => loadExtractorConfig(ROOT, validateReport);
