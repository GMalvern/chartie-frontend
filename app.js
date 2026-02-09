// ===== CONFIG =====
const PROXY = "https://chartie-proxy.onrender.com";
const MODEL = "models/gemini-2.5-flash";

// ===== Refs
const topicEl = document.getElementById('topic');
const btnGen = document.getElementById('btn-generate');
const btnDl = document.getElementById('btn-download');
const btnPDF = document.getElementById('btn-pdf');
const errorEl = document.getElementById('error');
const sheet = document.getElementById('sheet');
const titleEl = document.getElementById('chart-title');
const subEl = document.getElementById('chart-sub');
const contentEl = document.getElementById('chart-content');
const formatBadge = document.getElementById('format-badge');

const layoutSel = document.getElementById('layout');
const hlStyleSel = document.getElementById('hlStyle');
const bgStyleSel = document.getElementById('bgStyle');
const fontPresetSel = document.getElementById('fontPreset');
const toggleEmoji = document.getElementById('toggle-emoji');
const toggleSticky = document.getElementById('toggle-sticky');

// ===== State
let lastChartJSON = null;
let lastLayout = null;

// ===== Helpers
function looksMathy(t){
  return /[=±×÷\/]|\bsolve\b|\bequation\b|\bfraction\b/i.test(t||'');
}
function looksLikeComparison(t){
  return /\bcompare\b|\bvs\b|\bversus\b|\bpoint of view\b/i.test(t||'');
}

// ===== Styling refresh
function refreshHighlights(){
  const style = hlStyleSel.value;
  sheet.querySelectorAll('.hl').forEach(el=>{
    el.classList.remove('hl-clean','hl-brush','hl-none');
    if(style === 'clean') el.classList.add('hl-clean');
    if(style === 'brush') el.classList.add('hl-brush');
    if(style === 'none') el.classList.add('hl-none');
  });
}

function applyStyles(){
  refreshHighlights();
  sheet.classList.remove('bg-lined-light','bg-lined-dark','bg-graph','bg-blank','bg-poster');
  sheet.classList.add(
    bgStyleSel.value === 'lined-dark' ? 'bg-lined-dark' :
    bgStyleSel.value === 'graph' ? 'bg-graph' :
    bgStyleSel.value === 'blank' ? 'bg-blank' :
    bgStyleSel.value === 'poster' ? 'bg-poster' :
    'bg-lined-light'
  );
}

// ===== Renderers
function makeCard(title, html){
  const d = document.createElement('div');
  d.className = 'card';
  d.innerHTML = title
    ? `<h3 class="marker-h"><span class="hl">${title}</span></h3>${html}`
    : html;
  return d;
}

function renderStandard(data){
  contentEl.innerHTML = '';
  (data.sections||[]).forEach(s=>{
    contentEl.appendChild(
      makeCard(s.heading, `<ul class="pretty-list list-disc pl-6">${s.bullets.map(b=>`<li>${b}</li>`).join('')}</ul>`)
    );
  });
}

function renderStandards(obj){
  contentEl.innerHTML = '';
  contentEl.appendChild(makeCard('Big Idea', `<p>${obj.bigIdea}</p>`));

  const row1 = document.createElement('div');
  row1.className = 'grid gap-3 md:grid-cols-2';
  row1.innerHTML = `
    <div class="card"><h3 class="marker-h"><span class="hl">I’ll Know…</span></h3><ul class="pretty-list list-disc pl-6">${obj.illKnow.map(x=>`<li>${x}</li>`).join('')}</ul></div>
    <div class="card"><h3 class="marker-h"><span class="hl">I’ll show it by…</span></h3><ul class="pretty-list list-disc pl-6">${obj.howIllShowIt.map(x=>`<li>${x}</li>`).join('')}</ul></div>
  `;
  contentEl.appendChild(row1);

  const row2 = document.createElement('div');
  row2.className = 'grid gap-3 md:grid-cols-2';
  row2.innerHTML = `
    <div class="card"><h3 class="marker-h"><span class="hl">Vocabulary</span></h3><ul class="pretty-list list-disc pl-6">${obj.languageIllNeed.slice(0,6).map(x=>`<li>${x}</li>`).join('')}</ul></div>
    <div class="card"><h3 class="marker-h"><span class="hl">I Ask Myself…</span></h3><ul class="pretty-list list-disc pl-6">${obj.iAskMyself.map(x=>`<li>${x}</li>`).join('')}</ul></div>
  `;
  contentEl.appendChild(row2);

  contentEl.appendChild(makeCard('Be Careful → Instead',
    obj.watchFix.map(p=>`
      <div class="grid grid-cols-[1fr_auto_1fr] gap-2">
        <div class="text-rose-700">⚠️ ${p.watch}</div>
        <div class="font-bold text-slate-400">→</div>
        <div class="text-emerald-700">✅ ${p.fix}</div>
      </div>
    `).join('')
  ));
}

function renderByLayout(layout, data){
  titleEl.textContent = data.title || topicEl.value || 'Your Chart';
  subEl.textContent = data.subtitle || '';
  formatBadge.style.display = 'none'; // hide pill

  if(layout === 'standards') renderStandards(data);
  else renderStandard(data);

  applyStyles();
}

// ===== Model
async function callModel(body){
  const r = await fetch(`${PROXY}/api/generate`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  return r.json();
}

// ===== Generate
async function generate(){
  const topic = topicEl.value.trim();
  if(!topic) return;

  let layout = layoutSel.value;
  if(layout === 'auto'){
    if(looksMathy(topic)) layout = 'mathex';
    else if(looksLikeComparison(topic)) layout = 'compare';
    else layout = 'standard';
  }

  let prompt = layout === 'standards'
    ? `Create a Standards Breakdown for: "${topic}". Return JSON with keys: title, bigIdea, illKnow[], howIllShowIt[], languageIllNeed[], iAskMyself[], watchFix[{watch,fix}]`
    : `Create an anchor chart for: "${topic}". Return JSON: {title, subtitle, sections:[{heading, bullets[]}]}`
  ;

  const data = await callModel({
    model: MODEL,
    contents:[{parts:[{text:prompt}]}],
    generationConfig:{ responseMimeType:'application/json' }
  });

  lastChartJSON = JSON.parse(data.candidates[0].content.parts[0].text);
  lastLayout = layout;
  renderByLayout(layout, lastChartJSON);
}

// ===== Live re-style after first render
[hlStyleSel, bgStyleSel, fontPresetSel, toggleEmoji, toggleSticky].forEach(el=>{
  el.addEventListener('change', ()=>{
    if(lastChartJSON) renderByLayout(lastLayout, lastChartJSON);
  });
});

// ===== Downloads
btnDl.addEventListener('click', async ()=>{
  const canvas = await html2canvas(sheet, { scale: 2, backgroundColor: '#fff' });
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'chartie.png';
  a.click();
});

btnPDF.addEventListener('click', async ()=>{
  const { jsPDF } = window.jspdf;
  const canvas = await html2canvas(sheet, { scale: 2, backgroundColor: '#fff' });
  const img = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  pdf.addImage(img, 'PNG', 10, 10, 270, 180);
  pdf.save('chartie.pdf');
});

// ===== Init
hlStyleSel.value = 'none';
refreshHighlights();
btnGen.addEventListener('click', generate);
