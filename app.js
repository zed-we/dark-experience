const app = document.getElementById("app");

const PAGES = {
  WELCOME: "welcome",
  REVEAL: "reveal",
  GATE: "gate",
  FLOW: "flow",
  WIN: "win",
  LOSE: "lose",
};

// ===== SETTINGS =====
const TOTAL_STEPS = 10;
const MUST_PUZZLES_TOTAL = 5;
const MUST_PUZZLES_PASS = 3;

// صفحه آخر (تو متنش رو خودت عوض کن)
const FINAL_WIN_TEXT = `
congratulations!

you made it!

Now you can move on with your life!

close the page.
`;

const FINAL_LOSE_TEXT = `
YOU LOST.

Not enough puzzles solved.

You will die alone in silence.

`;

let state = {
  page: PAGES.WELCOME,

  ip: "?.?.?.?",
  ipLoaded: false,

  flow: [],
  step: 0,

  // score (نمایش داده نمی‌شود)
  mustPuzzleCorrect: 0,
  mustPuzzleSeen: 0,
  mustPuzzleIndex: 0,  // counts must puzzles shown so far

  answers: {},

  // glitch
  glitchDone: false,
  glitchEl: null,
};

////////////////////////////
// BANKS
////////////////////////////

// 5 پازل جواب‌دار
const MUST_PUZZLES = [
  {
    id: "mp1",
    text:
      "You enter a room with four walls and one chair.\nNo windows. No sound.\n\n" +
      "When you sit, the feeling of being watched grows stronger.\n" +
      "When you stand, it weakens.\n\n" +
      "Nothing in the room moves.\nNothing changes position.\n\n" +
      "What is watching you?",
    solutions: ["mind", "your mind", "awareness", "imagination", "fear", "your fear"],
  },
  {
    id: "mp2",
    text:
      "There is a door that is always open,\n" +
      "yet no one can pass through it.\n\n" +
      "You use it every day.\n" +
      "You fear it at night.\n" +
      "You close your eyes near it.\n\n" +
      "What is the door?",
    solutions: ["eye", "eyes", "your eyes"],
  },
  {
    id: "mp3",
    text:
      "It follows you in every room.\n" +
      "It copies your shape.\n" +
      "It moves when you move.\n" +
      "It disappears in total darkness.\n\n" +
      "It has no eyes — but it sees your outline perfectly.\n\n" +
      "What is it?",
    solutions: ["shadow", "your shadow"],
  },
  {
    id: "mp4",
    text:
      "When you are alone, it grows.\n" +
      "When you speak, it fades.\n" +
      "When you listen, it returns.\n\n" +
      "It has no body.\nNo voice.\nNo shape.\n\n" +
      "Yet it fills the room.\n\n" +
      "What is it?",
    solutions: ["silence"],
  },
  {
    id: "mp5",
    text:
      "You look at the clock: 02:14\n" +
      "You blink.\n" +
      "It says: 02:16\n\n" +
      "You did not move.\nYou did not sleep.\nYou did not leave.\n\n" +
      "Where did the minute go?",
    solutions: ["attention", "focus", "perception", "your attention", "a lapse", "lapse"],
  },
];

// سوال‌ها
const QUESTIONS = [
  { id: "q1", text: "Are you alone right now?", choices: ["Yes", "No"] },
  { id: "q2", text: "Is it quiet where you are?", choices: ["Yes", "No"] },
  { id: "q3", text: "Do you prefer silence or noise?", choices: ["Silence", "Noise"] },
  { id: "q4", text: "Would you choose light — or shadow?", choices: ["Light", "Shadow"] },
  { id: "q5", text: "Would you look behind you if asked?", choices: ["Yes", "No"] },
  { id: "q6", text: "Do you trust what you see?", choices: ["Yes", "No"] },
  { id: "q7", text: "Is your door locked?", choices: ["Yes", "No"] },
  { id: "q8", text: "Is your phone face up right now?", choices: ["Yes", "No"] },
];

