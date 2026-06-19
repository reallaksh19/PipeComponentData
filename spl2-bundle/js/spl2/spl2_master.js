const $=(id)=>document.getElementById(id);
const n=(id)=>Number($(id)?.value||0);
const f=(v,d=2)=>Number.isFinite(v)?Number(v).toFixed(d):'—';
const db={nps:['2','3','4','6','8','10','12'],sch:['STD','40','80','XS'],mat:['Carbon steels, C ≤ 0.30%','Austenitic stainless steel','Low alloy steel'],pipe:{'2':60.3,'3':88.9,'4':114.3,'6':168.3,'8':219.1,'10':273.1,'12':323.9}};

document.addEventListener('DOMContentLoaded',init);
function init(){
  wireTabs(); setupSelects('loop'); setupSelects('rack'); setupSelects('simp');
  $('loop_btn_run')?.addEventListener('click',calculateLoop);
  $('rack_btn_run')?.addEventListener('click',calculateRackLoad);
  $('simp_btn_run')?.addEventListener('click',calculateSimplified);
  ['tab-loop','tab-rack','tab-simp','tab-config'].forEach(id=>$(id)?.addEventListener('input',()=>dispatchCalc(id)));
  document.querySelectorAll('.db-tab-btn').forEach(b=>b.addEventListener('click',()=>showDb(b)));
  renderDatabaseFrames(); calculateLoop(); calculateRackLoad(); calculateSimplified(); renderDebug();
}
function wireTabs(){
  const btns=document.querySelectorAll('.side-btn'),panes=document.querySelectorAll('.tab-pane');
  btns.forEach(btn=>btn.addEventListener('click',()=>{btns.forEach(b=>b.classList.remove('active'));panes.forEach(p=>p.classList.remove('active'));btn.classList.add('active');$(btn.dataset.target)?.classList.add('active');if(btn.dataset.target==='tab-db')renderDatabaseFrames();}));
}
function setupSelects(prefix){
  const nps=$(`${prefix}_inp_nps`),sch=$(`${prefix}_inp_sch`),mat=$(`${prefix}_inp_mat`);
  if(nps){db.nps.forEach(x=>nps.add(new Option(x,x)));nps.value='10';}
  if(sch){db.sch.forEach(x=>sch.add(new Option(x,x)));sch.value='STD';}
  if(mat){db.mat.forEach(x=>mat.add(new Option(x,x)));mat.value=db.mat[0];}
}
function dispatchCalc(id){if(id==='tab-loop')calculateLoop();if(id==='tab-rack')calculateRackLoad();if(id==='tab-simp')calculateSimplified();if(id==='tab-config'){calculateLoop();calculateRackLoad();calculateSimplified();}}
function calculateLoop(){
  const S=n('loop_inp_s'),G=n('loop_inp_g'),H=n('loop_inp_h'),W=n('loop_inp_w'),stress=n('loop_inp_stress'),temp=n('loop_inp_temp');
  const od=db.pipe[$('loop_inp_nps')?.value]||219.1,delta=Math.max(temp-n('global_inp_amb_temp'),0),exp=S*12*delta*6.5e-6;
  const flexibility=(3*od*Math.max(exp,1)/Math.max(stress,1))**0.5;
  const guideLoad=(S+2*G+W)*Math.max(n('global_inp_fric'),.01)*8.5;
  rows('loop_results',[['Thermal expansion',`${f(exp,3)} in`],['Required loop flexibility',`${f(flexibility,2)} ft`],['Guide load Fz',`${f(guideLoad,0)} lb`],['Source parity IDs','loop_inp_s / loop_inp_g / loop_inp_h / loop_inp_w']]);
  drawLoop($('canvas-loop'),{S,G,H,W,od,nps:$('loop_inp_nps')?.value,sch:$('loop_inp_sch')?.value,temp,mat:$('loop_inp_mat')?.value});
}
function calculateRackLoad(){
  const count=n('rack_inp_count'),span=n('rack_inp_span'),load=n('rack_inp_load'),total=count*load,reaction=total*span/2,moment=total*span*span/8;
  rows('rack_results',[['Total rack line load',`${f(total,0)} lb/ft`],['Support reaction',`${f(reaction,0)} lb`],['Max beam moment',`${f(moment,0)} lb-ft`],['Rack span',`${f(span,1)} ft`]]);
  drawRack($('canvas-rack-section'),count,'SECTION');drawRack($('canvas-rack-plan'),count,'PLAN');
}
function calculateSimplified(){
  const L=n('simp_inp_len'),w=n('simp_inp_load'),allow=n('simp_inp_defl'),E=29000000,I=240;
  const defl=(5*w*Math.pow(L*12,4))/(384*E*I),status=defl<=allow?'OK':'REVIEW';
  rows('simp_results',[['Span length',`${f(L,2)} ft`],['Deflection',`${f(defl,3)} in`],['Allowable',`${f(allow,3)} in`],['Status',status]]);
  drawBeam($('canvas-simp-3d'),L,defl);
}
function rows(id,data){const el=$(id);if(el)el.innerHTML=data.map(([a,b])=>`<div class="result-row"><span>${a}</span><span class="val">${b}</span></div>`).join('');}
function prep(c){if(!c)return null;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.fillStyle='#050b14';x.fillRect(0,0,c.width,c.height);x.font='13px JetBrains Mono,monospace';return x}
function line(x,a,b,c,d,col='#3b82f6',w=3){x.strokeStyle=col;x.lineWidth=w;x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.stroke()}
function txt(x,t,a,b,col='#e8eaf0',s=13){x.fillStyle=col;x.font=`${s}px JetBrains Mono,monospace`;x.fillText(t,a,b)}
function dim(x,a,b,c,d,t){line(x,a,b,c,d,'#60a5fa',1);txt(x,t,(a+c)/2-30,(b+d)/2-6,'#60a5fa',11)}
function drawLoop(c,v){const x=prep(c);if(!x)return;const cx=c.width/2,cy=c.height/2+70,scale=Math.min(580/(v.S+2*v.G+v.W),16),sp=v.S*scale,g=v.G*scale,h=v.H*scale,w=v.W*scale,l=cx-sp/2-g-w/2,r=cx+sp/2+g+w/2,gl=cx-w/2-g,gr=cx+w/2+g,ll=cx-w/2,lr=cx+w/2,top=cy-h;[[l,cy,ll,cy],[r,cy,lr,cy],[ll,cy,ll,top],[lr,cy,lr,top],[ll,top,lr,top]].forEach(p=>line(x,...p,'#38bdf8',4));x.fillStyle='#ff4040';[l,r].forEach(a=>{x.beginPath();x.arc(a,cy,8,0,7);x.fill()});x.fillStyle='#10b981';[gl,gr].forEach(a=>x.fillRect(a-5,cy-5,10,10));txt(x,`${v.nps}" ${v.sch}, ${v.temp} °F`,cx-90,30,'#ff6644');txt(x,v.mat||'',cx-150,50,'#ff6644');dim(x,l,cy+30,r,cy+30,`S: ${v.S} ft`);dim(x,gl,cy+60,gr,cy+60,`G: ${v.G} ft`);dim(x,ll,top-25,lr,top-25,`W: ${v.W} ft`);dim(x,lr+25,cy,lr+25,top,`H: ${v.H} ft`);txt(x,'Fx',l-55,cy,'#ff944d');txt(x,'Fx',r+40,cy,'#ff944d');txt(x,'2D_ZX',35,c.height-25,'#94a3b8')}
function drawRack(c,count,label){const x=prep(c);if(!x)return;txt(x,`RACK ${label}`,25,28,'#93c5fd');line(x,60,120,c.width-60,120,'#e8eaf0',4);for(let i=0;i<count;i++){const px=90+i*((c.width-180)/Math.max(count-1,1));x.strokeStyle='#38bdf8';x.beginPath();x.arc(px,120,15,0,7);x.stroke();txt(x,`P${i+1}`,px-10,155,'#94a3b8',10)}}
function drawBeam(c,L,d){const x=prep(c);if(!x)return;line(x,90,180,c.width-90,180,'#e8eaf0',4);x.strokeStyle='#38bdf8';x.beginPath();x.moveTo(90,180);x.quadraticCurveTo(c.width/2,210,c.width-90,180);x.stroke();dim(x,90,220,c.width-90,220,`L: ${f(L,1)} ft`);txt(x,`Defl ${f(d,3)} in`,c.width/2-70,160,'#10b981')}
function showDb(btn){document.querySelectorAll('.db-tab-btn').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.db-table-wrapper').forEach(w=>w.classList.add('hidden'));btn.classList.add('active');$(btn.dataset.dbsub)?.classList.remove('hidden')}
function table(headers,body){return`<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${body.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`}
function renderDatabaseFrames(){const pipe=db.nps.map(nps=>[nps,db.pipe[nps],db.sch.join(', ')]),mats=db.mat.map(m=>[m,'29e6 psi','available']),cfg=[['Insulation Density',$('global_inp_ins_dens')?.value,'lb/ft³'],['Friction Factor',$('global_inp_fric')?.value,'-'],['Wind Force',$('global_inp_wind')?.value,'lb/ft²']];$('db-pipe').innerHTML=table(['NPS','OD mm','Schedules'],pipe);$('db-material').innerHTML=table(['Material','E','Status'],mats);$('db-constants').innerHTML=table(['Parameter','Value','Unit'],cfg)}
function renderDebug(){rows('debug_results',[['Controller','spl2_master.js source-parity shell'],['Tabs','Loop / Rack / Simplified / Database / Config / Diagnostics'],['Canvas binding','canvas-loop, canvas-rack-section, canvas-rack-plan, canvas-simp-3d']])}
