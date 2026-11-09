import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRobotConfig, validateRobotConfig } from '../src/config.js';

const ROBOT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_ROOT = path.resolve(ROBOT_ROOT, '..');

const source = (over = {}) => ({ name: 'grafana', kind: 'kpis', workspace: 'extractors/grafana', report: 'r', fields: { key: 'KPI', value: 'Value', date: 'Date' }, ...over });
const valid = () => ({
  apiUrl: 'http://localhost:4100/api',
  apiKeyEnv: 'ROBOT_API_KEY',
  extractorTimeoutMinutes: 10,
  schedule: { everyMinutes: 120, from: '10:00', to: '20:00', timeZone: 'Africa/Tunis' },
  jobs: [{ activity: 'telco', team: 'ncc-box-conquest', sources: [source()] }],
});
const check = (mutate) => {
  const config = valid();
  mutate(config);
  return () => validateRobotConfig(config, { projectRoot: PROJECT_ROOT });
};

test('the shipped robot.json is valid and its workspaces exist', async () => {
  const config = await loadRobotConfig(ROBOT_ROOT);
  assert.ok(config.jobs.length >= 1);
  assert.ok(config.jobs.every((job) => job.sources.length >= 1));
});

test('top-level settings are checked', () => {
  assert.equal(validateRobotConfig(valid(), { projectRoot: PROJECT_ROOT }).apiUrl, 'http://localhost:4100/api');
  assert.throws(check((c) => { c.apiUrl = 'localhost:4100'; }), /"apiUrl" must be an http\(s\) URL/);
  assert.throws(check((c) => { delete c.apiKeyEnv; }), /"apiKeyEnv"/);
  assert.throws(check((c) => { c.extractorTimeoutMinutes = 0; }), /"extractorTimeoutMinutes" must be a number greater than 0/);
  assert.throws(check((c) => { c.schedule.from = '9:00'; }), /schedule: "from" must be HH:MM/);
  assert.throws(check((c) => { c.schedule.to = '09:00'; }), /"from" must not be after "to"/);
  assert.throws(check((c) => { c.schedule.everyMinutes = 0; }), /"everyMinutes" must be an integer greater than 0/);
  assert.throws(check((c) => { c.schedule.timeZone = 'Mars/Olympus'; }), /"timeZone" must be a valid IANA time zone \(got "Mars\/Olympus"\)/);
  assert.throws(check((c) => { c.jobs = []; }), /"jobs" needs at least one job/);
});

test('errors name the job and the source', () => {
  assert.throws(check((c) => { delete c.jobs[0].team; }), /job "telco": "team" is required/);
  assert.throws(check((c) => { c.jobs[0].sources = []; }), /job "telco": "sources" needs at least one source/);
  assert.throws(check((c) => { c.jobs.push({ ...valid().jobs[0] }); }), /job "telco": duplicate "activity"/);
  assert.throws(check((c) => { c.jobs.push({ team: 't', sources: [] }); }), /job #2: "activity" is required/);
  assert.throws(check((c) => { c.jobs[0].sources[0].kind = 'calls'; }), /job "telco" source "grafana": unknown "kind" "calls" \(known kinds: sales, leads, kpis\)/);
  assert.throws(check((c) => { c.jobs[0].sources[0].workspace = 'extractors/nowhere'; }), /source "grafana": "workspace" extractors\/nowhere is not a directory under/);
  assert.throws(check((c) => { delete c.jobs[0].sources[0].report; }), /source "grafana": "report"/);
  assert.throws(check((c) => { c.jobs[0].sources[0].fields = {}; }), /source "grafana": "fields" must map payload keys/);
  assert.throws(check((c) => { c.jobs[0].sources[0].fields.key = []; }), /field "key" must be a header or a list of headers/);
  assert.throws(check((c) => { c.jobs[0].sources.push({ kind: 'kpis' }); }), /job "telco" source #2: "name" is required/);
  assert.doesNotThrow(check((c) => { c.jobs[0].sources[0].fields.key = ['KPI', 'Indicator']; }));
});

test('loadRobotConfig reads config/robot.json and resolves workspaces under the project root', async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'robot-config-'));
  const robot = path.join(project, 'robot');
  try {
    await mkdir(path.join(robot, 'config'), { recursive: true });
    await mkdir(path.join(project, 'extractors', 'grafana'), { recursive: true });
    await writeFile(path.join(robot, 'config', 'robot.json'), JSON.stringify(valid()));
    assert.equal((await loadRobotConfig(robot)).jobs[0].activity, 'telco');
    await writeFile(path.join(robot, 'config', 'robot.json'), '{ not json');
    await assert.rejects(loadRobotConfig(robot), /Cannot read .*robot\.json/);
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});
