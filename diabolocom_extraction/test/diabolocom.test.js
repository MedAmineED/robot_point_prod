import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatInZone, resolvePeriod } from '../src/period.js';
import { buildReportRequest, resolveGroupIds } from '../src/api.js';
import { toRecords } from '../src/records.js';

const TZ = 'Africa/Tunis'; // UTC+1, no DST

test('formatInZone matches the format the Diabolocom UI sends', () => {
  assert.equal(formatInZone(new Date('2026-10-30T09:45:00.000Z'), TZ), '2026-10-30T10:45:00.000+0100');
});

test('today runs from local midnight to now', () => {
  const now = new Date('2026-10-30T09:45:00.000Z');
  assert.deepEqual(resolvePeriod('today', TZ, now), {
    startDate: '2026-10-30T00:00:00.000+0100',
    endDate: '2026-10-30T10:45:00.000+0100',
    label: '30/10/2026',
  });
});

test('yesterday covers the whole previous day, across month boundaries', () => {
  assert.deepEqual(resolvePeriod('yesterday', TZ, new Date('2026-11-01T08:00:00.000Z')), {
    startDate: '2026-10-31T00:00:00.000+0100',
    endDate: '2026-10-31T23:59:59.999+0100',
    label: '31/10/2026',
  });
});

test('today just after local midnight is still the local day', () => {
  assert.equal(resolvePeriod('today', TZ, new Date('2026-10-29T23:30:00.000Z')).label, '30/10/2026');
});

test('group names resolve to ids, unknown names fail with the available list', () => {
  const groups = [{ id: 3013, name: 'FR_NCC_Box_Conquest' }, { id: 2230, name: 'FR_NCC_Tunis' }];
  assert.deepEqual(resolveGroupIds(groups, ['FR_NCC_Box_Conquest']), [3013]);
  assert.throws(() => resolveGroupIds(groups, ['Nope']), /Unknown Diabolocom group\(s\): Nope\. Available: FR_NCC_Box_Conquest, FR_NCC_Tunis/);
});

test('buildReportRequest mirrors the UI request', () => {
  const period = { startDate: 'S', endDate: 'E' };
  assert.deepEqual(buildReportRequest({ apiPath: '/api/x/', onlyActive: true }, period, [3013]), {
    path: '/api/x/?onlyActive=true',
    body: { startDate: 'S', endDate: 'E', groups: [3013], onlyActive: true },
  });
});

test('toRecords renames configured fields and prepends the date column', () => {
  const rows = [{ agentId: 1, agentName: 'a@x.fr', contactsHandled: 24 }];
  const { headers, records } = toRecords(
    rows,
    [{ field: 'agentName', header: 'Agent' }, { field: 'contactsHandled', header: 'Interactions handled' }],
    'Date',
    '30/10/2026',
  );
  assert.deepEqual(headers, ['Date', 'Agent', 'Interactions handled']);
  assert.deepEqual(records, [{ Date: '30/10/2026', Agent: 'a@x.fr', 'Interactions handled': 24 }]);
});

test('toRecords without columns keeps every field; unknown fields fail', () => {
  assert.deepEqual(toRecords([{ a: 1, b: 2 }]).headers, ['a', 'b']);
  assert.throws(() => toRecords([{ a: 1 }], [{ field: 'zz', header: 'Z' }]), /Unknown field\(s\) zz/);
});
