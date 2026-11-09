import path from 'node:path';
import { closeBrowser, launchBrowser } from '@sales-automation/shared/browser';
import { parseReportArgs, selectReports } from '@sales-automation/shared/cli';
import { writeReport } from '@sales-automation/shared/output';
import { log } from '@sales-automation/shared/log';
import { loadConfig, ROOT } from './config.js';
import { loginDiabolocom } from './auth.js';
import { apiRequest, buildReportRequest, resolveGroupIds } from './api.js';
import { resolvePeriod } from './period.js';
import { toRecords } from './records.js';

const USAGE = `Usage: npm start -- [--report <name>]...
  --report <name>   run only this report (repeatable); default: all in config/reports/`;

async function main() {
  const args = parseReportArgs(USAGE);
  if (!args) return;

  const config = await loadConfig();
  const reports = selectReports(config, args.report);

  const { diabolocom } = config;
  const browser = await launchBrowser(config.browser, ROOT);
  try {
    const page = await loginDiabolocom(browser, diabolocom);
    const groups = await apiRequest(page, 'GET', diabolocom.groupsApiPath);

    for (const report of reports) {
      const period = resolvePeriod(report.period, diabolocom.timeZone);
      const request = buildReportRequest(report, period, resolveGroupIds(groups, report.groups));
      log.info(`report "${report.name}": ${period.startDate} -> ${period.endDate}, groups ${report.groups.join(', ')}`);

      const response = await apiRequest(page, 'POST', request.path, request.body);
      const rows = response.data ?? [];
      if (response.total !== undefined && response.total > rows.length) {
        throw new Error(`Report "${report.name}": got ${rows.length} of ${response.total} rows (the API paginated the result)`);
      }

      const data = toRecords(rows, report.columns, report.dateColumn, period.label);
      const file = await writeReport(path.resolve(ROOT, config.outputDir), report.name, data, {
        period: { start: period.startDate, end: period.endDate },
        groups: report.groups,
      });
      log.info(`report "${report.name}": ${data.records.length} rows -> ${file}.{json,csv}`);
    }
  } finally {
    await closeBrowser(browser);
  }
}

main().catch((err) => {
  log.error(err.message);
  process.exitCode = 1;
});
