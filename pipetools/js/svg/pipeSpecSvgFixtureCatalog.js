import { PIPE_SPEC_SVG_FIXTURES } from './pipeSpecSvgFixtures.js';

const checkValveFixture = Object.freeze({
  id: 'valve-check-fl-rf',
  family: 'VALVE',
  subtype: 'CHECK',
  priority: 2,
  row: {
    id: 'valve-check-fl-rf',
    componentType: 'VALVE',
    valveType: 'CHECK',
    nps: '2',
    dn: 50,
    classRating: '150',
    facing: 'RF',
    endType: 'FLANGED',
    faceToFaceRfMm: 178,
    heightMm: 330,
    outerDiaMm: 152,
  },
  expected: { status: 'COMPONENT_TEMPLATE', renderable: true, type: 'CHECK' },
  checks: ['check disc visible', 'flow arrow visible', 'not gate-valve fallback'],
});

export const PIPE_SPEC_SVG_FIXTURE_CATALOG = Object.freeze([
  ...PIPE_SPEC_SVG_FIXTURES.slice(0, 5),
  checkValveFixture,
  ...PIPE_SPEC_SVG_FIXTURES.slice(5),
]);

export function getPipeSpecSvgFixtureCatalog() {
  return PIPE_SPEC_SVG_FIXTURE_CATALOG.map((item) => ({ ...item, checks: [...item.checks], row: { ...item.row } }));
}
