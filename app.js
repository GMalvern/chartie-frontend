// ===== CONFIG =====
const PROXY = "https://chartie-proxy.onrender.com";
const MODEL = "models/gemini-2.5-flash";

// ===== Refs =====
const topicEl = document.getElementById('topic');
const btnGen = document.getElementById('btn-generate');
const btnDl = document.getElementById('btn-download');
const btnPDF = document.getElementById('btn-pdf');
const errorEl = document.getElementById('error');
const sheet = document.getElementById('sheet');
const titleEl = document.getElementById('chart-title');
const subEl = document.getElementById('chart-sub');
const contentEl = document.getElementById('chart-content');
const srStatus = document.getElementById('sr-status');

const layoutSel = document.getElementById('layout');
const hlStyleSel = document.getElementById('hlStyle');
const fontPresetSel = document.getElementById('fontPreset');
const bgStyleSel = document.getElementById('bgStyle');
const paperSel = document.getElementById('paper');
const orientSel = document.getElementById('orientation');
const toggleBig = document.getElementById('toggle-big');
const toggleEmoji = document.getElementById('toggle-emoji');
const toggleHand = document.getElementById('toggle-hand');
const toggleSticky = document.getElementById('toggle-sticky');

const progFill = document.getElementById('prog-fill');
const pencil = document.getElementById('pencil');
const loadingText = document.getElementById('loading-text');

const stickyBox = document.getElementById('sticky');
const stickyH = document.getElementById('sticky-h');
const stickyP = document.getElementById('sticky-p');

const accentButtons = [...document.querySelectorAll('.swatch')];

let lastChartJSON = null;
let lastLayout = 'standard';

// ===== Utilities =====
function setAccent(hex){
  document.documentElement.style.setProperty('--accent', hex);
  refreshHighlights();
}

function refreshHighlights(){
  const style = hlStyleSel.value || 'none';
  const els = sheet.querySelectorAll('.hl');
  els.forEach(el=>{
    el.classList.remove('hl-clean','hl-brush','hl-none');
    el.classList.add(style==='brush'?'hl-brush': style==='clean'?'hl-clean':'hl-none');
  });
}

function looksMathy(t){
  return /equation|solve|area|perimeter|volume|slope|intercept|x\s*=|=/i.test(t||'');
}

function looksLikeTEKS(t){
  return /\b(ELAR|TEKS|[1-8]\.\d+[A-Z]?)\b/i.test(t||'');
}

function looksLikeComparison(t){
  return /(compare|vs|versus|both|two texts|two ideas|point of view)/i.test(t||'');
}

function applyStyling(){
  sheet.classList.toggle('bigtext', toggleBig.checked);
  refreshHighlights();
  stickyBox.classList.toggle('hidden', !toggleSticky.checked);
  stickyH.textContent = stickyH.textContent;
  stickyP.textContent = stickyP.textContent;
}

// ===== Rendering =====
function makeCard(title, html){
  const d=document.createElement('div');
  d.className='card';
  d.innerHTML = (title?`<h3 class="marker-h"><span class="hl hl-clean">${title}</span></h3>`:'') + html;
  return d;
}

function renderStandard(obj){
  contentEl.innerHTML='';
  (obj.sections||[]).forEach(s=>{
    const ul = `<ul class="pretty-list list-disc pl-6">${(s.bullets||[]).slice(0,4).map(b=>`<li>${b}</li>`).join('')}</ul>`;
    contentEl.appendChild(makeCard(s.heading, ul));
  });
}

function renderCompare(obj){
  contentEl.innerHTML='';
  const row=document.createElement('div');
  row.className='grid gap-3 md:grid-cols-2';
  row.appendChild(makeCard(obj.leftTitle, `<ul class="pretty-list list-disc pl-6">${obj.leftBullets.slice(0,4).map(b=>`<li>${b}</li>`).join('')}</ul>`));
  row.appendChild(makeCard(obj.rightTitle, `<ul class="pretty-list list-disc pl-6">${obj.rightBullets.slice(0,4).map(b=>`<li>${b}</li>`).join('')}</ul>`));
  contentEl.appendChild(row);
}

