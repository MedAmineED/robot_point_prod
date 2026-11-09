# @sales-automation/shared

Helpers used by the three extractors and the robot (ES modules, no build step; `import ... from '@sales-automation/shared/<name>'`).

| Module | What it does |
| --- | --- |
| `browser` | `launchBrowser(config, root)` with a persistent Chrome profile (`CHROME_PATH`, `CHROME_HEADLESS`, `ROBOT_UNATTENDED` overrides), `newPage`, `submitAndWait`, `waitForManualSignIn`, `closeBrowser` |
| `cli` | `parseReportArgs(usage, extraOptions)` (`--report`, `--help` + the extractor's own flags) and `selectReports(config, names)` |
| `config` | `loadExtractorConfig(root, validateReport)`: `config/config.json` + validated `config/reports/*.json`; `readJson` |
| `env` | `credentials({ username, password })` from environment variable names, or `null` for a manual sign-in |
| `log` | `log.info / warn / error` with a timestamp (the robot reads the last `ERROR` line of an extractor) |
| `output` | `writeReport(outputDir, name, { headers, records }, meta)` → `<name>/<timestamp>.json` and `.csv`; `toCsv` |
