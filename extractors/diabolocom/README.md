# extractors/diabolocom

Extracts Diabolocom statistics reports (for example *Statistics reports → Agents productivity*) with Puppeteer. Everything that can change lives in `config/`, not in code. Package `@sales-automation/extractor-diabolocom`; the robot runs it as the `leads` source (inbound calls per agent, see `robot/README.md`).

## How it works

1. Opens Diabolocom and reuses the saved session in `.browser-profile/` when it's still valid; otherwise it signs in with `.env`. If reCAPTCHA blocks the sign-in, it waits for you to finish it in the window; under the robot, which nobody is watching, it fails at once instead.
2. Looks up the configured group names (for example `FR_NCC_Box_Conquest`) to get their IDs.
3. Sends the same request the report page sends when you set its filters (`POST /api/statistic-cold/report/...`), so it doesn't click through the screen or read the table.
4. Writes `output/<report>/<timestamp>.json` and `.csv`, with a `Date` column for the day.

## Setup and run

```bash
cp .env.example .env    # fill DIABOLOCOM_USERNAME / DIABOLOCOM_PASSWORD (optional under the robot: robot/.env is passed through)
npm start               # or, from the project root: npm run extract:diabolocom
npm start -- --report ncc-box-conquest-agent-productivity   # one report
npm test
```

`config/config.json` holds the browser options, URLs, selectors and time zone; `.browser-profile/` is the saved Chrome session (keep it when moving the folder).

## Report config (`config/reports/*.json`)

| Key | Meaning |
| --- | --- |
| `apiPath` | Report API path, e.g. `/api/statistic-cold/report/agent-productivity/` |
| `period` | `today` (midnight → now) or `yesterday` (whole day), in `diabolocom.timeZone` |
| `groups` | Group names as shown in the Groups filter |
| `onlyActive` | Same as "Display only active elements" |
| `dateColumn` | Name of the date column added in front (`null` to skip) |
| `columns` | `{ "field": <API field>, "header": <column name> }`; empty = every field |
