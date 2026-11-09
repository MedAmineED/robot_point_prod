import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPanel, readValue, substituteVariables } from '../src/api.js';

const report = { name: 'r', match: { field: 'activity', value: 'Conquest Box' }, valueField: 'tr_ops' };
const frame = (activities, values) => ({
  frames: [{ schema: { fields: [{ name: 'activity' }, { name: 'tr_ops' }] }, data: { values: [activities, values] } }],
});

test('reads the value of the matching row', () => {
  assert.equal(readValue(frame(['Other', 'Conquest Box'], [0.04, 0.025]), report), 0.025);
});

test('a real zero stays zero', () => {
  assert.equal(readValue(frame(['Conquest Box'], [0]), report), 0);
});

test('no data: empty answer, missing row, empty value or empty live table', () => {
  assert.equal(readValue({ frames: [] }, report), null);
  assert.equal(readValue({ frames: [{ schema: { fields: [] }, data: { values: [] } }] }, report), null);
  assert.equal(readValue(frame(['Other'], [0.04]), report), null);
  assert.equal(readValue(frame(['Conquest Box'], [null]), report), null);
  assert.equal(readValue({ error: 'pq: division by zero' }, report), null);
});

test('any other query error is a failure, not "no data"', () => {
  assert.throws(() => readValue({ error: 'db down' }, report), /db down/);
});

test('substitutes dashboard variables and refuses unknown ones', () => {
  assert.equal(substituteVariables("country = '${Country_letters:raw}'", { Country_letters: 'France' }), "country = 'France'");
  assert.throws(() => substituteVariables("site LIKE '%$Site'", {}), /add "Site"/);
});

test('finds a panel nested in a row', () => {
  assert.equal(findPanel([{ id: 1, panels: [{ id: 152 }] }], 152).id, 152);
  assert.equal(findPanel([{ id: 1 }], 152), null);
});
