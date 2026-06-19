const DISABLED_TABS = new Set(['Pipe Spacing', 'Section Designer', 'Reports']);

function getActiveModule() {
  const active = document.querySelector('.tab-btn.active');
  return active ? active.textContent.trim() : 'PipeSpec DB';
}

function updateDisabledTabs() {
  for (const button of document.querySelectorAll('.tab-btn')) {
    const label = button.textContent.trim();
    if (!DISABLED_TABS.has(label)) continue;
    button.disabled = true;
    button.classList.add('disabled');
    button.setAttribute('aria-disabled', 'true');
    button.setAttribute('title', 'Coming soon');
  }
}

function updateInspectorScope() {
  const showInspector = getActiveModule() === 'PipeSpec DB';
  const grid = document.querySelector('.result-grid');
  const inspector = document.getElementById('inspector-panel');
  if (grid) grid.classList.toggle('without-inspector', !showInspector);
  if (inspector) inspector.hidden = !showInspector;
}

function updateUiScope() {
  updateDisabledTabs();
  updateInspectorScope();
}

setInterval(updateUiScope, 250);
queueMicrotask(updateUiScope);
