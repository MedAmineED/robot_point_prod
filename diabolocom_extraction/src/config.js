import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PERIODS } from './period.js';

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
  if (!report.apiPath?.startsWith('/api/')) fail('"apiPath" must be a Diabolocom API path (/api/...)');
  if (!PERIODS.includes(report.period)) fail(`"period" must be one of: ${PERIODS.join(', ')}`);
  if (!Array.isArray(report.groups) || report.groups.length === 0) fail('"groups" needs at least one group name');
  for (const column of report.columns ?? []) {
    if (!column.field || !column.header) fail('each column needs "field" (API field) and "header"');
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
