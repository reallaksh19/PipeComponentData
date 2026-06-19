import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  assertUniversalInvariants,
  fromCeg,
  fromCsv,
  fromUxmlXml,
  toCeg,
  toUxmlXml,
} from '../src/index.js';
import { UXML_TO_CEG_ANCHOR_ROLE, mapCegAnchorRoleToUxml, mapUxmlAnchorRoleToCeg } from '../src/ceg/roleMaps.js';

const CSV_PATH = 'fixtures/golden/phase03-seven-row.csv';
const CEG_PATH = 'fixtures/golden/phase08-editor-native-ceg.json';

async function readCegFixture() {
  return JSON.parse(await readFile(CEG_PATH, 'utf8'));
}

test('UXML to CEG anchor role map is explicit and reversible for core roles', () => {
  assert.equal(UXML_TO_CEG_ANCHOR_ROLE.SUPPORT_POINT, 'SUPPORT_ORIGIN');
  assert.equal(UXML_TO_CEG_ANCHOR_ROLE.BP, 'BRANCH_OUT');
  assert.equal(UXML_TO_CEG_ANCHOR_ROLE.POS, 'ORIGIN');
  assert.equal(mapCegAnchorRoleToUxml('SUPPORT_ORIGIN'), 'SUPPORT_POINT');
  assert.equal(mapCegAnchorRoleToUxml('BRANCH_OUT'), 'BP');
  assert.equal(mapCegAnchorRoleToUxml('ORIGIN'), 'POS');
  assert.equal(mapUxmlAnchorRoleToCeg('EP1'), 'EP1');
});

test('toCeg emits CEG-compatible anchors and supported geometry roles', async () => {
  const graph = fromCsv(await readFile(CSV_PATH, 'utf8'), { now: '2026-01-01T00:00:00.000Z' });
  const ceg = toCeg(graph, { name: 'phase8' });
  assert.equal(Object.keys(ceg.components).length, 7);
  assert.equal(Object.keys(ceg.anchors).length, 14);
  for (const component of Object.values(ceg.components)) {
    assert.ok(component.geometryRole);
    assert.ok(component.anchorIds.every((id) => ceg.anchors[id]));
  }
});

test('fromCeg backfills anchor componentId ownership', async () => {
  const graph = fromCeg(await readCegFixture(), { now: '2026-01-01T00:00:00.000Z' });
  for (const component of graph.components) {
    for (const anchorId of component.anchorIds) {
      const anchor = graph.anchors.find((item) => item.id === anchorId);
      assert.ok(anchor, `missing ${anchorId}`);
      assert.equal(anchor.componentId, component.id);
    }
  }
});

test('editor-native CEG without pipeAdapter envelope exports valid UXML', async () => {
  const graph = fromCeg(await readCegFixture(), { now: '2026-01-01T00:00:00.000Z' });
  assert.equal(graph.components.length, 3);
  assert.equal(graph.components[0].type, 'PIPE');
  assert.equal(graph.ports.length, 6);
  assert.equal(graph.segments.length, 3);
  assert.equal(graph.supports.length, 1);
  assertUniversalInvariants(graph, { inputCount: 7 });
  const restored = fromUxmlXml(toUxmlXml(graph));
  assert.equal(restored.components.length, 3);
  assert.equal(restored.lossContract.length, 4);
});

test('CEG to graph to CEG preserves anchor count and coordinates', async () => {
  const source = await readCegFixture();
  const roundTrip = toCeg(fromCeg(source, { now: '2026-01-01T00:00:00.000Z' }));
  assert.equal(Object.keys(roundTrip.anchors).length, Object.keys(source.anchors).length);
  for (const [id, anchor] of Object.entries(source.anchors)) {
    assert.deepEqual(roundTrip.anchors[id].point, anchor.point);
  }
});
