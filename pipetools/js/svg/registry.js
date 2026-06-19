import { renderFallback, renderFlangeBlindRf, renderFlangeWnRf, renderFlangeWnRtj, renderLineStop, renderSupportGuide } from './general.js';
import { renderAuditCap, renderAuditElbow90, renderAuditPipe, renderAuditTee } from './auditGeneral.js';
import { valveRenderers } from './valves.js';

const svgRenderers = {
  ...valveRenderers,
  FLANGE_WN_RF: renderFlangeWnRf,
  FLANGE_WN_RTJ: renderFlangeWnRtj,
  FLANGE_BLIND_RF: renderFlangeBlindRf,
  FITTING_ELBOW_90_LR: renderAuditElbow90,
  FITTING_TEE_EQUAL: renderAuditTee,
  FITTING_CAP: renderAuditCap,
  PIPE_STRAIGHT: renderAuditPipe,
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
  return ['VALVE', type || 'GENERIC', end || 'FLANGED', facing].join('_');
}

function flangeKey(row) {
  const type = normalize(row.flangeType ?? row.type ?? 'WN');
  const facing = normalize(row.facing ?? 'RF');
  return ['FLANGE', type, facing].join('_');
}

function fittingKey(row) {
  const type = normalize(row.fittingType ?? row.subtype ?? row.type ?? 'TEE_EQUAL');
  if (type.includes('ELBOW')) return 'FITTING_ELBOW_90_LR';
  if (type.includes('CAP')) return 'FITTING_CAP';
  return type.includes('TEE') ? 'FITTING_TEE_EQUAL' : ['FITTING', type].join('_');
}

function supportKey(row) {
  const type = normalize(row.supportType ?? row.type ?? 'GUIDE');
  return type.includes('LINE') ? 'SUPPORT_LINE_STOP' : 'SUPPORT_GUIDE';
}

function normalize(value) {
  return String(value ?? '').trim().toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
}
