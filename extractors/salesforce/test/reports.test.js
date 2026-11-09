import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReportUrl, extractReportResult, filterMismatches } from '../src/reports/runReport.js';
import { describeColumns, toRecords } from '../src/reports/parse.js';
import { toCsv } from '@sales-automation/shared/output';

const report = {
  name: 'sample',
  reportId: '00OAM000000L2D32AK',
  filters: [
    { index: 0, label: 'Equipe', values: ['Supervision_France', 'Conquest'] },
    { index: 2, label: 'Site', values: ['NCC - Tunis'] },
  ],
};

const result = {
  attributes: { reportId: '00OAM000000L2D32AK' },
  allData: true,
  reportMetadata: {
    detailColumns: ['FULL_NAME', 'STAGE_NAME', 'CREATED_DATE'],
    reportFilters: [{ value: 'Supervision_France,Conquest' }, { value: 'X' }, { value: 'NCC - Tunis' }],
  },
  reportExtendedMetadata: {
    detailColumnInfo: { FULL_NAME: { label: 'Propriétaire' }, STAGE_NAME: { label: 'Étape' } },
  },
  factMap: {
    'T!T': {
      rows: [
        { dataCells: [{ label: 'Agent A', value: '005A' }, { label: 'Signé', value: 'Signé' }, { label: '29/10/2026', value: '2026-10-29' }] },
        { dataCells: [{ label: 'Agent B', value: '005B' }, { label: '-', value: null }, { label: '28/10/2026', value: '2026-10-28' }] },
      ],
    },
  },
};

test('buildReportUrl encodes filter overrides as fvN', () => {
  assert.equal(
    buildReportUrl('https://x.lightning.force.com', report),
    'https://x.lightning.force.com/lightning/r/Report/00OAM000000L2D32AK/view' +
      '?fv0=Supervision_France%2CConquest&fv2=NCC%20-%20Tunis',
  );
});

test('extractReportResult finds the report in an Aura response (object or string returnValue)', () => {
  assert.equal(extractReportResult({ actions: [{ state: 'SUCCESS', returnValue: result }] }, report.reportId), result);
  const asString = { actions: [{ state: 'SUCCESS', returnValue: JSON.stringify(result) }] };
  assert.deepEqual(extractReportResult(asString, report.reportId), result);
  assert.equal(extractReportResult({ actions: [{ state: 'SUCCESS', returnValue: result }] }, '00Oother000000000'), null);
});

test('filterMismatches compares configured values to the applied filters', () => {
  assert.deepEqual(filterMismatches(result, report), []);
  const other = { ...report, filters: [{ index: 2, label: 'Site', values: ['MyOpla - Tanger'] }] };
  assert.equal(filterMismatches(result, other).length, 1);
});

test('toRecords returns all columns by default, with labels as headers', () => {
  assert.deepEqual(describeColumns(result).map((c) => c.header), ['Propriétaire', 'Étape', 'CREATED_DATE']);
  const { records } = toRecords(result);
  assert.deepEqual(records[1], { Propriétaire: 'Agent B', Étape: '', CREATED_DATE: '28/10/2026' });
});

test('toRecords selects and renames configured columns, using value when asked', () => {
  const { headers, records } = toRecords(result, [
    { column: 'CREATED_DATE', header: 'Date', use: 'value' },
    { column: 'FULL_NAME', header: 'Agent' },
  ]);
  assert.deepEqual(headers, ['Date', 'Agent']);
  assert.deepEqual(records[0], { Date: '2026-10-29', Agent: 'Agent A' });
});

test('toRecords rejects unknown columns and partial data', () => {
  assert.throws(() => toRecords(result, [{ column: 'NOPE', header: 'x' }]), /Unknown column/);
  assert.throws(() => toRecords({ ...result, allData: false }), /partial data/);
});

test('toCsv quotes cells that need it', () => {
  assert.equal(toCsv(['a', 'b'], [{ a: 'x, y', b: 'say "hi"' }]), 'a,b\n"x, y","say ""hi"""\n');
});

test('toRecords puts the idColumn raw value first', () => {
  const { headers, records } = toRecords(result, [], { column: 'FULL_NAME', header: 'Id' });
  assert.deepEqual(headers, ['Id', 'Propriétaire', 'Étape', 'CREATED_DATE']);
  assert.equal(records[0].Id, '005A');
});
