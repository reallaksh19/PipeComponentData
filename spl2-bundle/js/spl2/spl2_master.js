const $ = (id) => document.getElementById(id);
const num = (id) => Number($(id)?.value || 0);
const fmt = (value, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : '—';

const tabs = document.querySelectorAll('[data-tab]');
for (const tab of tabs) tab.addEventListener('click', () => showTab(tab.dataset.tab));

$('loop-run')?.addEventListener('click', calculateLoop);
$('rack-run')?.addEventListener('click', calculateRack);
$('simp-run')?.addEventListener('click', calculateSimplified);

calculateLoop();
calculateRack();
calculateSimplified();

function showTab(id) {
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === id));
  document.querySelectorAll('section').forEach((section) => section.classList.toggle('active', section.id === id));
}

function calculateLoop() {
  const od = num('loop-od');
  const weight = num('loop-w');
  const stress = num('loop-s');
  const expansion = num('loop-exp');
  const requiredLegM = Math.sqrt(Math.max((3 * od * expansion) / Math.max(stress, 1), 0));
  const anchorLoadN = weight * requiredLegM * 0.42;
  renderResults('loop-out', [
    ['Required leg', `${fmt(requiredLegM)} m`],
    ['Estimated anchor load', `${fmt(anchorLoadN, 0)} N`],
    ['Method', 'SPL2 compact loop screening'],
  ]);
  drawLoop($('loop-canvas'), requiredLegM);
}

function calculateRack() {
  const count = num('rack-count');
  const load = num('rack-load');
  const span = num('rack-span');
  const lineLoad = count * load;
  const reaction = lineLoad * span / 2;
  const moment = lineLoad * span * span / 8;
  renderResults('rack-out', [
    ['Total line load', `${fmt(lineLoad, 0)} N/m`],
    ['Support reaction', `${fmt(reaction, 0)} N`],
    ['Max moment', `${fmt(moment, 1)} N·m`],
  ]);
  drawRack($('rack-canvas'), count);
}

function calculateSimplified() {
  const length = num('simp-l');
  const load = num('simp-w');
  const modulus = num('simp-e') * 1000;
  const iProxy = Math.max(length * 120000, 1);
  const deflection = (5 * load * Math.pow(length * 1000, 4)) / (384 * modulus * iProxy);
  renderResults('simp-out', [
    ['Input length', `${fmt(length)} m`],
    ['Estimated deflection', `${fmt(deflection)} mm`],
    ['Status', deflection < 25 ? 'OK' : 'Review required'],
  ]);
  drawBeam($('simp-canvas'), length);
}

function renderResults(id, rows) {
  $(id).innerHTML = rows.map(([label, value]) => `<div class="result"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function drawLoop(canvas, leg) {
  const ctx = prep(canvas);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(90, 210); ctx.lineTo(90, 80); ctx.lineTo(320, 80); ctx.lineTo(320, 210); ctx.stroke();
  label(ctx, `L ${fmt(leg)} m`, 175, 60);
}

function drawRack(canvas, count) {
  const ctx = prep(canvas);
  ctx.strokeStyle = '#e5f0ff'; ctx.lineWidth = 4;
  ctx.strokeRect(70, 90, 500, 90);
  ctx.strokeStyle = '#38bdf8';
  for (let i = 0; i < count; i += 1) {
    const x = 95 + i * (440 / Math.max(count - 1, 1));
    ctx.beginPath(); ctx.arc(x, 135, 14, 0, Math.PI * 2); ctx.stroke();
  }
  label(ctx, `${count} pipes`, 280, 70);
}

function drawBeam(canvas, length) {
  const ctx = prep(canvas);
  ctx.strokeStyle = '#e5f0ff'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(90, 135); ctx.quadraticCurveTo(320, 175, 550, 135); ctx.stroke();
  label(ctx, `Span ${fmt(length)} m`, 260, 95);
}

function prep(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#050b14'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  return ctx;
}

function label(ctx, text, x, y) {
  ctx.fillStyle = '#e5f0ff';
  ctx.font = '16px system-ui';
  ctx.fillText(text, x, y);
}
