import { createAdapterGraph } from '../graph/createAdapterGraph.js';

export function fromUxmlXml(xmlText, options = {}) {
  const text = String(xmlText || '').trim();
  const root = text.match(/^<UXML\b([^>]*)>/i);
  if (!root) throw new Error('UXML root element not found');
  const attrs = parseAttributes(root[1]);
  return createAdapterGraph({
    now: options.now,
    schemaVersion: attrs.schemaVersion || 'uxml-topology-v1',
    profile: attrs.profile || 'UXML-TOPOLOGY-FULL',
    header: readHeader(text),
    components: readComponents(text),
  });
}

function readHeader(text) {
  const header = readElementAttributes(text, 'Header');
  return {
    projectId: header.projectId || '',
    modelId: header.modelId || '',
    createdBy: header.createdBy || 'piping-adapter',
    createdAt: header.createdAt || '1970-01-01T00:00:00.000Z',
    purpose: header.purpose || 'cross-repo-piping-exchange',
    notes: header.notes || '',
  };
}

function readComponents(text) {
  return [...text.matchAll(/<Component\b([^/>]*?)\/>/gi)].map((match) => {
    const attrs = parseAttributes(match[1]);
    return {
      id: attrs.id || '',
      sourceRefs: [],
      type: attrs.type || 'UNKNOWN',
      normalizedType: attrs.normalizedType || attrs.type || 'UNKNOWN',
      pipelineRef: attrs.pipelineRef || '',
      lineKey: '',
      refNo: '',
      seqNo: '',
      name: attrs.name || attrs.id || '',
      bore: null,
      branchBore: null,
      boreUnit: 'MM',
      sizeRaw: '',
      skey: '',
      ca: {},
      rawAttributes: {},
      normalized: {},
      derived: {},
      anchorIds: [],
      portIds: [],
      segmentIds: [],
      supportId: '',
      confidence: 'EXACT_SOURCE',
      diagnostics: [],
    };
  });
}

function readElementAttributes(text, name) {
  const match = text.match(new RegExp(`<${name}\\b([^>]*)\\/?>(?:</${name}>)?`, 'i'));
  return match ? parseAttributes(match[1]) : {};
}

function parseAttributes(text) {
  const attrs = {};
  for (const match of String(text || '').matchAll(/([A-Za-z_:][A-Za-z0-9_:.-]*)="([^"]*)"/g)) {
    attrs[match[1]] = unescapeXml(match[2]);
  }
  return attrs;
}

function unescapeXml(value) {
  return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
}
