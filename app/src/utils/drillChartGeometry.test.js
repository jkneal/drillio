import test from 'node:test';
import assert from 'node:assert/strict';
import { performerData } from '../data/performerData.js';
import { CHART, PIXELS_PER_STEP, parseChartCoordinate, getChartPerformers, hitTestPerformer, resolveChartMovement, constrainView } from './drillChartGeometry.js';
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.001, `${actual} ≠ ${expected}`);

test('matches printed director-view yard lines, hashes, and step spacing', () => {
  const center = (CHART.left + CHART.right) / 2;
  const left = parseChartCoordinate('Left: 2.5 steps Inside 45 yd ln', '4.0 steps Behind Visitor Hash');
  near(left.yardX, center - 8 * PIXELS_PER_STEP);
  near(left.x, center - 5.5 * PIXELS_PER_STEP);
  near(left.referenceY, 562.5);
  near(left.y, 511.9);
  const right = parseChartCoordinate('Right: 1.5 steps Outside 40 yd ln', '7.25 steps In Front Of Home Hash');
  near(right.x, center + 17.5 * PIXELS_PER_STEP);
  near(right.y, 1007.7125);
  const on = parseChartCoordinate('On 50 yd ln', 'On Visitor Hash');
  near(on.x, center);
  assert.equal(on.yardSteps, 0);
  assert.equal(on.depthSteps, 0);
  assert.equal(on.y, on.referenceY);
});

test('uses the named sideline reference and rejects unrecognized coordinates', () => {
  const p = parseChartCoordinate('Left: On 45 yd ln', '12.0 steps In Front Of Visitor side line');
  assert.equal(p.referenceY, CHART.back);
  near(p.y, CHART.back + 12 * PIXELS_PER_STEP);
  assert.equal(p.yardSteps, 0);
  assert.equal(parseChartCoordinate('unknown', 'On Visitor Hash'), null);
  assert.equal(parseChartCoordinate('On 50 yd ln', 'On Mystery Hash'), null);
});

test('all 660 current battery coordinates map onto their charts', () => {
  let count = 0;
  for (const [movement, sets] of Object.entries(performerData.TD1.movements)) {
    for (const set of sets) {
      const performers = getChartPerformers(performerData, movement, set.set);
      assert.equal(performers.length, 10, `${movement}-${set.set}`);
      for (const p of performers) {
        assert.ok(p.x > CHART.left && p.x < CHART.right, `${movement}-${set.set} ${p.id} x`);
        assert.ok(p.y > CHART.back && p.y < CHART.front, `${movement}-${set.set} ${p.id} y`);
        count++;
      }
    }
  }
  assert.equal(count, 660);
});

test('hit testing requires sufficient zoom and a nearby tap, with no arbitrary selection of overlaps', () => {
  const performers = [{ id: 'A', x: 100, y: 100 }, { id: 'B', x: 100, y: 125 }];
  assert.equal(hitTestPerformer(performers, { x: 100, y: 100 }, 1), null);
  assert.equal(hitTestPerformer(performers, { x: 107, y: 101 }, 2)?.id, 'A');
  assert.equal(hitTestPerformer(performers, { x: 100, y: 126 }, 2)?.id, 'B');
  assert.equal(hitTestPerformer(performers, { x: 150, y: 100 }, 2), null);
  assert.equal(hitTestPerformer([{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 0, y: 0 }], { x: 0, y: 0 }, 16), null);
});

test('transition sets resolve to the owner of the image and metadata', () => {
  assert.equal(resolveChartMovement(performerData, '2', 10), '1');
  assert.equal(resolveChartMovement(performerData, '1', 11), '2');
  assert.equal(resolveChartMovement(performerData, '3', 28), '2');
  assert.equal(resolveChartMovement(performerData, '4', 40), '3');
  assert.equal(resolveChartMovement(performerData, '3', 41), '4');
});

test('pan and zoom are bounded; axes that fit are centered', () => {
  const size = { width: 1100, height: 1000 };
  assert.deepEqual(constrainView({ zoom: 1, x: 100, y: -999 }, size, 0.5), { zoom: 1, x: 0, y: 75 });
  assert.deepEqual(constrainView({ zoom: 2, x: -99999, y: 999 }, size, 0.5), { zoom: 2, x: -1100, y: 0 });
  assert.equal(constrainView({ zoom: 100, x: 0, y: 0 }, size, 0.5).zoom, 16);
});
