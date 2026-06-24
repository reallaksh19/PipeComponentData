const VALVE_FALLBACK_CALLOUT_SELECTOR = '.dimension-callout-layer.dimension-callout-family-valve .dimension-callout-source-fallback-fact';
const VALVE_CALLOUT_LAYER_SELECTOR = '.dimension-callout-layer.dimension-callout-family-valve';

export const VALVE_CALLOUT_POLICY_VERSION = 'valve-f2f-only-original-svg-v1';

export function enforceValveFaceToFaceOnly(root = document) {
  const scope = root?.querySelectorAll ? root : document;
  let removed = 0;
  scope.querySelectorAll?.(VALVE_FALLBACK_CALLOUT_SELECTOR).forEach((node) => {
    node.remove();
    removed += 1;
  });
  scope.querySelectorAll?.(VALVE_CALLOUT_LAYER_SELECTOR).forEach((layer) => {
    layer.dataset.valveCalloutPolicy = VALVE_CALLOUT_POLICY_VERSION;
  });
  return removed;
}

export function installValveCalloutPolicy(root = document) {
  const target = root?.documentElement || root?.body;
  enforceValveFaceToFaceOnly(root);
  if (!target || typeof MutationObserver !== 'function') return null;

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes || []) {
        if (node?.nodeType === 1) enforceValveFaceToFaceOnly(node);
      }
    }
    enforceValveFaceToFaceOnly(root);
  });
  observer.observe(target, { childList: true, subtree: true });
  return observer;
}

const observer = installValveCalloutPolicy(document);

globalThis.PipeToolsValveCalloutPolicy = {
  version: VALVE_CALLOUT_POLICY_VERSION,
  enforce: enforceValveFaceToFaceOnly,
  observer,
};
