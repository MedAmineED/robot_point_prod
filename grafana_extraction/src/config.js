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
  for (const key of ['name', 'kpi', 'dashboardUid', 'valueField']) {
    if (!report[key]) fail(`"${key}" is required`);
  }
  if (!Number.isInteger(report.panelId)) fail('"panelId" must be the id of a dashboard panel');
  if (!report.match?.field || report.match.value === undefined) fail('"match" needs "field" and "value"');
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
