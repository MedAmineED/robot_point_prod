# extractors/grafana

Reads KPI values (TR, QoS) from Grafana dashboards with Puppeteer. Everything that can change lives in `config/`, not in code. Package `@sales-automation/extractor-grafana`; the robot runs it as the `kpis` source (see `robot/README.md`).

## How it works

1. Opens Grafana (VPN required) and reuses the saved session in `.browser-profile/` when it's still valid; otherwise it signs in with `.env`. Under the robot a failed sign-in is an error at once.
2. For each report in `config/reports/`, either:
   - default mode: fetches the dashboard, finds the panel, runs the panel's own SQL query through `/api/ds/query` (with `variables` substituted) and picks `valueField` from the row matching `match`; or
   - `"readMode": "panel-percent"`: opens the panel full screen and reads the percent it displays (`valueSelector`), for cards whose value comes from client-side transformations.
3. Writes `output/<report>/<timestamp>.json` and `.csv` with one row: `KPI`, `Value` (`null` when Grafana has no data), `Date` (today in `grafana.timeZone`).

## Setup and run

```bash
cp .env.example .env    # fill GRAFANA_USERNAME / GRAFANA_PASSWORD (optional under the robot: robot/.env is passed through)
npm start               # or, from the project root: npm run extract:grafana
npm start -- --report conquest-box-tr   # one report
npm test
```

## Report config (`config/reports/*.json`)

| Key | Meaning |
| --- | --- |
| `kpi` | Key sent to the API, e.g. `TR_GRAFANA`, `QOS_GRAFANA` |
| `dashboardUid`, `panelId` | Which dashboard and panel (the panel id is in the panel's URL) |
| `variables` | Dashboard variables substituted in the panel query, e.g. `{ "Country_letters": "France" }` |
| `match` | `{ "field", "value" }`: the result row to keep |
| `valueField` | Column of that row holding the KPI |
| `readMode` | `panel-percent` to read the displayed value instead (then `valueSelector` is required and `match`/`valueField` are not) |
| `valueSelector` | CSS selector of the displayed value inside the full-screen panel |

`config/config.json` holds the browser options, Grafana URL, selectors and time zone; `.browser-profile/` is the saved Chrome session (keep it when moving the folder).
