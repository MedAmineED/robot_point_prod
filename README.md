# Point Prod robot

Extracts each activity's data of the day and sends it to the Point Prod API (`POST /api/ingest`, `x-robot-key` header).
This repository is the robot part of the Point Prod project; the API and dashboard live in the main repository.

```
robot ──runs──> extractors/salesforce   (sales)
          ├───> extractors/diabolocom   (leads = inbound calls)
          └───> extractors/grafana      (KPIs: TR_GRAFANA, QOS_GRAFANA)
      ──sends──> https://point-prod.nrjcallcenter.com/api   (one job per activity: telco, conquest-energy)
```

| Folder | What it does |
| --- | --- |
| `robot/` | Runs the jobs of `robot/config/robot.json` (one per activity), maps the extractors' output and sends it; see `robot/README.md` |
| `extractors/salesforce` | Puppeteer Salesforce extractor (2FA code read from login-tools) |
| `extractors/diabolocom` | Puppeteer Diabolocom extractor (agent productivity) |
| `extractors/grafana` | Puppeteer Grafana extractor (panel query or displayed percent) |
| `shared/` | Browser, config loading, CLI, logging and output helpers |
| `deploy/windows/` | Task Scheduler launchers: `run-activity.cmd <job>`, `run-telco.cmd`, `run-energy.cmd` |

## Updating a machine from the previous layout

The extractors moved: `sf_extraction` → `extractors/salesforce`, `diabolocom_extraction` → `extractors/diabolocom`,
`grafana_extraction` → `extractors/grafana`. After `git pull`, move each old folder's `.env` and `.browser-profile/`
into the matching `extractors/<name>/` (the saved sessions keep working, no new sign-in), delete the old folders,
then run `npm ci`. The robot refuses to start if a `workspace` folder of `robot.json` is missing.

## Setup

Requires Node.js 22+ and Google Chrome. The machine must use an IP allowed on the Point Prod server.

```bash
npm ci
cp robot/.env.example robot/.env    # fill in the API key and the accounts
```

## Run

```bash
npm run robot                      # every job: extract now, then send
npm run robot -- --job telco       # one activity
npm run robot:push                 # resend the latest files without extracting
npm test
```

On Windows, use one scheduled task per activity calling `deploy/windows/run-activity.cmd <job>`; see `deploy/windows/README.md`.

Sessions are kept in each extractor's `.browser-profile/` (never committed). The robot never waits for a person: a sign-in that fails makes that source fail and is reported in the run's email. If a site asks for a reCAPTCHA, run its extractor by hand (for example `npm run extract:diabolocom`) and finish in the window: the session is saved for the next runs.

## Configuration (no secrets)

- `robot/config/robot.json`: schedule, jobs (one per activity), sources and field mapping, validated at start-up
- `extractors/*/config/reports/*.json`: one file per report (Salesforce report and filters, Diabolocom groups, Grafana panel)
- `extractors/*/config/config.json`: `"headless": true` to run without a visible window

Secrets only go in `.env` files, which git ignores.
