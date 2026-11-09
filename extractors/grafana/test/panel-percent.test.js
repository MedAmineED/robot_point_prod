import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { parsePanelPercent, panelUrl, panelPercentText } from '../src/panel-percent.js';

function readState({ loading = false, error = false, value = null, text = 'No data' } = {}) {
  const panel = {
    textContent: text,
    querySelector: selector => ({ '[aria-label="Panel loading bar"]': loading, '[aria-label="Panel status"]': error })[selector] ? {} : null,
    querySelectorAll: () => value === null ? [] : [{ textContent: value }],
  };
  return runInNewContext(`(${panelPercentText.toString()})('[title="QoS"]')`, { document: { querySelectorAll: () => [panel] } });
}

test('waits through transient no-data or stale values while Grafana is loading', () => {
  assert.equal(readState({ loading: true }), null);
  assert.equal(readState({ loading: true, value: '48%' }), null);
  assert.equal(readState({ value: '51%' }), '51%');
  assert.equal(readState(), 'No data');
});

test('a Grafana panel error is a failure, never a successful no-data result', () => {
  assert.throws(() => readState({ error: true }), /Grafana panel error/);
  assert.throws(() => readState({ error: true, value: '48%' }), /Grafana panel error/);
});

test('reads the displayed Grafana QoS as a ratio, keeping zero and no data distinct', () => {
  assert.equal(parsePanelPercent('51%'), 0.51);
  assert.equal(parsePanelPercent(' 91\u202f% '), 0.91);
  assert.equal(parsePanelPercent('85,6 %'), 0.856);
  assert.equal(parsePanelPercent('0%'), 0);
  assert.equal(parsePanelPercent('100%'), 1);
  assert.equal(parsePanelPercent('No data'), null);
  for (const text of ['', 'Loading...', 'Query error', '51', '51% 4%', '-1%', '101%']) {
    assert.throws(() => parsePanelPercent(text), /Invalid Grafana percent/);
  }
});

test('opens only the configured panel with the report variables', () => {
  const url = new URL(panelUrl('https://example.test:3000', { dashboardUid: 'dashboard', panelId: 171, variables: { Country_letters: 'France' } }));
  assert.equal(url.pathname, '/d/dashboard');
  assert.equal(url.searchParams.get('viewPanel'), '171');
  assert.equal(url.searchParams.get('var-Country_letters'), 'France');
});
