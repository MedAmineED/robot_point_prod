import { parseArgs } from 'node:util';

// Extractor command line: --report <name> (repeatable), --help, plus the caller's own options.
// Prints the usage and returns null on --help.
export function parseReportArgs(usage, extraOptions = {}) {
  const { values } = parseArgs({
    options: { report: { type: 'string', multiple: true }, help: { type: 'boolean', short: 'h' }, ...extraOptions },
  });
  if (values.help) {
    console.log(usage);
    return null;
  }
  return values;
}

// The requested report names, or every configured report when none is requested.
export function selectReports(config, requested) {
  const reports = requested ? config.reports.filter((r) => requested.includes(r.name)) : config.reports;
  if (reports.length === 0) throw new Error(`No matching report. Configured: ${config.reports.map((r) => r.name).join(', ')}`);
  return reports;
}
