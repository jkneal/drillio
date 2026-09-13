import test from 'node:test';
import assert from 'node:assert/strict';
import { constrainImageView, zoomImageAt } from './imageViewportGeometry.js';

test('zoom keeps the image point beneath the cursor or moving pinch midpoint', () => {
  const view = { zoom: 2, x: -150, y: -40 };
  const anchor = { x: 100, y: 80 }, destination = { x: 125, y: 90 };
  const next = zoomImageAt(view, 4, anchor, destination);
  assert.equal((destination.x - next.x) / next.zoom, (anchor.x - view.x) / view.zoom);
  assert.equal((destination.y - next.y) / next.zoom, (anchor.y - view.y) / view.zoom);
  assert.deepEqual(zoomImageAt(view, 2, anchor, destination), { zoom: 2, x: -125, y: -30 });
});

test('wide music stays centered vertically while horizontal panning is bounded', () => {
  const viewport = { width: 350, height: 600 }, image = { width: 350, height: 100 };
  assert.deepEqual(constrainImageView({ zoom: 1, x: 999, y: -999 }, viewport, image), { zoom: 1, x: 0, y: 250 });
  assert.deepEqual(constrainImageView({ zoom: 3, x: -999, y: -999 }, viewport, image), { zoom: 3, x: -700, y: 150 });
  assert.deepEqual(constrainImageView({ zoom: 8, x: 100, y: -9999 }, viewport, image), { zoom: 8, x: 0, y: -200 });
});

test('zoom limits use the clamped scale for anchor math', () => {
  const view = { zoom: 2, x: -100, y: -100 }, anchor = { x: 100, y: 100 };
  assert.deepEqual(zoomImageAt(view, 0, anchor), { zoom: 1, x: 0, y: 0 });
  assert.deepEqual(zoomImageAt(view, 100, anchor), { zoom: 16, x: -1500, y: -1500 });
});
