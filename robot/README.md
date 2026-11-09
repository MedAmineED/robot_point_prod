# robot

Runs the extractors and sends their output to the Point Prod API (`POST /api/ingest`). One run = one *job* per activity; `config/robot.json` holds everything but the secrets (`robot/.env`, see `.env.example`).

```bash
npm start                      # every job: extract, then send
npm start -- --job telco       # one job (repeatable); unknown names are rejected before anything runs
npm run push                   # resend the latest extraction files without extracting
npm run schedule               # keep running and repeat at the slots of "schedule"
npm test
```

From the project root: `npm run robot`, `npm run robot -- --job <activity>`, `npm run robot:push`, `npm run robot:schedule`.

## From a job to the API payload

A job is `{ activity, team, sources }`. For each source the robot:

1. runs `node src/index.js --report <report>` in `<project root>/<workspace>` with the robot's environment (`robot/.env` wins over the extractor's own `.env`), stopped after `extractorTimeoutMinutes`;
2. reads the newest `<workspace>/output/<report>/*.json` (with `--skip-extract`, the newest existing one);
3. maps each record through `fields` (payload key → extractor column header, or a list of headers where the first non-empty value wins), then through the source *kind* (`src/kinds.js`), and appends the items to `payload[kind.payloadKey]`.

The payload is `{ activity, team, runId, sources: [{ name, status, rows | error }], sales: [], leads: [], kpis: [] }`. A failed source is reported in `sources` and the others are still sent; when every source fails the run is closed with `/ingest/runs/:id/fail` and the API sends the failure email.

`src/config.js` validates `robot.json` at start-up (URL, key variable, timeout, schedule, every job and source, including that each `workspace` folder exists) and names the job and source in its error.

## Adding things

- **A source** to an existing activity: add a report to the extractor (`extractors/<name>/config/reports/`), then a `{ name, kind, workspace, report, fields }` entry under the job's `sources`. `kind` picks the payload list and the mapping; `fields` must provide the keys that kind expects (`sales`: externalId, agentName, opportunityName, phone, recordType, offer, provider, stage, date; `leads`: agentEmail, leads, date; `kpis`: key, value, date).
- **A kind** of source: one entry in `src/kinds.js` with `payloadKey` (the payload list, which the API must accept) and `map(record)` (picked record → payload item). The config validation and the error messages follow automatically.
- **An activity**: a new job in `robot.json` (`activity` = the API activity slug, `team` = the ingestion team slug, both existing on the API) and, on the Windows robot, a one-line wrapper or task calling `deploy/windows/run-activity.cmd <job>`.

## Lock and schedule

All jobs share the extractors' Chrome profiles, so a run takes `robot/.execution.lock` (`src/lock.js`) and a second robot started meanwhile (another activity's Windows task, for instance) waits up to an hour for it; a crashed robot's lock goes stale after two minutes.

`schedule` = `{ from, to, everyMinutes, timeZone }` gives the daily slots (10:00, 12:00 … 20:00 Africa/Tunis by default). `--schedule` waits for the next slot, runs every selected job, and waits again; without it the robot runs once and exits (what the Windows tasks use, one task per activity).
