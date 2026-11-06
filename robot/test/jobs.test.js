import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectJobs } from '../src/jobs.js';

const jobs = [{ activity: 'telco' }, { activity: 'conquest-energy' }];
test('separate activity commands select only their own job', () => {
  assert.deepEqual(selectJobs(jobs, ['telco']), [jobs[0]]);
  assert.deepEqual(selectJobs(jobs, ['conquest-energy']), [jobs[1]]);
  assert.deepEqual(selectJobs(jobs), jobs);
});
test('unknown activity names never silently run a different requested job', () => {
  assert.throws(() => selectJobs(jobs, ['telco', 'energy-typo']), /energy-typo/);
  assert.throws(() => selectJobs(jobs, []), /No matching job/);
});