// پیام‌های بدون پاسخ (زمان هر کدوم رو همینجا عوض کن)
const SHOCKS = [
  {
    id: "s1",
    text: (a) => {
      const alone = a.q1; // Yes/No
      if (alone === "Yes") return "Good.\nNo interruptions.";
      if (alone === "No") return "They won’t help you.\nThey never do.";
      return "Someone is here.\nEven if you say they aren’t.";
    },
    seconds: 8
  },
  {
    id: "s2",
    text: (a) => {
      const locked = a.q7; // Is your door locked? Yes/No
      if (locked === "Yes") return "Locked doors are for comfort.\nNot safety.";
      if (locked === "No") return "So it’s open.\nThat explains a lot.";
      return "Doors don’t stop thoughts.\nOr footsteps.";
    },
    seconds: 9
  },
  {
    id: "s3",
    text: (a) => {
      const quiet = a.q2; // Is it quiet? Yes/No
      if (quiet === "Yes") return "Quiet is never empty.\nListen again.";
      if (quiet === "No") return "If it’s not quiet...\nwhy did you hear that one sound?";
      return "Sound is a liar.\nSilence is worse.";
    },
    seconds: 9
  },

  // بقیه شوک‌های قبلی‌ات هم می‌تونن بمونن:
  { id: "s4", text: "You missed a detail earlier.", seconds: 8 },
  { id: "s5", text: "Something changed.", seconds: 7 },
  { id: "s6", text: "Did you turn off the gas?", seconds: 9 },
];


// پازل‌های تفسیری (امتیاز ندارن)
const SOFT_PUZZLES = [
  {
    id: "sp1",
    text:
      "If a mirror shows what is in front,\n" +
      "and nothing is in front of you,\n" +
      "why are you still visible?",
  },
  {
    id: "sp2",
    text:
      "The place that feels safest is the place you check the most.\n\n" +
      "The more you check it, the less safe it feels.\n\n" +
      "Why?",
  },
  {
    id: "sp3",
    text:
      "You hide in darkness.\nYou stay silent.\nYou lock the door.\n\n" +
      "Yet you are still found.\n\n" +
      "What did you forget to hide?",
  },
];

////////////////////////////
// UTIL
////////////////////////////

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[m]));
}

function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

async function fetchIP(){
  try{
    const res = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    const data = await res.json();
    return data.ip || "?.?.?.?";
  }catch{
    return "?.?.?.?";
  }
}

function deviceInfo(){
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  const lang = navigator.language || "Unknown";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
  const screenSize = `${screen.width}×${screen.height}`;

  let browser = "Unknown";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";

  return {
    Home: state.ipLoaded ? state.ip : "...",
    Device: isMobile ? "Mobile" : "Desktop",
    Browser: browser,
    Language: lang,
    Screen: screenSize,
    Timezone: tz,
  };
}

// ===== Chalk helpers (wrap lines) =====
function wrapLine(line, maxChars = 44){
  const words = line.split(" ");
  const out = [];
  let cur = "";

  for(const w of words){
    if(!cur){ cur = w; continue; }
    if((cur + " " + w).length <= maxChars) cur += " " + w;
    else { out.push(cur); cur = w; }
  }
  if(cur) out.push(cur);

  const final = [];
  for(const s of out){
    if(s.length <= maxChars) final.push(s);
    else for(let i=0;i<s.length;i+=maxChars) final.push(s.slice(i, i+maxChars));
  }
  return final;
}

function toChalkLines(text){
  const raw = String(text).split("\n");
  const lines = [];
  for(const r of raw){
    const t = r.trim();
    if(t === "") { lines.push("__SPACER__"); continue; }
    lines.push(...wrapLine(t, 44));
  }
  return lines;
}

function chalkLineHTML(lineText, delaySec){
  const isSpacer = (lineText === "__SPACER__");
  const safe = escapeHtml(lineText);
  const visibleText = isSpacer ? " " : safe;

  const len = visibleText.length;
  const t = Math.max(1.6, Math.min(5.0, len * 0.10));
  const steps = Math.max(10, Math.min(80, len));
  const w = Math.max(6, Math.min(60, len + 2));

  return {
    html: `
      <div class="chalkLine ${isSpacer ? "spacer" : ""}">
        <span class="write dust"
          style="--d:${delaySec}s; --w:${w}ch; --steps:${steps}; --t:${t}s;"
        >${visibleText}</span>
      </div>
    `,
    duration: t
  };
}

