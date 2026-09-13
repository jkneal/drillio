import test from 'node:test';
import assert from 'node:assert/strict';
import { performerData } from '../data/performerData.js';
import { getChartPerformers } from './drillChartGeometry.js';
import { rehearsalFromMeasures, summarizeHolds } from './quickMovementSummary.js';

test('whole-drumline and split-section holds retain their actual counts', () => {
  assert.deepEqual(summarizeHolds(getChartPerformers(performerData, '2', 18)), [{ counts: 30, scope: '' }]);
  assert.deepEqual(summarizeHolds(getChartPerformers(performerData, '2', 25)), [{ counts: 12, scope: 'Q/S' }, { counts: 20, scope: 'D' }]);
  assert.deepEqual(summarizeHolds(getChartPerformers(performerData, '2', 22)), [{ counts: 8, scope: 'Q/S' }]);
  assert.deepEqual(summarizeHolds(getChartPerformers(performerData, '2', 11)), []);
});

test('hold summaries support partial sections and multiple hold phrases', () => {
  assert.deepEqual(summarizeHolds([{ id: 'SD1', tip: 'Hold for 4 counts, then move for 8 counts, then hold for 2 counts' }, { id: 'SD2', tip: 'Move for 14 counts' }]), [{ counts: 6, scope: 'SD1' }]);
});

test('rehearsal fallback uses only explicit measure letters, including movement 3', () => {
  assert.equal(rehearsalFromMeasures('B6 - C13'), 'B-C');
  assert.equal(rehearsalFromMeasures('J43 - End'), 'J-End');
  assert.equal(rehearsalFromMeasures('Opening S'), '');
  assert.equal(rehearsalFromMeasures('2 - 7'), '');
});
