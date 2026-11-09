import { statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { KINDS, knownKinds } from './kinds.js';

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isHHMM = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value));
const isDirectory = (dir) => { try { return statSync(dir).isDirectory(); } catch { return false; } };
const isTimeZone = (zone) => { try { new Intl.DateTimeFormat('en-GB', { timeZone: zone }); return true; } catch { return false; } };

// Every message starts with where the problem is, so a wrong robot.json is fixed in one look.
export function validateRobotConfig(config, { projectRoot, file = 'robot.json' }) {
  const fail = (where, msg) => { throw new Error(`${file}: ${where}${where ? ': ' : ''}${msg}`); };

  if (!config || typeof config !== 'object') fail('', 'must be a JSON object');
  if (!isText(config.apiUrl) || !/^https?:\/\//.test(config.apiUrl)) fail('', '"apiUrl" must be an http(s) URL');
  if (!isText(config.apiKeyEnv)) fail('', '"apiKeyEnv" must name the environment variable holding the robot key');
  if (!(config.extractorTimeoutMinutes > 0)) fail('', '"extractorTimeoutMinutes" must be a number greater than 0');

  const schedule = config.schedule;
  if (!schedule || typeof schedule !== 'object') fail('', '"schedule" is required');
  for (const key of ['from', 'to']) if (!isHHMM(schedule[key])) fail('schedule', `"${key}" must be HH:MM`);
  if (schedule.from > schedule.to) fail('schedule', '"from" must not be after "to"');
  if (!(Number.isInteger(schedule.everyMinutes) && schedule.everyMinutes > 0)) fail('schedule', '"everyMinutes" must be an integer greater than 0');
  if (!isText(schedule.timeZone) || !isTimeZone(schedule.timeZone)) fail('schedule', `"timeZone" must be a valid IANA time zone (got ${JSON.stringify(schedule.timeZone)})`);

  if (!Array.isArray(config.jobs) || config.jobs.length === 0) fail('', '"jobs" needs at least one job');
  const seen = new Set();
  config.jobs.forEach((job, i) => {
    const where = `job ${isText(job?.activity) ? `"${job.activity}"` : `#${i + 1}`}`;
    if (!isText(job?.activity)) fail(where, '"activity" is required');
    if (seen.has(job.activity)) fail(where, 'duplicate "activity"');
    seen.add(job.activity);
    if (!isText(job.team)) fail(where, '"team" is required');
    if (!Array.isArray(job.sources) || job.sources.length === 0) fail(where, '"sources" needs at least one source');
    job.sources.forEach((source, j) => validateSource(source, `${where} source ${isText(source?.name) ? `"${source.name}"` : `#${j + 1}`}`, projectRoot, fail));
  });
  return config;
}

function validateSource(source, where, projectRoot, fail) {
  if (!isText(source?.name)) fail(where, '"name" is required');
  if (!(source.kind in KINDS)) fail(where, `unknown "kind" ${JSON.stringify(source.kind)} (known kinds: ${knownKinds().join(', ')})`);
  if (!isText(source.workspace)) fail(where, '"workspace" must be the extractor folder relative to the project root');
  if (!isDirectory(path.join(projectRoot, source.workspace))) fail(where, `"workspace" ${source.workspace} is not a directory under ${projectRoot}`);
  if (!isText(source.report)) fail(where, '"report" must name a report of the extractor');
  const fields = source.fields;
  if (!fields || typeof fields !== 'object' || Object.keys(fields).length === 0) fail(where, '"fields" must map payload keys to extractor headers');
  for (const [key, headers] of Object.entries(fields)) {
    const list = [headers].flat();
    if (list.length === 0 || !list.every(isText)) fail(where, `field "${key}" must be a header or a list of headers`);
  }
}

// root is the robot folder; the extractor workspaces live next to it, under the project root.
export async function loadRobotConfig(root, { projectRoot = path.resolve(root, '..') } = {}) {
  const file = path.join(root, 'config', 'robot.json');
  let config;
  try {
    config = JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    throw new Error(`Cannot read ${file}: ${err.message}`);
  }
  return validateRobotConfig(config, { projectRoot, file: path.relative(root, file) });
}
