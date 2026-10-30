import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCsv(headers, records) {
  const lines = [headers.map(csvCell).join(',')];
  for (const record of records) lines.push(headers.map((h) => csvCell(record[h])).join(','));
  return `${lines.join('\n')}\n`;
}

// Writes <outputDir>/<report name>/<timestamp>.json and .csv; returns the base path.
// outputDir must be absolute; meta is stored alongside the rows in the JSON file.
export async function writeReport(outputDir, reportName, { headers, records }, meta = {}) {
  const dir = path.join(outputDir, reportName);
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const base = path.join(dir, stamp);
  const extractedAt = new Date().toISOString();
  await writeFile(`${base}.json`, JSON.stringify({ report: reportName, extractedAt, ...meta, headers, records }, null, 2));
  await writeFile(`${base}.csv`, toCsv(headers, records));
  return base;
}
