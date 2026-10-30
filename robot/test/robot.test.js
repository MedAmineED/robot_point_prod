import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapRecords, toIsoDay } from '../src/mapping.js';
import { msUntilNextSlot, slots } from '../src/schedule.js';

test('toIsoDay accepts dd/mm/yyyy and ISO days', () => {
  assert.equal(toIsoDay('29/10/2026'), '2026-10-29');
  assert.equal(toIsoDay('2026-10-29'), '2026-10-29');
  assert.throws(() => toIsoDay('oct 29'), /Unrecognized date/);
});

test('sales mapping uses the first non-empty header of a list', () => {
  const [sale] = mapRecords(
    'sales',
    [{ Id: '', Name: 'SFR - 1', Agent: 'A B', Day: '29/10/2026' }],
    { externalId: ['Id', 'Name'], opportunityName: 'Name', agentName: 'Agent', date: 'Day' },
  );
  assert.equal(sale.externalId, 'SFR - 1');
  assert.equal(sale.date, '2026-10-29');
});

test('leads mapping converts counts to numbers', () => {
  assert.deepEqual(mapRecords('leads', [{ Agent: 'a@x.fr', In: 18, Date: '30/10/2026' }], { agentEmail: 'Agent', leads: 'In', date: 'Date' }), [
    { agentEmail: 'a@x.fr', leads: 18, date: '2026-10-30' },
  ]);
});

test('schedule slots every 2 hours from 10:00 to 20:00, next slot computed in the time zone', () => {
  const schedule = { from: '10:00', to: '20:00', everyMinutes: 120, timeZone: 'Africa/Tunis' };
  assert.deepEqual(slots(schedule), [600, 720, 840, 960, 1080, 1200]);
  // 10:30 Tunis (09:30 UTC) -> next slot 12:00, 90 minutes later
  assert.equal(msUntilNextSlot(schedule, new Date('2026-10-30T09:30:00Z')), 90 * 60_000);
  // 21:00 Tunis -> tomorrow 10:00, 13 hours later
  assert.equal(msUntilNextSlot(schedule, new Date('2026-10-30T20:00:00Z')), 13 * 3_600_000);
});
