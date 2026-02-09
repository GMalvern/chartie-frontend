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
let lastLayout = "standard";

// ===== Helpers
function setAccent(hex){
  document.documentElement.style.setProperty('--accent', hex);
}
function setFonts(preset){
  if(preset === 'hand+rounded'){
    document.documentElement.style.setProperty('--title-font', "'Patrick Hand', cursive");
    document.documentElement.style.setProperty('--body-font', "'Poppins', system-ui");
  } else if(preset === 'serif+rounded'){
    document.documentElement.style.setProperty('--title-font', "'DM Serif Display', serif");
    document.documentElement.style.setProperty('--body-font', "'Nunito Sans', system-ui");
  } else {
    document.documentElement.style.setProperty('--title-font', "'Nunito Sans', system-ui");
    document.documentElement.style.setProperty('--body-font', "'Nunito Sans', system-ui");
  }
}
function setBackground(style){
  sheet.className = `anchor-sheet paper bg-${style}`;
}
function refreshHighlights(){
  const style = hlStyleSel.value;
  sheet.querySelectorAll('.hl').forEach(el=>{
    el.className = `hl ${style === 'none' ? 'hl-none' : style === 'brush' ? 'hl-brush' : 'hl-clean'}`;
  });
}
function applyStyling(){
  sheet.classList.toggle('bigtext', toggleBig.checked);
  setFonts(fontPresetSel.value);
  setBackground(bgStyleSel.value);
  refreshHighlights();
  stickyBox.classList.toggle('hidden', !toggleSticky.checked);
}
function emoji(i){ return toggleEmoji.checked ? ['🎯','🧠','📌','✨'][i%4]+' ' : ''; }

// ===== Renderers
function makeCard(title, html){
  const d=document.createElement('div');
  d.className='card';
  d.innerHTML = `<h3 class="marker-h"><span class="hl">${title}</span></h3>${html}`;
  return d;
}

function renderStandard(data){
  contentEl.innerHTML='';
  data.sections.forEach((s,i)=>{
    contentEl.appendChild(makeCard(
      s.heading,
      `<ul class="pretty-list list-disc pl-6">${s.bullets.map((b,j)=>`<li>${emoji(j)}${b}</li>`).join('')}</ul>`
    ));
  });
}

function renderStandards(obj){
  contentEl.innerHTML='';

  contentEl.appendChild(makeCard("Big Idea", `<p>${obj.bigIdea}</p>`));

  const mid = document.createElement('div');
  mid.className='grid gap-3 md:grid-cols-2';
  mid.innerHTML = `
    <div class="card">
      <h3 class="marker-h"><span class="hl">I’ll Know…</span></h3>
      <ul class="pretty-list list-disc pl-6">${obj.illKnow.map(x=>`<li>${x}</li>`).join('')}</ul>
    </div>
    <div class="card">
      <h3 class="marker-h"><span class="hl">I’ll Show It By…</span></h3>
      <ul class="pretty-list list-disc pl-6">${obj.howIllShowIt.map(x=>`<li>${x}</li>`).join('')}</ul>
    </div>
  `;
  contentEl.appendChild(mid);

  const mid2 = document.createElement('div');
  mid2.className='grid gap-3 md:grid-cols-2';
  mid2.innerHTML = `
    <div class="card">
      <h3 class="marker-h"><span class="hl">Vocabulary</span></h3>
      <div class="grid grid-cols-2 gap-2 text-sm">${obj.vocabulary.map(w=>`<div>• ${w}</div>`).join('')}</div>
    </div>
    <div class="card">
      <h3 class="marker-h"><span class="hl">I Ask Myself…</span></h3>
      <ul class="pretty-list list-disc pl-6">${obj.iAskMyself.map(x=>`<li>${x}</li>`).join('')}</ul>
    </div>
  `;
  contentEl.appendChild(mid2);

  const wf = document.createElement('div');
  wf.className='grid gap-3 md:grid-cols-2';
  wf.innerHTML = `
    <div class="card">
      <h3 class="marker-h"><span class="hl">Be Careful…</span></h3>
      ${obj.watchFix.map(p=>`<div class="text-rose-700">⚠️ ${p.watch}</div>`).join('')}
    </div>
    <div class="card">
      <h3 class="marker-h"><span class="hl">Instead…</span></h3>
      ${obj.watchFix.map(p=>`<div class="text-emerald-700">✅ ${p.fix}</div>`).join('')}
    </div>
  `;
  contentEl.appendChild(wf);
}

// ===== AI
async function generate(){
  const topic = topicEl.value.trim();
  if(!topic){ errorEl.textContent="Type a standard or topic."; errorEl.classList.remove('hidden'); return; }

  errorEl.classList.add('hidden');
  btnGen.disabled=true;

  let layout = layoutSel.value === 'auto' ? 'standard' : layoutSel.value;
  lastLayout = layout;

  let prompt = layout === 'standards'
    ? `You are Chartie. Decode this standard into a SHORT, student-friendly wall poster in teacher voice.

Standard: "${topic}"

Return ONLY JSON:
{
  "title": "${topic}",
  "bigIdea": "One punchy sentence in teacher voice",
  "illKnow": ["short", "high-leverage", "skills"],
  "howIllShowIt": ["starting with -ing", "lowercase"],
  "vocabulary": ["5-8 essential words"],
  "iAskMyself": ["thinking prompts"],
  "watchFix": [{ "watch": "...", "fix": "..." }]
}`
    : `Create a short anchor chart for "${topic}" with 3 sections. Return JSON {title, sections:[{heading, bullets[]}]} `;

  const res = await fetch(`${PROXY}/api/generate`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      model:MODEL,
      contents:[{parts:[{text:prompt}]}]
    })
  });

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  lastChartJSON = JSON.parse(text);

  titleEl.textContent = lastChartJSON.title || topic;
  subEl.textContent = "";

  if(layout === 'standards') renderStandards(lastChartJSON);
  else renderStandard(lastChartJSON);

  applyStyling();
  btnGen.disabled=false;
}

// ===== Downloads
btnDl.onclick = async()=>{
  const canvas = await html2canvas(sheet,{scale:2,backgroundColor:'#fff9e8'});
  const a=document.createElement('a');
  a.href=canvas.toDataURL(); a.download='chart.png'; a.click();
};
btnPDF.onclick = async()=>{
  const {jsPDF}=window.jspdf;
  const canvas = await html2canvas(sheet,{scale:2,backgroundColor:'#fff9e8'});
  const pdf=new jsPDF({orientation:orientSel.value});
  pdf.addImage(canvas.toDataURL(),'PNG',10,10,190,0);
  pdf.save('chart.pdf');
};

// ===== Events
btnGen.onclick=generate;
[layoutSel, hlStyleSel, fontPresetSel, bgStyleSel, toggleBig, toggleEmoji, toggleHand, toggleSticky]
.forEach(el=>el.onchange=()=>{ if(lastChartJSON){ layoutSel.value==='standards'?renderStandards(lastChartJSON):renderStandard(lastChartJSON); applyStyling(); }});
accentButtons.forEach(b=>b.onclick=()=>setAccent(b.dataset.color));

setAccent('#f59e0b');
setFonts('hand+rounded');
