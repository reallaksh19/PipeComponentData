import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const ELEMENT_IDS = [
  'dashboard-cards', 'category-tabs', 'quick-filters', 'query-box', 'component-filter', 'subtype-filter', 'nps-filter',
  'class-filter', 'schedule-filter', 'facing-filter', 'search-button', 'result-card', 'source-line', 'family-summary',
  'browser-summary', 'table-count', 'component-table-body', 'copy-id-button', 'component-detail', 'provenance-panel',
  'identity-grid', 'attribute-body', 'view-buttons', 'cad-toggles', 'cad-canvas', 'verification-footer', 'audit-box', 'source-audit',
];

class FakeElement {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.value = '';
    this.open = false;
    this.dataset = {};
    this.children = [];
    this.listeners = new Map();
    this.className = '';
    this.textContent = '';
    this._innerHTML = '';
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.textContent = stripTags(this._innerHTML);
    this.children = parseButtons(this._innerHTML);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  click() {
    this.listeners.get('click')?.({ currentTarget: this });
  }

  trigger(type, extra = {}) {
    this.listeners.get(type)?.({ currentTarget: this, ...extra });
  }

  querySelectorAll(selector) {
    return selector === 'button' ? this.children.filter((child) => child.tagName === 'BUTTON') : [];
  }
}

function createDom() {
  const nodes = new Map(ELEMENT_IDS.map((id) => [id, new FakeElement(id)]));
  nodes.set('body', new FakeElement('body', 'body'));
  return {
    byId: (id) => nodes.get(id),
    document: {
      body: nodes.get('body'),
      getElementById: (id) => nodes.get(id) ?? null,
      querySelectorAll: (selector) => {
        if (selector === '#quick-filters button') return nodes.get('quick-filters').querySelectorAll('button');
        if (selector === '#component-table-body button') return nodes.get('component-table-body').querySelectorAll('button');
        return [];
      },
    },
  };
}

function parseButtons(html) {
  return [...String(html).matchAll(/<button([^>]*)>(.*?)<\/button>/g)].map((match) => {
    const button = new FakeElement('', 'button');
    button.innerHTML = match[2];
    button.textContent = stripTags(match[2]);
    button.dataset = Object.fromEntries([...match[1].matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([, key, value]) => [toCamel(key), value]));
    button.className = match[1].match(/class="([^"]*)"/)?.[1] ?? '';
    return button;
  });
}

async function loadStudio() {
  const dom = createDom();
  globalThis.document = dom.document;
  globalThis.fetch = async (url) => {
    const path = String(url).replace(/^\.\.\//, '');
    return { ok: fs.existsSync(path), json: async () => JSON.parse(fs.readFileSync(path, 'utf8')) };
  };
  await import(`${new URL('../studio/component-studio-app.js', import.meta.url).href}?smoke=${Date.now()}-${Math.random()}`);
  await waitFor(() => dom.byId('result-card').innerHTML.includes('Exact match'));
  return dom;
}

test('UI smoke: Studio boots and renders dashboard, table, exact valve without exposing raw source path', async () => {
  const dom = await loadStudio();
  assert.match(dom.byId('dashboard-cards').innerHTML, /Indexed components/);
  assert.match(dom.byId('component-table-body').innerHTML, /GATE\|FLANGED/);
  assert.match(dom.byId('component-detail').innerHTML, /Detail drawer/);
  assert.match(dom.byId('provenance-panel').innerHTML, /Source token/);
  assert.match(dom.byId('result-card').innerHTML, /Exact match/);
  assert.match(dom.byId('source-line').innerHTML, /Dataset:/);
  assert.doesNotMatch(dom.byId('source-line').innerHTML, /docs\/Pipedata\/Database/);
  assert.doesNotMatch(dom.byId('provenance-panel').innerHTML, /docs\/Pipedata\/Database/);
  assert.match(dom.byId('verification-footer').innerHTML, /Visible dashboard/);
});

test('UI smoke: family tab renders browsable flange rows and table selection loads details', async () => {
  const dom = await loadStudio();
  const flangeTab = dom.byId('category-tabs').querySelectorAll('button').find((button) => button.dataset.category === 'Flanges');
  flangeTab.click();
  await waitFor(() => dom.byId('component-table-body').innerHTML.includes('FLANGE'));
  const rowButton = dom.byId('component-table-body').querySelectorAll('button')[0];
  rowButton.click();
  await waitFor(() => dom.byId('component-detail').innerHTML.includes('Component ID'));
  assert.match(dom.byId('browser-summary').textContent, /Flanges rows/);
  assert.match(dom.byId('provenance-panel').innerHTML, /Value basis/);
});

test('UI smoke: wrong class shows no exact match instead of fallback dimensions', async () => {
  const dom = await loadStudio();
  dom.byId('query-box').value = 'gate valve 8 class 300 rf';
  dom.byId('class-filter').value = '300';
  dom.byId('search-button').click();
  await waitFor(() => dom.byId('result-card').innerHTML.includes('No exact match'));
  assert.match(dom.byId('attribute-body').innerHTML, /Exact match or row selection is required/);
  assert.match(dom.byId('verification-footer').innerHTML, /No fallback used/);
});

test('UI smoke: Source Audit is explicit and Coverage tab renders audit-only data', async () => {
  const dom = await loadStudio();
  assert.doesNotMatch(dom.byId('source-audit').textContent, /docs\/Pipedata\/Database/);
  dom.byId('audit-box').open = true;
  dom.byId('audit-box').trigger('toggle');
  assert.match(dom.byId('source-audit').textContent, /docs\/Pipedata\/Database/);

  const coverage = dom.byId('category-tabs').querySelectorAll('button').find((button) => button.dataset.category === 'Coverage');
  coverage.click();
  await waitFor(() => dom.byId('result-card').innerHTML.includes('DB coverage dashboard'));
  assert.match(dom.byId('source-line').innerHTML, /No values promoted/);
  assert.match(dom.byId('verification-footer').innerHTML, /Coverage only/);
});

test('UI smoke: static shell exposes release and integration status without raw DB path', () => {
  const html = fs.readFileSync('studio/index.html', 'utf8');
  assert.match(html, /Catalog dashboard/);
  assert.match(html, /Catalog Browser/);
  assert.match(html, /component-table-body/);
  assert.match(html, /component-detail/);
  assert.match(html, /provenance-panel/);
  assert.match(html, /Source-backed foundation release · not production-complete/);
  assert.match(html, /Integration contract: stable exact lookup API/);
  assert.match(html, /Raw source tree hidden from normal Studio and Pages/);
  assert.match(html, /data\/audit\/release-readiness\.json/);
  assert.match(html, /data\/exports\/integration-contract\.manifest\.json/);
  assert.doesNotMatch(html, /docs\/Pipedata\/Database/);
});

async function waitFor(predicate) {
  for (let i = 0; i < 40; i += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.fail('Timed out waiting for Studio smoke condition');
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, '');
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}