function renderStandards(obj){
  contentEl.innerHTML='';
  contentEl.appendChild(makeCard('Big Idea', `<p>${obj.bigIdea}</p>`));

  const mid = document.createElement('div');
  mid.className = 'grid gap-3 md:grid-cols-2';
  mid.appendChild(makeCard('I’ll Know…', `<ul class="pretty-list list-disc pl-6">${obj.illKnow.slice(0,3).map(x=>`<li>${x}</li>`).join('')}</ul>`));
  mid.appendChild(makeCard('I’ll Show It By…', `<ul class="pretty-list list-disc pl-6">${obj.howIllShowIt.slice(0,3).map(x=>`<li>${x.toLowerCase()}</li>`).join('')}</ul>`));
  contentEl.appendChild(mid);

  const mid2 = document.createElement('div');
  mid2.className = 'grid gap-3 md:grid-cols-2';
  mid2.appendChild(makeCard('Vocabulary', `<ul class="pretty-list list-disc pl-6">${obj.languageIllNeed.slice(0,6).map(x=>`<li>${x}</li>`).join('')}</ul>`));
  mid2.appendChild(makeCard('I Ask Myself…', `<ul class="pretty-list list-disc pl-6">${obj.iAskMyself.slice(0,3).map(x=>`<li>${x}</li>`).join('')}</ul>`));
  contentEl.appendChild(mid2);

  const wf = document.createElement('div');
  wf.className = 'grid gap-3 md:grid-cols-2';
  wf.innerHTML = `
    <div class="card">
      <h3 class="marker-h"><span class="hl hl-clean">Be Careful…</span></h3>
      <ul class="pretty-list list-disc pl-6">${obj.watchFix.slice(0,3).map(p=>`<li>${p.watch}</li>`).join('')}</ul>
    </div>
    <div class="card">
      <h3 class="marker-h"><span class="hl hl-clean">Instead…</span></h3>
      <ul class="pretty-list list-disc pl-6">${obj.watchFix.slice(0,3).map(p=>`<li>${p.fix}</li>`).join('')}</ul>
    </div>
  `;
  contentEl.appendChild(wf);
}

function renderByLayout(layout, data){
  titleEl.textContent = data.title || topicEl.value || 'Your Chart';
  subEl.textContent = data.subtitle || '';
  lastLayout = layout;

  if(layout === 'standards') return renderStandards(data);
  if(layout === 'compare') return renderCompare(data);
  return renderStandard(data);
}

function relayout(){
  if(!lastChartJSON) return;
  renderByLayout(lastLayout, lastChartJSON);
  applyStyling();
}

// ===== Model Call =====
async function callModel(body){
  const r = await fetch(`${PROXY}/api/generate`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  const data = await r.json();
  return { ok:r.ok, data };
}

// ===== Generate =====
async function generate(){
  const topic = topicEl.value.trim();
  if(!topic){
    errorEl.textContent='Type a topic or standard.';
    errorEl.classList.remove('hidden');
    return;
  }
  errorEl.classList.add('hidden');

  let chosen = layoutSel.value === 'auto'
    ? (looksLikeTEKS(topic)?'standards': looksMathy(topic)?'mathex': looksLikeComparison(topic)?'compare':'standard')
    : layoutSel.value;

  lastLayout = chosen;

  let prompt = chosen === 'standards'
    ? `You are Chartie. Decode this standard into a student-friendly wall chart in teacher voice. Keep it short and poster-safe: "${topic}". Return JSON with: title, bigIdea, illKnow[], howIllShowIt[], languageIllNeed[], iAskMyself[], watchFix[{watch,fix}].`
    : `Create an anchor chart for "${topic}". Return JSON with title, subtitle, sections[{heading,bullets[]}]. Keep bullets short and high-leverage.`;

  const {ok,data} = await callModel({
    model: MODEL,
    contents:[{parts:[{text:prompt}]}],
    generationConfig:{ responseMimeType:'application/json' }
  });

  if(!ok){
    errorEl.textContent='AI failed. Try again.';
    errorEl.classList.remove('hidden');
    return;
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  lastChartJSON = JSON.parse(text);
  renderByLayout(chosen, lastChartJSON);
  applyStyling();
}

// ===== Downloads =====
btnDl.addEventListener('click', async ()=>{
  const canvas = await html2canvas(sheet,{scale:2});
  const a=document.createElement('a');
  a.download='chartie.png';
  a.href=canvas.toDataURL('image/png');
  a.click();
});

btnPDF.addEventListener('click', async ()=>{
  const { jsPDF } = window.jspdf;
  const pdf=new jsPDF({orientation:orientSel.value});
  const canvas = await html2canvas(sheet,{scale:2});
  const img=canvas.toDataURL('image/png');
  pdf.addImage(img,'PNG',10,10,190,0);
  pdf.save('chartie.pdf');
});

// ===== Events =====
btnGen.addEventListener('click', generate);
[layoutSel, hlStyleSel, fontPresetSel, bgStyleSel, toggleBig, toggleEmoji, toggleHand, toggleSticky]
  .forEach(el=> el.addEventListener('change', relayout));

accentButtons.forEach(b=> b.addEventListener('click', ()=> setAccent(b.dataset.color)));
