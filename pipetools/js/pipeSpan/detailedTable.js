const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (ch) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const num = (value, digits = 1) => value == null || !Number.isFinite(Number(value)) ? '—' : Number(value).toFixed(digits).replace(/\.0$/, '');
const pct = (value) => value == null || !Number.isFinite(Number(value)) ? '—' : `${num(value, 0)}%`;
const size = (value) => Number(value) === 0.75 ? '3/4' : Number(value) === 1.5 ? '1 1/2' : String(value).padEnd(5, ' ');

const COLUMNS = Object.freeze([
  ['Pipe Size', (r) => size(r.pipeSize)], ['Pipe OD', (r) => num(r.pipeOdMm, 1)], ['Sch', (r) => r.schedule],
  ['Thk<br>mm', (r) => num(r.thicknessMm, 2)], ['Ins. Thk<br>mm', (r) => num(r.insulationMm, 2)],
  ['Pipe Wt<br>N/m', (r) => num(r.pipeWeightNPerM, 2)], ['Ins. Wt<br>N/m', (r) => num(r.insulationWeightNPerM, 2)],
  ['Water Wt<br>N/m', (r) => num(r.waterWeightNPerM, 2)], ['Bearing width<br>mm', (r) => num(r.bearingWidthMm, 2)],
  ['M.I<br>cm4', (r) => num(r.momentOfInertiaCm4, 2)], ['Span per<br>Indentation', (r) => num(r.indentationSpanM, 1)],
  ['Simply Supported BS:3974<br>Defl m', (r) => num(r.simplyDeflectionM, 1)],
  ['Simply Supported BS:3974<br>Stress m', (r) => num(r.simplyStressM, 1)],
  ['Continuous Beam BS:3974<br>Defl m', (r) => num(r.bsContinuousDeflectionM, 1)],
  ['Continuous Beam BS:3974<br>Stress m', (r) => num(r.bsContinuousStressM, 1)],
  ['Continuous Beam Civil Handbook<br>Defl m', (r) => num(r.civilContinuousDeflectionM, 1)],
  ['Continuous Beam Civil Handbook<br>Stress m', (r) => num(r.civilContinuousStressM, 1)],
  ['Fixed Beam Civil Handbook<br>Defl m', (r) => num(r.civilFixedDeflectionM, 1)],
  ['Fixed Beam Civil Handbook<br>Stress m', (r) => num(r.civilFixedStressM, 1)],
  ['Average Span Kellog<br>Defl m', (r) => num(r.kellogDeflectionM, 1)],
  ['Average Span Kellog<br>Stress m', (r) => num(r.kellogStressM, 1)],
  ['Average Span LC Peng<br>Defl m', (r) => num(r.lcPengDeflectionM, 1)],
  ['Average Span LC Peng<br>Stress m', (r) => num(r.lcPengStressM, 1)],
  ['Least of All<br>Span m', (r) => num(r.leastOfAllM, 1)], ['FEED<br>Span', (r) => num(r.feedSpanM, 2)],
  ['QMS<br>Span', (r) => num(r.qmsSpanM, 2)], ['QMS<br>Rack Span', (r) => num(r.qmsRackSpanM, 2)],
  ['QMS Vs<br>Least', (r) => pct(r.qmsVsLeastPct)], ['FEED Vs<br>Least', (r) => pct(r.feedVsLeastPct)],
  ['FEED Vs<br>BS-Cont. Beam', (r) => pct(r.feedVsBsContBeamPct)],
]);

export function renderPipeSpanDetailTable(rows) {
  return `<section class="pipe-span-card pipe-span-detail-card">
    <div class="pipe-span-detail-head"><h4>Detailed View</h4><span>${rows.length} rows · workbook-style method comparison</span></div>
    <div class="pipe-span-detail-scroll"><table class="pipe-span-table pipe-span-detail-table">
      <thead><tr>${COLUMNS.map(([label]) => `<th>${label}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${COLUMNS.map(([, pick]) => `<td>${esc(pick(row))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
  </section>`;
}
