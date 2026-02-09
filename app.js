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

const stickyBox = document.getElementById('sticky');
const stickyH = document.getElementById('sticky-h');
const stickyP = document.getElementById('sticky-p');
const stickyControls = document.getElementById('sticky-controls');
const stickyTitle = document.getElementById('sticky-title');
const stickyText = document.getElementById('sticky-text');

const accentButtons = [...document.querySelectorAll('.swatch')];

// ===== State
let lastChartJSON = null;

const simpleLayouts = new Set([
  'simple-title-body','simple-2col','simple-3col','simple-2x2',
  'simple-title-sub-3','simple-title-sub-list','simple-quote',
  'simple-def-callout','simple-objective-steps','simple-image'
]);

function isSimpleLayout(v){ return simpleLayouts.has(v); }

// ===== Helpers
function setAccent(hex){
  document.documentElement.style.setProperty('--accent', hex);
  const acc = hex.replace('#','%23');
  const url = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 12' preserveAspectRatio='none'><path d='M2 9 Q 22 2, 42 8 T 98 8' fill='none' stroke='${acc}' stroke-width='6' stroke-linecap='round'/></svg>")`;
  document.documentElement.style.setProperty('--brush-url', url);
  refreshHighlights();
}

function setFonts(preset){
  if(preset === 'hand+rounded'){
    document.documentElement.style.setProperty('--title-font', "'Patrick Hand', cursive");
    document.documentElement.style.setProperty('--body-font', "'Poppins', system-ui, -apple-system, Segoe UI, Roboto, sans-serif");
  } else if(preset === 'serif+rounded'){
    document.documentElement.style.setProperty('--title-font', "'DM Serif Display', serif");
    document.documentElement.style.setProperty('--body-font', "'Nunito Sans', system-ui, -apple-system, Segoe UI, Roboto, sans-serif");
  } else if(preset === 'hand+sans'){
    document.documentElement.style.setProperty('--title-font', "'Patrick Hand', cursive");
    document.documentElement.style.setProperty('--body-font', "'Nunito Sans', system-ui, -apple-system, Segoe UI, Roboto, sans-serif");
  } else {
    document.documentElement.style.setProperty('--title-font', "'Nunito Sans', system-ui, -apple-system, Segoe UI, Roboto, sans-serif");
    document.documentElement.style.setProperty('--body-font', "'Nunito Sans', system-ui, -apple-system, Segoe UI, Roboto, sans-serif");
  }
}

function setBackground(style){
  sheet.classList.remove('bg-lined-light','bg-lined-dark','bg-blank','bg-graph','bg-poster');
  sheet.classList.add(
    style==='lined-dark' ? 'bg-lined-dark' :
    style==='blank' ? 'bg-blank' :
    style==='graph' ? 'bg-graph' :
    style==='poster' ? 'bg-poster' :
    'bg-lined-light'
  );
}

function refreshHighlights(){
  const style = hlStyleSel.value;
  const els = sheet.querySelectorAll('.hl');
  els.forEach(el=>{
    el.classList.remove('hl-clean','hl-brush','hl-none');
    el.classList.add(style==='brush'?'hl-brush': style==='none'?'hl-none':'hl-clean');
  });
}

function looksLikeComparison(t){
  return /(vs\.?|compare|comparison|two sides|for and against|perspective)/i.test(t||'');
}
function looksMathy(t){
  return /[=±×÷\/]|equation|solve|fraction|area|perimeter|volume|slope/i.test(t||'');
}

// ===== Rendering
function makeCard(title, html){
  const d=document.createElement('div'); 
  d.className='card';
  d.innerHTML = `<h3 class="marker-h"><span class="hl hl-clean">${title}</span></h3>${html}`;
  return d;
}

