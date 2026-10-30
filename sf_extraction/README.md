# sf_extraction

Extracts Salesforce (papernest) report data with Puppeteer. Everything that can change lives in `config/`, not in code.

## How it works

1. Opens **login-tools** first and signs in, so a verification code is ready.
2. Opens **Salesforce**. It reuses the saved session in `.browser-profile/` when possible; otherwise it signs in and, if asked, reads the code from login-tools.
3. For each report in `config/reports/`, it opens the report with its filters in the URL (`fv0`, `fv1`, …). This overrides the filter values for this view only; the saved report is not changed.
4. It reads the report data from Salesforce's own JSON response (`ReportPage.runReport`), not from the on-screen grid, so there's no scrolling and no fragile selectors.
5. It writes `output/<report>/<timestamp>.json` and `.csv`.

## Setup

```bash
npm install
cp .env.example .env   # then fill in the four credentials
```

## Run

```bash
npm start                                   # all reports
npm start -- --report ncc-tunis-daily-sales # one report
npm run columns                             # list each report's columns (to fill "columns")
npm test
```

## Configuration

| File | What it holds |
| --- | --- |
| `config/config.json` | Browser options, URLs, login selectors, how to find the code on login-tools |
| `config/reports/*.json` | One file per extraction: report id, filters, columns |
| `.env` | Credentials only |

### Adding a report

Create `config/reports/<name>.json`:

```json
{
  "name": "my-report",
  "reportId": "00O...",
  "filters": [{ "index": 0, "label": "Equipe", "values": ["Conquest"] }],
  "columns": [{ "column": "FULL_NAME", "header": "Agent" }]
}
```

- `filters[].index` is the position of the filter in the report's filter list, counting only the report's own filters (the first one is `0`). "Me montrer" and the date filter don't count. The run fails if Salesforce didn't apply a configured filter.
- `columns` empty means every column, with Salesforce's labels as headers. Use `npm run columns` to see the column API names. Add `"use": "value"` to get the raw value instead of the label (for example `2026-10-29` instead of `29/10/2026`).

### Verification code

login-tools serves its 2FA codes as JSON at `/api/2fas/`. `loginTools.code.tokenName` picks which code to use, matching the name shown on the "2FA Codes" page. If the code has less than `minSecondsRemaining` seconds left, the script waits for the next one, so it never types a code that's about to expire.
