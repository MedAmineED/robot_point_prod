import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { withRobotLock } from '../src/lock.js';

test('concurrent activities queue until the active robot releases its browser profiles', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'robot-lock-'));
  const events = [];
  let releaseFirst;
  let firstStarted;
  const entered = new Promise(r => { firstStarted = r; });
  const finish = new Promise(r => { releaseFirst = r; });
  try {
    const a = withRobotLock(root, async () => { events.push('telco-start'); firstStarted(); await finish; events.push('telco-end'); });
    await entered;
    const b = withRobotLock(root, async () => { events.push('energy-start'); return 'energy-done'; }, { retries: { retries: 30, factor: 1, minTimeout: 10, maxTimeout: 10 } });
    releaseFirst();
    assert.equal(await b, 'energy-done');
    await a;
    assert.deepEqual(events, ['telco-start', 'telco-end', 'energy-start']);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('a failed activity releases the lock so another activity can run', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'robot-lock-'));
  try {
    await assert.rejects(withRobotLock(root, async () => { throw new Error('failed extraction'); }), /failed extraction/);
    assert.equal(await withRobotLock(root, async () => 'next activity', { retries: 0 }), 'next activity');
  } finally { await rm(root, { recursive: true, force: true }); }
});