function renderStandards(obj) {
  contentEl.innerHTML = '';

  contentEl.appendChild(makeCard('Big Idea', `<p>${obj.bigIdea}</p>`));

  const mid = document.createElement('div');
  mid.className = 'grid gap-3 md:grid-cols-2';
  mid.appendChild(makeCard("I’ll Know…", `<ul class="pretty-list list-disc pl-6">${obj.illKnow.map(x=>`<li>${x}</li>`).join('')}</ul>`));
  mid.appendChild(makeCard("How I’ll Show It…", `<ul class="pretty-list list-disc pl-6">${obj.howIllShowIt.map(x=>`<li>${x}</li>`).join('')}</ul>`));
  contentEl.appendChild(mid);

  const mid2 = document.createElement('div');
  mid2.className = 'grid gap-3 md:grid-cols-2';
  mid2.appendChild(makeCard("Language I’ll Need…", `<ul class="pretty-list list-disc pl-6">${obj.languageIllNeed.map(x=>`<li>${x}</li>`).join('')}</ul>`));
  mid2.appendChild(makeCard("I Ask Myself…", `<ul class="pretty-list list-disc pl-6">${obj.iAskMyself.map(x=>`<li>${x}</li>`).join('')}</ul>`));
  contentEl.appendChild(mid2);

  const wf = document.createElement('div');
  wf.className = 'card';
  wf.innerHTML = `
    <h3 class="marker-h"><span class="hl hl-clean">Be Careful → Instead</span></h3>
    ${obj.watchFix.map(p=>`
      <div class="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        <div class="text-rose-700">⚠️ ${p.watch}</div>
        <div class="font-bold text-slate-400">→</div>
        <div class="text-emerald-700">✅ ${p.fix}</div>
      </div>
    `).join('')}
  `;
  contentEl.appendChild(wf);
}

// ===== Model Call
async function callModel(body){
  const r = await fetch(`${PROXY}/api/generate`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  const data = await r.json();
  return { ok:r.ok, data };
}

// ===== Generate
async function generate(){
  const topic=(topicEl.value||'').trim();
  if(!topic){ errorEl.textContent='Enter a topic.'; errorEl.classList.remove('hidden'); return; }
  errorEl.classList.add('hidden');

  let chosen = layoutSel.value === 'standards'
    ? 'standards'
    : layoutSel.value === 'auto'
      ? (looksMathy(topic) ? 'mathex' : looksLikeComparison(topic) ? 'compare' : 'standard')
      : layoutSel.value;

  let prompt = `
You are Chartie, decoding a K–12 standard into student-friendly classroom language.

Standard: "${topic}"

Return ONLY JSON:
{
  "title": "${topic}",
  "bigIdea": "...",
  "illKnow": ["..."],
  "howIllShowIt": ["..."],
  "languageIllNeed": ["..."],
  "iAskMyself": ["..."],
  "watchFix": [{ "watch": "...", "fix": "..." }]
}`;

  const schema = {
    type:'object',
    properties:{
      title:{type:'string'},
      bigIdea:{type:'string'},
      illKnow:{type:'array',items:{type:'string'}},
      howIllShowIt:{type:'array',items:{type:'string'}},
      languageIllNeed:{type:'array',items:{type:'string'}},
      iAskMyself:{type:'array',items:{type:'string'}},
      watchFix:{type:'array',items:{type:'object'}}
    }
  };

  const {ok,data} = await callModel({
    model: MODEL,
    contents:[{parts:[{text:prompt}]}],
    generationConfig:{responseMimeType:'application/json',responseSchema:schema}
  });

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  lastChartJSON = JSON.parse(text);

  titleEl.textContent = lastChartJSON.title;
  formatBadge.textContent = "Format: Standards Breakdown";
  renderStandards(lastChartJSON);
}

// ===== Events
btnGen.addEventListener('click', generate);
accentButtons.forEach(b=> b.addEventListener('click', ()=> setAccent(b.dataset.color)));

setAccent('#f59e0b');
setFonts('hand+rounded');
setBackground('lined-light');
refreshHighlights();
