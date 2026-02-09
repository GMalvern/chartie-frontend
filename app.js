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

const qtPanel = document.getElementById('qt-panel');
const qtRows = document.getElementById('qt-rows');
const qtTitle = document.getElementById('qt-title');
const qtSplitBlank = document.getElementById('qt-split-blank');
const qtSplitLines = document.getElementById('qt-split-lines');

const stickyBox = document.getElementById('sticky');
const stickyH = document.getElementById('sticky-h');
const stickyP = document.getElementById('sticky-p');
const stickyControls = document.getElementById('sticky-controls');
const stickyTitle = document.getElementById('sticky-title');
const stickyText = document.getElementById('sticky-text');

const accentButtons = [...document.querySelectorAll('.swatch')];

// ===== State
let lastChartJSON = null;

// ===== Helpers
function setAccent(hex){
  document.documentElement.style.setProperty('--accent', hex);
}

function setFonts(preset){
  const root = document.documentElement;
  if(preset === 'hand+rounded'){
    root.style.setProperty('--title-font', "'Patrick Hand', cursive");
    root.style.setProperty('--body-font', "'Poppins', system-ui, sans-serif");
  } else if(preset === 'serif+rounded'){
    root.style.setProperty('--title-font', "'DM Serif Display', serif");
    root.style.setProperty('--body-font', "'Nunito Sans', system-ui, sans-serif");
  } else if(preset === 'hand+sans'){
    root.style.setProperty('--title-font', "'Patrick Hand', cursive");
    root.style.setProperty('--body-font', "'Nunito Sans', system-ui, sans-serif");
  } else {
    root.style.setProperty('--title-font', "'Nunito Sans', system-ui, sans-serif");
    root.style.setProperty('--body-font', "'Nunito Sans', system-ui, sans-serif");
  }
}

function setBackground(style){
  sheet.classList.remove('bg-lined-light','bg-lined-dark','bg-blank','bg-graph','bg-poster');
  sheet.classList.add(style === 'lined-dark' ? 'bg-lined-dark'
    : style === 'blank' ? 'bg-blank'
    : style === 'graph' ? 'bg-graph'
    : style === 'poster' ? 'bg-poster'
    : 'bg-lined-light');
}

function refreshHighlights(){
  const style = hlStyleSel.value;
  sheet.querySelectorAll('.hl').forEach(el=>{
    el.classList.remove('hl-clean','hl-brush','hl-none');
    el.classList.add(style === 'brush' ? 'hl-brush' : style === 'none' ? 'hl-none' : 'hl-clean');
  });
}

function applyStyling(){
  sheet.classList.toggle('bigtext', toggleBig.checked);
  sheet.classList.toggle('math-hand', toggleHand.checked);
  setBackground(bgStyleSel.value);
  setFonts(fontPresetSel.value);
  refreshHighlights();

  stickyBox.classList.toggle('hidden', !toggleSticky.checked);
  stickyH.textContent = stickyTitle.value || '';
  stickyP.textContent = stickyText.value || '';
}

// ===== Rendering
function makeCard(title, html){
  const d=document.createElement('div');
  d.className='card';
  d.innerHTML = title ? `<h3 class="marker-h"><span class="hl">${title}</span></h3>${html}` : html;
  return d;
}

function renderStandards(obj){
  contentEl.innerHTML = '';

  contentEl.appendChild(makeCard('Big Idea', `<p>${obj.bigIdea}</p>`));

  const grid1 = document.createElement('div');
  grid1.className = 'grid gap-3 md:grid-cols-2';
  grid1.appendChild(makeCard('I’ll Know…', `<ul class="pretty-list list-disc pl-6">${obj.illKnow.map(x=>`<li>${x}</li>`).join('')}</ul>`));
  grid1.appendChild(makeCard('I’ll show it by…', `<ul class="pretty-list list-disc pl-6">${obj.howIllShowIt.map(x=>`<li>${x}</li>`).join('')}</ul>`));
  contentEl.appendChild(grid1);

  const grid2 = document.createElement('div');
  grid2.className = 'grid gap-3 md:grid-cols-2';
  grid2.appendChild(makeCard('Vocabulary', `<ul class="pretty-list list-disc pl-6">${obj.languageIllNeed.slice(0,6).map(x=>`<li>${x}</li>`).join('')}</ul>`));
  grid2.appendChild(makeCard('I Ask Myself…', `<ul class="pretty-list list-disc pl-6">${obj.iAskMyself.map(x=>`<li>${x}</li>`).join('')}</ul>`));
  contentEl.appendChild(grid2);

  const fixes = obj.watchFix.map(p=>`
    <div class="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
      <div class="text-rose-700">⚠️ ${p.watch}</div>
      <div>→</div>
      <div class="text-emerald-700">✅ ${p.fix}</div>
    </div>
  `).join('');

  contentEl.appendChild(makeCard('Be Careful → Instead', fixes));
}

function renderStandard(obj){
  contentEl.innerHTML='';
  (obj.sections||[]).forEach(s=>{
    contentEl.appendChild(makeCard(s.heading, `<ul class="pretty-list list-disc pl-6">${s.bullets.map(b=>`<li>${b}</li>`).join('')}</ul>`));
  });
}

function renderByLayout(layout, data){
  titleEl.textContent = data.title || topicEl.value;
  subEl.textContent = data.subtitle || '';
  formatBadge.textContent = '';
  applyStyling();

  if(layout === 'standards') return renderStandards(data);
  return renderStandard(data);
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

async function generate(){
  const topic = topicEl.value.trim();
  if(!topic){
    errorEl.textContent = 'Please enter a topic.';
    errorEl.classList.remove('hidden');
    return;
  }
  errorEl.classList.add('hidden');

  const chosen = layoutSel.value === 'auto' ? 'standard' : layoutSel.value;

  let prompt, schema;

  if(chosen === 'standards'){
    prompt = `Decode this TEKS into a student-friendly wall chart in warm teacher voice:\n${topic}\nReturn JSON with: title, bigIdea, illKnow[], howIllShowIt[], languageIllNeed[], iAskMyself[], watchFix[{watch,fix}].`;
    schema = {};
  } else {
    prompt = `Create an anchor chart for: "${topic}". Return JSON: {title, subtitle, sections:[{heading, bullets[]}]} `;
    schema = {};
  }

  try{
    const data = await callModel({
      model: MODEL,
      contents:[{parts:[{text:prompt}]}],
      generationConfig:{ responseMimeType:'application/json' }
    });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    lastChartJSON = JSON.parse(text);
    renderByLayout(chosen, lastChartJSON);
    srStatus.textContent='Chart ready.';
  } catch(e){
    console.error(e);
    errorEl.textContent='Model error. Check console.';
    errorEl.classList.remove('hidden');
  }
}

// ===== Events
btnGen.addEventListener('click', generate);
btnDl.addEventListener('click', ()=>alert('PNG download works once render works'));
btnPDF.addEventListener('click', ()=>alert('PDF download works once render works'));

[layoutSel, hlStyleSel, fontPresetSel, bgStyleSel, toggleBig, toggleEmoji, toggleHand, toggleSticky]
  .forEach(el=> el.addEventListener('change', ()=> lastChartJSON && renderByLayout(layoutSel.value === 'auto' ? 'standard' : layoutSel.value, lastChartJSON)));

setAccent('#f59e0b');
setFonts('hand+rounded');
setBackground('lined-light');
refreshHighlights();
