// ===== CONFIG =====
const PROXY = "https://chartie-proxy.onrender.com";
const MODEL = "models/gemini-2.5-flash";

// ===== Refs
const topicEl = document.getElementById('topic');
const btnGen = document.getElementById('btn-generate');
const errorEl = document.getElementById('error');
const sheet = document.getElementById('sheet');
const titleEl = document.getElementById('chart-title');
const subEl = document.getElementById('chart-sub');
const contentEl = document.getElementById('chart-content');
const formatBadge = document.getElementById('format-badge');

const layoutSel = document.getElementById('layout');
const hlStyleSel = document.getElementById('hlStyle');

// ===== State
let lastChartJSON = null;

// ===== Helpers
function startLoading(){
  btnGen.disabled=true;
  btnGen.textContent='Creating…';
}
function stopLoading(){
  btnGen.disabled=false;
  btnGen.textContent='Create Chart';
}

// ===== Standards Renderer
function renderStandards(obj) {
  contentEl.innerHTML = '';
  titleEl.textContent = obj.title || topicEl.value;
  subEl.textContent = '';
  formatBadge.textContent = 'Format: Standards Breakdown';

  const big = document.createElement('div');
  big.className = 'card';
  big.innerHTML = `
    <h3 class="marker-h"><span class="hl hl-clean">Big Idea</span></h3>
    <p>${obj.bigIdea}</p>
  `;
  contentEl.appendChild(big);

  const mid = document.createElement('div');
  mid.className = 'grid gap-3 md:grid-cols-2';
  mid.innerHTML = `
    <div class="card">
      <h3 class="marker-h"><span class="hl hl-clean">I’ll Know…</span></h3>
      <ul class="pretty-list list-disc pl-6">${obj.illKnow.map(x=>`<li>${x}</li>`).join('')}</ul>
    </div>
    <div class="card">
      <h3 class="marker-h"><span class="hl hl-clean">How I’ll Show It…</span></h3>
      <ul class="pretty-list list-disc pl-6">${obj.howIllShowIt.map(x=>`<li>${x}</li>`).join('')}</ul>
    </div>
  `;
  contentEl.appendChild(mid);

  const mid2 = document.createElement('div');
  mid2.className = 'grid gap-3 md:grid-cols-2';
  mid2.innerHTML = `
    <div class="card">
      <h3 class="marker-h"><span class="hl hl-clean">Language I’ll Need…</span></h3>
      <ul class="pretty-list list-disc pl-6">${obj.languageIllNeed.map(x=>`<li>${x}</li>`).join('')}</ul>
    </div>
    <div class="card">
      <h3 class="marker-h"><span class="hl hl-clean">I Ask Myself…</span></h3>
      <ul class="pretty-list list-disc pl-6">${obj.iAskMyself.map(x=>`<li>${x}</li>`).join('')}</ul>
    </div>
  `;
  contentEl.appendChild(mid2);

  const wf = document.createElement('div');
  wf.className = 'card';
  wf.innerHTML = `
    <h3 class="marker-h"><span class="hl hl-clean">Be Careful → Instead</span></h3>
    <div class="grid gap-2">
      ${obj.watchFix.map(p=>`
        <div class="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
          <div class="text-rose-700">⚠️ ${p.watch}</div>
          <div class="font-bold">→</div>
          <div class="text-emerald-700">✅ ${p.fix}</div>
        </div>
      `).join('')}
    </div>
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
  const topic = topicEl.value.trim();
  const layout = layoutSel.value;

  if(!topic){
    errorEl.textContent = 'Please enter a standard.';
    errorEl.classList.remove('hidden');
    return;
  }

  errorEl.classList.add('hidden');
  startLoading();

  let prompt, schema;

  if(layout === 'standards'){
    prompt = `You are Chartie. Decode this standard into student-friendly classroom language:

"${topic}"

Return ONLY JSON:
{
  "title": "Standard label",
  "bigIdea": "Student-friendly meaning",
  "illKnow": ["..."],
  "howIllShowIt": ["..."],
  "languageIllNeed": ["..."],
  "iAskMyself": ["..."],
  "watchFix": [{"watch":"...","fix":"..."}]
}`;

    schema = {
      type:'object',
      properties:{
        title:{type:'string'},
        bigIdea:{type:'string'},
        illKnow:{type:'array',items:{type:'string'}},
        howIllShowIt:{type:'array',items:{type:'string'}},
        languageIllNeed:{type:'array',items:{type:'string'}},
        iAskMyself:{type:'array',items:{type:'string'}},
        watchFix:{type:'array',items:{
          type:'object',
          properties:{watch:{type:'string'},fix:{type:'string'}},
          required:['watch','fix']
        }}
      },
      required:['title','bigIdea','illKnow','howIllShowIt','languageIllNeed','iAskMyself','watchFix']
    };
  }

  try{
    const {ok,data} = await callModel({
      model: MODEL,
      contents:[{parts:[{text:prompt}]}],
      generationConfig:{ responseMimeType:'application/json', responseSchema:schema }
    });

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    lastChartJSON = JSON.parse(text);

    if(layout === 'standards'){
      renderStandards(lastChartJSON);
    }

  } catch(e){
    console.error(e);
    errorEl.textContent = 'Chart generation failed.';
    errorEl.classList.remove('hidden');
  } finally{
    stopLoading();
  }
}

btnGen.addEventListener('click', generate);
