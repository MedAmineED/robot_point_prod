import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    throw new Error(`Cannot read config file ${file}: ${err.message}`);
  }
}

// <root>/config/config.json plus every <root>/config/reports/*.json (sorted by file name),
// each report passed through validateReport(report, fileName) which returns it or throws.
export async function loadExtractorConfig(root, validateReport) {
  const config = await readJson(path.join(root, 'config', 'config.json'));
  const reportsDir = path.join(root, 'config', 'reports');
  const files = (await readdir(reportsDir)).filter((f) => f.endsWith('.json')).sort();
  const reports = await Promise.all(files.map(async (f) => validateReport(await readJson(path.join(reportsDir, f)), f)));
  return { ...config, reports };
}
