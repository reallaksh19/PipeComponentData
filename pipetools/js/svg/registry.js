import {
  renderElbow90Lr, renderFallback, renderFlangeBlindRf, renderFlangeWnRf,
  renderFlangeWnRtj, renderLineStop, renderPipeStraight, renderSupportGuide, renderTeeEqual,
} from './general.js';
import { valveRenderers } from './valves.js';

const svgRenderers = {
  ...valveRenderers,
  FLANGE_WN_RF: renderFlangeWnRf,
  FLANGE_WN_RTJ: renderFlangeWnRtj,
  FLANGE_BLIND_RF: renderFlangeBlindRf,
  FITTING_ELBOW_90_LR: renderElbow90Lr,
  FITTING_TEE_EQUAL: renderTeeEqual,
  PIPE_STRAIGHT: renderPipeStraight,
  SUPPORT_GUIDE: renderSupportGuide,
  SUPPORT_LINE_STOP: renderLineStop,
};

export function getSvgRenderer(svgKey) {
  return svgRenderers[svgKey] ?? renderFallback;
}

export function hasSvgRenderer(svgKey) {
  return Boolean(svgRenderers[svgKey]);
}

export function listSvgKeys() {
  return Object.keys(svgRenderers).sort();
}

export function resolveSvgKey(row = {}) {
  if (row.svgKey) return row.svgKey;
  const component = normalize(row.componentType ?? row.component);
  if (component === 'VALVE') return valveKey(row);
  if (component === 'FLANGE') return flangeKey(row);
  if (component === 'FITTING') return fittingKey(row);
  if (component === 'SUPPORT') return supportKey(row);
  if (component === 'PIPE') return 'PIPE_STRAIGHT';
  return 'UNRESOLVED';
}

function valveKey(row) {
  const type = normalize(row.valveType ?? row.type);
  const end = normalize(row.endType ?? row.endConnection);
  const facing = end === 'BUTT_WELD' ? 'NA' : normalize(row.facing ?? 'RF');
  return `VALVE_${type || 'GENERIC'}_${end || 'FLANGED'}_${facing}`;
}

function flangeKey(row) {
  const type = normalize(row.flangeType ?? row.type ?? 'WN');
  const facing = normalize(row.facing ?? 'RF');
  return `FLANGE_${type}_${facing}`;
}

function fittingKey(row) {
  const type = normalize(row.fittingType ?? row.type ?? 'TEE_EQUAL');
  if (type.includes('ELBOW')) return 'FITTING_ELBOW_90_LR';
  return `FITTING_${type}`;
}

function supportKey(row) {
  const type = normalize(row.supportType ?? row.type ?? 'GUIDE');
  return type.includes('LINE') ? 'SUPPORT_LINE_STOP' : 'SUPPORT_GUIDE';
}

function normalize(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}