function renderChalkSequence(textOrLines, startDelay = 0.45, gap = 0.7){
  const lines = Array.isArray(textOrLines) ? textOrLines : toChalkLines(textOrLines);
  let delay = startDelay;
  let html = "";

  for(const ln of lines){
    const piece = chalkLineHTML(ln, delay);
    html += piece.html;
    delay += piece.duration + gap;
  }

  const totalSec = delay + 0.15;
  return { html, totalSec };
}

// ===== Must puzzle answer check =====
function normalizeAnswer(s){
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function isCorrectMustPuzzle(puzzle, userAnswer){
  const ans = normalizeAnswer(userAnswer);
  return puzzle.solutions.some(key => ans.includes(normalizeAnswer(key)));
}

function pad2(n){
  return String(n).padStart(2, "0");
}

// ===== Smart shuffle (no annoying repeats) =====
function smartShuffle(items){
  const src = shuffle(items);
  const out = [];
  let lastType = null;
  let lastId = null;

  let guard = 0;
  while(src.length && guard < 10000){
    guard++;
    const idx = Math.floor(Math.random()*src.length);
    const it = src[idx];

    if(it.id === lastId) continue;
    if(it.type === lastType) continue;
    if(it.type === "shock" && lastType === "shock") continue;

    out.push(it);
    lastType = it.type;
    lastId = it.id;
    src.splice(idx,1);
  }

  return out.concat(src);
}

////////////////////////////
// MICRO GLITCH
////////////////////////////

function ensureGlitchEl(){
  if(state.glitchEl) return;
  const el = document.createElement("div");
  el.className = "glitchOverlay";
  document.body.appendChild(el);
  state.glitchEl = el;
}

function triggerGlitch(){
  ensureGlitchEl();
  state.glitchEl.classList.remove("on");
  void state.glitchEl.offsetWidth;
  state.glitchEl.classList.add("on");
  state.glitchDone = true;
}

////////////////////////////
// ECHO (personalization)
////////////////////////////

function pickEchoText(){
  const a = state.answers || {};

  const alone = a.q1 === "Yes";
  const quiet = a.q2 === "Yes";
  const prefer = a.q3; // Silence / Noise
  const shadow = a.q4; // Light / Shadow
  const behind = a.q5 === "Yes";

  const lines = [];
  lines.push("We don’t guess.");
  lines.push("We collect.");
  lines.push("");

  if(prefer){
    lines.push(`You chose ${prefer.toLowerCase()}.`);
    if(prefer === "Silence") lines.push("Silence is where thoughts get loud.");
    else lines.push("Noise is where fear hides.");
    lines.push("");
  }

  if(shadow){
    lines.push(`You leaned toward ${shadow.toLowerCase()}.`);
    if(shadow === "Shadow") lines.push("Shadow is honest. It doesn’t pretend.");
    else lines.push("Light shows details. Not truth.");
    lines.push("");
  }

  if(alone){
    lines.push("You said you are alone.");
    lines.push("That makes this cleaner.");
    lines.push("");
  } else if (a.q1 === "No"){
    lines.push("You said you are not alone.");
    lines.push("Yet you answered alone.");
    lines.push("");
  }

  if(quiet){
    lines.push("You said it is quiet.");
    lines.push("Quiet is never empty.");
    lines.push("");
  } else if (a.q2 === "No"){
    lines.push("You said it is not quiet.");
    lines.push("Then why did you hear that?");
    lines.push("");
  }

  if(behind){
    lines.push("You would look behind you if asked.");
    lines.push("Good.");
    lines.push("Don’t do it yet.");
  } else if (a.q5 === "No"){
    lines.push("You would not look behind you.");
    lines.push("That’s the smartest lie tonight.");
  } else {
    lines.push("You didn’t answer everything.");
    lines.push("That’s also an answer.");
  }

  lines.push("");
  lines.push("Continue.");

  return lines.join("\n");
}

function renderEcho(){
  const text = pickEchoText();
  const seq = renderChalkSequence(text, 0.45, 0.7);

  app.innerHTML = `
    <div class="scene dark">
      <section class="card flat fadein">
        <div class="cardContent">
          ${renderProgress()}
          <div class="chalkStage">
            <div class="chalkTitle">ECHO</div>
            ${seq.html}
          </div>
        </div>

        <div class="cardActions">
          <button class="btn danger hidden" id="echoGo">Continue</button>
        </div>
      </section>
    </div>
  `;

  setTimeout(() => {
    const b = document.getElementById("echoGo");
    b.classList.remove("hidden");
    b.onclick = nextStep;
  }, seq.totalSec * 1000);
}

////////////////////////////
// FLOW BUILD (10 steps, no duplicates)
////////////////////////////

function buildFlow(){
  // 5 must puzzles
  const must = MUST_PUZZLES.slice(0, MUST_PUZZLES_TOTAL).map(p => ({
    type: "must_puzzle",
    id: p.id,
    payload: p
  }));

  // echo (unique)
  const echoItem = { type:"echo", id:"echo1", payload:null };

  // extras pool (unique)
  const poolUnique = shuffle([
    ...QUESTIONS.map(q => ({ type:"question", id:q.id, payload:q })),
    ...SHOCKS.map(s => ({ type:"shock", id:s.id, payload:s })),
    ...SOFT_PUZZLES.map(p => ({ type:"soft_puzzle", id:p.id, payload:p })),
  ]);

  // TOTAL=10: must(5) + echo(1) => extras = 4
  const extrasNeeded = TOTAL_STEPS - must.length - 1;
  const extras = poolUnique.slice(0, Math.max(0, extrasNeeded));

  const result = [...must, ...extras, echoItem];
  return smartShuffle(result);
}

////////////////////////////
// ROUTER
////////////////////////////

function render(){
  if(state.page === PAGES.WELCOME) return renderWelcome();
  if(state.page === PAGES.REVEAL) return renderReveal();
  if(state.page === PAGES.GATE) return renderGate();
  if(state.page === PAGES.FLOW) return renderFlow();
  if(state.page === PAGES.WIN) return renderWin();
  if(state.page === PAGES.LOSE) return renderLose();
}

////////////////////////////
// PAGES
////////////////////////////

function renderWelcome(){
  app.innerHTML = `
    <div class="scene welcome">
      <div class="fog"></div>
      <div class="fog2"></div>
      <div class="grain"></div>

      <section class="card fadein">
        <h1>Welcome.</h1>
        <p>This is a short psychological experience.</p>
        <button class="btn danger" id="startBtn">Start</button>
      </section>
    </div>
  `;

  document.getElementById("startBtn").onclick = async () => {
    state.page = PAGES.REVEAL;
    state.ipLoaded = false;
    state.ip = "?.?.?.?";
    render();

    state.ip = await fetchIP();
    state.ipLoaded = true;
    render();
  };
}

function renderReveal(){
  const info = deviceInfo();
  const lines = [
    "It writes by itself.",
    `Home: ${info.Home}`,
    `Device: ${info.Device}`,
    `Timezone: ${info.Timezone}`,
    "You didn’t type any of this.",
  ];

  const seq = renderChalkSequence(lines, 0.55, 0.70);

  app.innerHTML = `
    <div class="scene dark">
      <section class="card flat fadein">
        <div class="cardContent">
          <div class="chalkStage">
            <div class="chalkTitle">REVEAL</div>
            ${seq.html}
          </div>
        </div>

        <div class="cardActions">
          <button class="btn danger hidden" id="continueBtn">Continue</button>
        </div>
      </section>
    </div>
  `;

  setTimeout(() => {
    const btn = document.getElementById("continueBtn");
    if(!btn) return;
    btn.classList.remove("hidden");
    btn.disabled = false;
    btn.style.pointerEvents = "auto";
    btn.onclick = () => {
      state.page = PAGES.GATE;
      render();
    };
  }, Math.ceil(seq.totalSec * 1000));
}

function renderGate(){
  const gateText =
    `You will face ${TOTAL_STEPS} steps.\n\n` +
    `Among them: ${MUST_PUZZLES_TOTAL} puzzles.\n` +
    `Solve at least ${MUST_PUZZLES_PASS}.\n\n` +
    "Do you understand?";

  const seq = renderChalkSequence(gateText, 0.5, 0.75);

  app.innerHTML = `
    <div class="scene dark">
      <section class="card flat fadein">
        <div class="cardContent">
          <div class="chalkStage">
            <div class="chalkTitle">RULE</div>
            ${seq.html}
          </div>
        </div>

        <div class="cardActions">
          <button class="btn danger hidden" id="goBtn">Proceed</button>
        </div>
      </section>
    </div>
  `;

  setTimeout(() => {
    const btn = document.getElementById("goBtn");
    if(!btn) return;

    btn.classList.remove("hidden");
    btn.disabled = false;
    btn.style.pointerEvents = "auto";

    btn.onclick = () => {
      try{
        state.flow = buildFlow();
        state.step = 0;
        state.mustPuzzleCorrect = 0;
        state.mustPuzzleSeen = 0;

        // glitch reset
        state.glitchDone = false;
        state.mustPuzzleIndex = 0;

        state.page = PAGES.FLOW;
        render();
      }catch(e){
        console.error(e);
        alert("Error: " + e.message);
      }
    };
  }, Math.ceil(seq.totalSec * 1000));
}

function renderFlow(){
  const item = state.flow[state.step];

  // پایان 10 مرحله → نتیجه
  if(!item){
    if(state.mustPuzzleCorrect >= MUST_PUZZLES_PASS) state.page = PAGES.WIN;
    else state.page = PAGES.LOSE;
    render();
    return;
  }

  if(item.type === "shock") return renderShock(item.payload);
  if(item.type === "question") return renderQuestion(item.payload);
  if(item.type === "must_puzzle") return renderMustPuzzle(item.payload);
  if(item.type === "soft_puzzle") return renderSoftPuzzle(item.payload);
  if(item.type === "echo") return renderEcho();
}

function nextStep(){
  state.step++;
  render();
}

// فقط STEP (بدون امتیاز)
function renderProgress(){
  const now = Math.min(state.step + 1, TOTAL_STEPS);
  return `
    <div class="progressLine">
      <span>STEP ${pad2(now)} / ${TOTAL_STEPS}</span>
      <span></span>
    </div>
  `;
}

////////////////////////////
// STEP TYPES
////////////////////////////

function renderShock(s){
  const t = (typeof s.text === "function") ? s.text(state.answers || {}) : s.text;
  const seq = renderChalkSequence(t, 0.45, 0.7);

  app.innerHTML = `
    <div class="scene dark">
      <section class="card flat fadein">
        <div class="cardContent">
          ${renderProgress()}
          <div class="chalkStage">
            <div class="chalkTitle">...</div>
            ${seq.html}
          </div>
        </div>
      </section>
    </div>
  `;

  const waitSec = Math.max(seq.totalSec, (s.seconds || 8));
  setTimeout(nextStep, waitSec * 1000);
}

function renderQuestion(q){
  const seq = renderChalkSequence(q.text, 0.45, 0.7);

  app.innerHTML = `
    <div class="scene dark">
      <section class="card flat fadein">
        <div class="cardContent">
          ${renderProgress()}
          <div class="chalkStage">
            <div class="chalkTitle">QUESTION</div>
            ${seq.html}
          </div>
        </div>

        <div class="cardActions">
          <div id="btnWrap" class="hidden" style="display:flex; gap:10px; width:100%;">
            <button class="btn" id="c1">${escapeHtml(q.choices[0])}</button>
            <button class="btn" id="c2">${escapeHtml(q.choices[1])}</button>
          </div>
        </div>
      </section>
    </div>
  `;

  setTimeout(() => {
    const wrap = document.getElementById("btnWrap");
    if(!wrap) return;
    wrap.classList.remove("hidden");

    document.getElementById("c1").onclick = () => {
      state.answers[q.id] = q.choices[0];
      nextStep();
    };
    document.getElementById("c2").onclick = () => {
      state.answers[q.id] = q.choices[1];
      nextStep();
    };
  }, Math.ceil(seq.totalSec * 1000));
}

function renderMustPuzzle(p){
  const seq = renderChalkSequence(p.text, 0.45, 0.7);

  app.innerHTML = `
    <div class="scene dark">
      <section class="card flat fadein">
        <div class="cardContent">
          ${renderProgress()}
          <div class="chalkStage" style="width:100%;">
            <div class="chalkTitle">PUZZLE</div>
            ${seq.html}

            <div style="width:100%; margin-top:14px;">
              <textarea id="puzzleInput" class="answerBox" placeholder="Type your answer..."></textarea>
            </div>

            <div class="small" id="puzzleHint"></div>
          </div>
        </div>

        <div class="cardActions">
          <button class="btn danger hidden" id="submitPuzzle">Submit</button>
        </div>
      </section>
    </div>
  `;

  // ✅ micro glitch فقط یک‌بار، دقیقاً روی پازل سوم
  state.mustPuzzleIndex++;

  if(!state.glitchDone && state.mustPuzzleIndex === 3){
   triggerGlitch();
  }


  const input = document.getElementById("puzzleInput");
  const hint = document.getElementById("puzzleHint");

  state.mustPuzzleSeen++;

  setTimeout(() => {
    const btn = document.getElementById("submitPuzzle");
    if(!btn) return;

    btn.classList.remove("hidden");
    btn.onclick = () => {
      const val = (input.value || "").trim();
      if(val.length < 2){
        hint.textContent = "Type an answer.";
        return;
      }

      state.answers[p.id] = val;

      const ok = isCorrectMustPuzzle(p, val);
      if(ok) state.mustPuzzleCorrect++;

      nextStep();
    };
  }, Math.ceil(seq.totalSec * 1000));
}

function renderSoftPuzzle(p){
  const seq = renderChalkSequence(p.text, 0.45, 0.7);

  app.innerHTML = `
    <div class="scene dark">
      <section class="card flat fadein">
        <div class="cardContent">
          ${renderProgress()}
          <div class="chalkStage" style="width:100%;">
            <div class="chalkTitle">PUZZLE</div>
            ${seq.html}

            <div style="width:100%; margin-top:14px;">
              <textarea id="puzzleInput" class="answerBox" placeholder="Type anything..."></textarea>
            </div>

            <div class="small" id="puzzleHint"></div>
          </div>
        </div>

        <div class="cardActions">
          <button class="btn danger hidden" id="submitPuzzle">Submit</button>
        </div>
      </section>
    </div>
  `;

  const input = document.getElementById("puzzleInput");
  const hint = document.getElementById("puzzleHint");

  setTimeout(() => {
    const btn = document.getElementById("submitPuzzle");
    if(!btn) return;

    btn.classList.remove("hidden");
    btn.onclick = () => {
      const val = (input.value || "").trim();
      if(val.length < 2){
        hint.textContent = "Type something.";
        return;
      }
      state.answers[p.id] = val;
      nextStep();
    };
  }, Math.ceil(seq.totalSec * 1000));
}

////////////////////////////
// FINAL PAGES (no score shown)
////////////////////////////

function renderWin(){
  const seq = renderChalkSequence(FINAL_WIN_TEXT, 0.55, 0.75);

  app.innerHTML = `
    <div class="scene dark">
      <section class="card flat fadein">
        <div class="cardContent">
          <div class="chalkStage">
            <div class="chalkTitle">FINAL</div>
            ${seq.html}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderLose(){
  const seq = renderChalkSequence(FINAL_LOSE_TEXT, 0.55, 0.75);

  app.innerHTML = `
    <div class="scene dark">
      <section class="card flat fadein">
        <div class="cardContent">
          <div class="chalkStage">
            <div class="chalkTitle">LOSE</div>
            ${seq.html}
          </div>
        </div>
      </section>
    </div>
  `;
}

render();
