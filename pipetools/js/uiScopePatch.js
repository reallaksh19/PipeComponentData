function getActiveModule() {
  const active = document.querySelector('.tab-btn.active');
  return active ? active.textContent.trim() : 'PipeSpec DB';
}

function updateInspectorScope() {
  const showInspector = getActiveModule() === 'PipeSpec DB';
  const grid = document.querySelector('.result-grid');
  const inspector = document.getElementById('inspector-panel');
  if (grid) grid.classList.toggle('without-inspector', !showInspector);
  if (inspector) inspector.hidden = !showInspector;
}

export function updateUiScope() {
  updateInspectorScope();
}

queueMicrotask(updateUiScope);
