import path from 'node:path';
import { loadConfig, ROOT } from './config.js';
import { closeBrowser, launchBrowser } from '@sales-automation/shared/browser';
import { parseReportArgs, selectReports } from '@sales-automation/shared/cli';
import { openLoginTools } from './auth/loginTools.js';
import { loginSalesforce } from './auth/salesforce.js';
import { runReport } from './reports/runReport.js';
import { describeColumns, toRecords } from './reports/parse.js';
import { writeReport } from '@sales-automation/shared/output';
import { log } from '@sales-automation/shared/log';

const USAGE = `Usage: npm start -- [--report <name>]... [--list-columns]
  --report <name>   run only this report (repeatable); default: all in config/reports/
  --list-columns    print each report's available columns instead of extracting`;

async function main() {
  const args = parseReportArgs(USAGE, { 'list-columns': { type: 'boolean' } });
  if (!args) return;

  const config = await loadConfig();
  const reports = selectReports(config, args.report);

  const browser = await launchBrowser(config.browser, ROOT);
  try {
    // Opening login-tools first means a code is ready as soon as Salesforce asks for it.
    let readCode = config.loginTools.openBeforeSalesforce ? await openLoginTools(browser, config.loginTools) : null;
    const getCode = async () => (readCode ??= await openLoginTools(browser, config.loginTools))();

    const page = await loginSalesforce(browser, config.salesforce, getCode);

    for (const report of reports) {
      const result = await runReport(page, config.salesforce.appUrl, report, config.browser.timeoutMs);
      if (args['list-columns']) {
        console.log(`\n${report.name}:`);
        console.table(describeColumns(result));
        continue;
      }
      const data = toRecords(result, report.columns, report.idColumn);
      const file = await writeReport(path.resolve(ROOT, config.outputDir), report.name, data);
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
