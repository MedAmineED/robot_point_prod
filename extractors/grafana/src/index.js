import path from 'node:path';
import { closeBrowser, launchBrowser } from '@sales-automation/shared/browser';
import { parseReportArgs, selectReports } from '@sales-automation/shared/cli';
import { writeReport } from '@sales-automation/shared/output';
import { log } from '@sales-automation/shared/log';
import { loadConfig, ROOT } from './config.js';
import { loginGrafana } from './auth.js';
import { fetchDashboardPanel, readValue, runPanelQuery } from './api.js';
import { readPanelPercent } from './panel-percent.js';

const USAGE = `Usage: npm start -- [--report <name>]...
  --report <name>   run only this report (repeatable); default: all in config/reports/`;

const HEADERS = ['KPI', 'Value', 'Date'];
const today = (timeZone) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());

async function main() {
  const args = parseReportArgs(USAGE);
  if (!args) return;

  const config = await loadConfig();
  const reports = selectReports(config, args.report);

  const browser = await launchBrowser(config.browser, ROOT);
  try {
    const page = await loginGrafana(browser, config.grafana);
    for (const report of reports) {
      const value = report.readMode === 'panel-percent'
        ? await readPanelPercent(page, config.grafana.baseUrl, report)
        : readValue(await runPanelQuery(page, await fetchDashboardPanel(page, report), report.variables), report);
      const record = { KPI: report.kpi, Value: value, Date: today(config.grafana.timeZone) };
      const file = await writeReport(path.resolve(ROOT, config.outputDir), report.name, { headers: HEADERS, records: [record] });
      log.info(`report "${report.name}": ${report.kpi} = ${value ?? 'No data'} -> ${file}.{json,csv}`);
    }
  } finally {
    await closeBrowser(browser);
  }
}

main().catch((err) => {
  log.error(err.message);
  process.exitCode = 1;
});
