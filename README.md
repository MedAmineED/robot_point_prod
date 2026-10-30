# Point Prod robot

Extracts the day's data and sends it to the Point Prod API (`POST /api/ingest`, `x-robot-key` header).

```
robot ──runs──> sf_extraction          (Salesforce sales, report "Rapport journée MyOpla")
          └───> diabolocom_extraction  (Diabolocom leads = inbound calls)
      ──sends──> https://point-prod.nrjcallcenter.com/api
```

| Folder | What it does |
| --- | --- |
| `robot/` | Runs the extractors, maps their output (`config/robot.json`) and sends it to the API |
| `sf_extraction/` | Puppeteer Salesforce extractor (2FA code read from login-tools) |
| `diabolocom_extraction/` | Puppeteer Diabolocom extractor (agent productivity) |
| `shared/` | Browser, logging, credentials and output helpers |

## Setup

Requires Node.js 22+ and Google Chrome. The machine must use an IP allowed on the Point Prod server.

```bash
npm install
cp robot/.env.example robot/.env    # fill in the API key and the accounts
```

## Run

```bash
npm run robot            # extract now, then send
npm run robot:push       # resend the latest files without extracting
npm run robot:schedule   # keep running: every 2 h from 10:00 to 20:00 (robot/config/robot.json)
npm test
```

The first run opens Chrome; sign in if asked. Sessions are kept in each extractor's `.browser-profile/` (never committed).

## Configuration (no secrets)

- `robot/config/robot.json`: schedule, jobs, field mapping
- `sf_extraction/config/reports/*.json`: Salesforce report id and filters
- `diabolocom_extraction/config/reports/*.json`: Diabolocom groups, period, columns
- `*/config/config.json`: `"headless": true` to run without a visible window

Secrets only go in `.env` files, which are ignored by git.
