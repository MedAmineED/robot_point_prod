# Point Prod robot

Extracts the day's data for **Telco** or **Conquest Energy** and sends it to the Point Prod API (`POST /api/ingest`, `x-robot-key` header). Both activities use the same code, with separate jobs and extraction reports.

```
robot ──runs──> sf_extraction          (Salesforce sales, report "Rapport journée MyOpla")
          ├───> diabolocom_extraction  (Diabolocom leads = inbound calls)
          └───> grafana_extraction     (TR_GRAFANA and QoS for the selected activity)
      ──sends──> https://point-prod.nrjcallcenter.com/api
```

| Folder | What it does |
| --- | --- |
| `robot/` | Runs the extractors, maps their output (`config/robot.json`) and sends it to the API |
| `sf_extraction/` | Puppeteer Salesforce extractor (2FA code read from login-tools) |
| `diabolocom_extraction/` | Puppeteer Diabolocom extractor (agent productivity) |
| `grafana_extraction/` | Reads TR from the dashboard query and QoS from the final rendered stat |
| `shared/` | Browser, logging, credentials and output helpers |
| `deploy/windows/` | Separate Telco/Energy launchers and Task Scheduler instructions |

## Setup

Requires Node.js 22+ and Google Chrome. The machine must use an IP allowed on the Point Prod server.

```bash
npm ci
cp robot/.env.example robot/.env    # fill in the API key and the accounts
```

For an existing Windows installation, keep its `.env` files and `.browser-profile/` folders when updating. Run `npm ci` after copying the new code. Set `CHROME_PATH` to the Windows Chrome executable; the example environment file documents all source credentials, including Grafana. The optional `CHROME_HEADLESS=true` runs Chrome without a visible window; omit it to retain the configured mode.

## Run

```bash
npm run robot:telco       # extract Telco and send only Telco data
npm run robot:energy      # extract Energy and send only Energy data
npm --prefix robot run push -- --job conquest-energy  # resend Energy's latest local files
npm test
```

Use explicit activity jobs in scheduled tasks. `npm run robot` without `--job` runs **all** configured activities. `--skip-extract` resends existing files; scheduled runs should perform fresh extractions.

The production API must have the matching activity and ingestion team:

| Job | Team slug | Sources |
| --- | --- | --- |
| `telco` | `ncc-box-conquest` | Telco Salesforce report, Diabolocom Box group, Conquest Box TR and QoS |
| `conquest-energy` | `ncc-energy-conquest` | Energy + Compensation Carbone Salesforce report, `FR_NCC_Energy_Conquest`, Conquest Energy TR and QoS |

The API automatically creates or matches agents within the selected activity. Energy sales whose opportunity name contains `COMP` are counted as CC by the deployed API. The robot does not publish the day's point prod.

On Windows, follow [the Task Scheduler guide](deploy/windows/README.md). Schedule each activity hourly, staggered by 30 minutes, to match the current 90-minute production silence alert. Tasks share a browser lock and wait for each other instead of opening the same Chrome profile simultaneously.

The optional built-in `--schedule` mode uses the schedule in `robot/config/robot.json` (currently every two hours). Do not combine it with Windows Task Scheduler. Before using a two-hour schedule, adjust the API monitoring threshold to match.

Sessions are kept in each extractor's `.browser-profile/` (never committed). The robot never waits for a person: a sign-in that fails makes that source fail and is reported in the run's email. If a site asks for a reCAPTCHA or a manual sign-in, run its extractor by hand (for example `npm run extract:diabolocom`) on this machine and finish in the window: the session is saved for the next runs.

## Configuration (no secrets)

- `robot/config/robot.json`: schedule, jobs, field mapping
- `sf_extraction/config/reports/*.json`: Salesforce report id and filters
- `diabolocom_extraction/config/reports/*.json`: Diabolocom groups, period, columns
- `grafana_extraction/config/reports/*.json`: Grafana dashboard, panel and row of each KPI
- `*/config/config.json`: `"headless": true` to run without a visible window
- `robot/config/robot.json` > `extractorTimeoutMinutes`: an extractor still running after this is stopped and reported as failed

Secrets only go in `.env` files, which are ignored by git.
