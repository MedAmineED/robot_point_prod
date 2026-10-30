import { parseArgs } from 'node:util';
import path from 'node:path';
import { loadConfig, ROOT } from './config.js';
import { closeBrowser, launchBrowser } from '@sales-automation/shared/browser';
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
  const { values: args } = parseArgs({
    options: {
      report: { type: 'string', multiple: true },
      'list-columns': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (args.help) return console.log(USAGE);

  const config = await loadConfig();
  const reports = args.report ? config.reports.filter((r) => args.report.includes(r.name)) : config.reports;
  if (reports.length === 0) throw new Error(`No matching report. Configured: ${config.reports.map((r) => r.name).join(', ')}`);

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
