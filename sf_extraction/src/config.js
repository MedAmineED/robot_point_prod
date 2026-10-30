import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    throw new Error(`Cannot read config file ${file}: ${err.message}`);
  }
}

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

export async function loadConfig() {
  const config = await readJson(path.join(ROOT, 'config', 'config.json'));
  const reportsDir = path.join(ROOT, 'config', 'reports');
  const files = (await readdir(reportsDir)).filter((f) => f.endsWith('.json')).sort();
  const reports = await Promise.all(
    files.map(async (f) => validateReport(await readJson(path.join(reportsDir, f)), f)),
  );
  return { ...config, reports };
}

