import { readdir, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { log } from '@sales-automation/shared/log';
import { runExtractor } from './extractor.js';
import { mapRecords } from './mapping.js';
import { msUntilNextSlot, slots } from './schedule.js';
import { selectJobs } from './jobs.js';
import { withRobotLock } from './lock.js';

const ROBOT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_ROOT = path.resolve(ROBOT_ROOT, '..');

const USAGE = `Usage: npm start -- [--job <activity>]... [--skip-extract] [--schedule]
  --job <activity>  run only this job (repeatable); default: all jobs in config/robot.json
  --skip-extract    send the latest existing extraction files without running the extractors
  --schedule        keep running and repeat at the slots of config "schedule"`;

// ROBOT_API_URL in robot/.env wins over config/robot.json (e.g. https://point-prod.nrjcallcenter.com/api).
const apiUrl = (config) => (process.env.ROBOT_API_URL || config.apiUrl).replace(/\/$/, '');

async function api(config, method, route, body) {
  const key = process.env[config.apiKeyEnv];
  if (!key) throw new Error(`Missing ${config.apiKeyEnv} in robot/.env`);
  const res = await fetch(`${apiUrl(config)}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-robot-key': key },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${method} ${route} -> HTTP ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// Latest output file written by the extractor (and, after an extraction, written during this run).
async function latestOutput(source, notBefore) {
  const dir = path.join(PROJECT_ROOT, source.workspace, 'output', source.report);
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith('.json')).sort();
  if (files.length === 0) throw new Error(`no output in ${dir}`);
  const file = path.join(dir, files.at(-1));
  if (notBefore && (await stat(file)).mtimeMs < notBefore - 1000) throw new Error('extractor produced no new file');
  return { file, ...JSON.parse(await readFile(file, 'utf8')) };
}

async function runJob(config, job, { skipExtract, trigger }) {
  log.info(`job ${job.activity}: start (${trigger}${skipExtract ? ', existing files' : ''})`);
  const { runId } = await api(config, 'POST', '/ingest/runs', { activity: job.activity, trigger, host: os.hostname() });

  const payload = { activity: job.activity, team: job.team, runId, sources: [], sales: [], leads: [], kpis: [] };
  for (const source of job.sources) {
    const started = Date.now();
    try {
      if (!skipExtract) {
        const error = await runExtractor(source, { root: PROJECT_ROOT, timeoutMs: config.extractorTimeoutMinutes * 60_000 });
        if (error) throw new Error(error);
      }
      const output = await latestOutput(source, skipExtract ? null : started);
      payload[source.kind].push(...mapRecords(source.kind, output.records, source.fields));
      payload.sources.push({ name: source.name, status: 'success', rows: output.records.length });
      log.info(`job ${job.activity}: ${source.name} OK, ${output.records.length} rows from ${path.relative(PROJECT_ROOT, output.file)}`);
    } catch (err) {
      payload.sources.push({ name: source.name, status: 'failed', error: err.message });
      log.error(`job ${job.activity}: ${source.name} failed: ${err.message}`);
    }
  }

  if (payload.sources.every((s) => s.status === 'failed')) {
    await api(config, 'POST', `/ingest/runs/${runId}/fail`, { message: 'Toutes les sources ont échoué', sources: payload.sources });
    throw new Error(`job ${job.activity}: every source failed (run #${runId})`);
  }
  const result = await api(config, 'POST', '/ingest', payload).catch(async (err) => {
    // The data did not get through: close the run so that the failure is reported by email.
    await api(config, 'POST', `/ingest/runs/${runId}/fail`, { message: `Envoi des données impossible : ${err.message}`, sources: payload.sources }).catch(() => {});
    throw err;
  });
  log.info(
    `job ${job.activity}: run #${result.runId} ${result.status}: ${result.salesInserted} new sales / ${result.salesReceived}, ` +
      `${result.leadsReceived} lead rows, ${result.agentsCreated} new agents`,
  );
  return result;
}

async function runAll(config, jobs, options) {
  log.info(`waiting for shared browser profiles (${jobs.map(job => job.activity).join(', ')})`);
  return withRobotLock(ROBOT_ROOT, async () => {
    let failures = 0;
    for (const job of jobs) {
      await runJob(config, job, options).catch((err) => {
        failures++;
        log.error(err.message);
      });
    }
    return failures;
  });
}

async function main() {
  const { values: args } = parseArgs({
    options: {
      job: { type: 'string', multiple: true },
      'skip-extract': { type: 'boolean' },
      schedule: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (args.help) return console.log(USAGE);

  const config = JSON.parse(await readFile(path.join(ROBOT_ROOT, 'config', 'robot.json'), 'utf8'));
  const jobs = selectJobs(config.jobs, args.job);
  const options = { skipExtract: Boolean(args['skip-extract']), trigger: args.schedule ? 'schedule' : 'manual' };

  if (!args.schedule) {
    process.exitCode = (await runAll(config, jobs, options)) ? 1 : 0;
    return;
  }

  const times = slots(config.schedule).map((m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  log.info(`schedule: ${times.join(', ')} (${config.schedule.timeZone})`);
  for (;;) {
    const wait = msUntilNextSlot(config.schedule);
    log.info(`schedule: next run in ${Math.round(wait / 60_000)} min`);
    await new Promise((resolve) => setTimeout(resolve, wait));
    await runAll(config, jobs, options);
  }
}

main().catch((err) => {
  log.error(err.message);
  process.exitCode = 1;
});
