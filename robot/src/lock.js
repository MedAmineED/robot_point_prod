import path from 'node:path';
import lockfile from 'proper-lockfile';

/** All activities share Chrome profiles; independent OS tasks must wait their turn. */
export async function withRobotLock(root, run, { retries = { retries: 3600, factor: 1, minTimeout: 1000, maxTimeout: 1000 } } = {}) {
  const release = await lockfile.lock(root, {
    lockfilePath: path.join(root, '.execution.lock'),
    stale: 120_000,
    update: 10_000,
    retries,
  });
  try { return await run(); }
  finally { await release(); }
}
