/* ============================================================
   FOCUS TREE — app logic
   Depends on globals from plants.js, achievements.js, storage.js
   (loaded before this file in index.html).
   ============================================================ */

/* ---------------- app state ---------------- */
let currentUid = null;        // Firebase Auth uid
let currentUser = null;       // display username
let userData = null;
let view = 'login';           // login | home
let homeTab = 'grow';         // grow | garden | achievements
let loginStep = { mode: 'signin', username: '', error: '', busy: false }; // mode: signin | signup
let tickHandle = null;

const $ = sel => document.querySelector(sel);
const app = $('#app');

function plantById(id) { return PLANT_TYPES.find(p => p.id === id); }
function isUnlocked(p, d) { return !p.unlock || (p.unlock.type === 'totalPlanted' && d.totalPlanted >= p.unlock.value); }
function fmtTime(totalSeconds) {
  totalSeconds = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(totalSeconds / 60), s = totalSeconds % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
function rand(min, max) { return min + Math.random() * (max - min); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toast(msg) {
  const wrap = $('#toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ============================================================
   SUN SCHEDULE — precomputed for the whole session so the
   growth math is a pure function of elapsed wall-clock time.
   Growth speeds up 25-50% while a sunburst is active.
   ============================================================ */
function generateSunSchedule(totalSeconds) {
  const events = [];
  let t = rand(30, 90);
  while (t < totalSeconds - 15) {
    const dur = Math.min(rand(20, 45), totalSeconds - t - 5);
    const mult = 1.25 + Math.random() * 0.25; // 25% - 50% faster
    events.push({ start: t, dur, mult, clicked: false });
    t += dur + rand(60, 180);
  }
  return events;
}
function activeSecondsOf(session, now) {
  let pausedMs = session.totalPausedMs || 0;
  if (session.status === 'paused' && session.pauseStartedAt) pausedMs += (now - session.pauseStartedAt);
  return Math.max(0, (now - session.startTime - pausedMs) / 1000);
}
function effectiveSecondsOf(session, activeSeconds) {
  let extra = 0;
  for (const ev of session.sunSchedule) {
    if (activeSeconds <= ev.start) continue;
    const overlap = Math.min(activeSeconds, ev.start + ev.dur) - ev.start;
    if (overlap > 0) extra += overlap * (ev.mult - 1);
  }
  return activeSeconds + extra;
}
function currentSunEvent(session, activeSeconds) {
  return session.sunSchedule.find(ev => activeSeconds >= ev.start && activeSeconds < ev.start + ev.dur) || null;
}

/* ============================================================
   PLANT ART — supports emoji strings ("🌱") or your own image
   files ("art/daisy/stage-1.png", "art/daisy/stage-1.svg").
   Any stage value containing an image extension is drawn as an
   <img>; anything else is drawn as text (emoji).
   ============================================================ */
function isImagePath(v) {
  return /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(v);
}
function setStageDisplay(el, value) {
  if (isImagePath(value)) {
    el.innerHTML = `<img src="${value}" alt="" style="width:100%;height:100%;object-fit:contain;">`;
  } else {
    el.textContent = value;
  }
}

/* ============================================================
   RENDER: LOGIN
   ============================================================ */
function renderLogin() {
  const isSignup = loginStep.mode === 'signup';
  let inner = `
    <div class="brand">
      <span class="mark">🌳</span>
      <h1>Focus Tree</h1>
      <p>Start a focus session. Leave it running. Watch something grow.</p>
    </div>
    <div class="card">
      <div class="eyebrow">${isSignup ? 'New gardener' : 'Welcome back'}</div>
      <h3 style="margin-bottom:14px;">${isSignup ? 'Create your account' : 'Log in'}</h3>
      <div class="field">
        <label for="login-username">Username</label>
        <input type="text" id="login-username" placeholder="Your username" value="${escapeHtml(loginStep.username)}">
      </div>
      <div class="field">
        <label for="login-password">Password</label>
        <input type="password" id="login-password" placeholder="${isSignup ? 'Choose a password (6+ characters)' : 'Your password'}">
      </div>
      ${loginStep.error ? `<div class="error-text">${escapeHtml(loginStep.error)}</div>` : ''}
      <button class="btn btn-primary btn-block" id="btn-submit" style="margin-top:14px;" ${loginStep.busy ? 'disabled' : ''}>
        ${loginStep.busy ? 'One moment…' : (isSignup ? 'Start growing' : 'Log in')}
      </button>
      <div class="divider">or</div>
      <button class="btn btn-ghost btn-block" id="btn-switch">${isSignup ? 'I already have an account' : 'Create a new account'}</button>
    </div>
  `;

  app.innerHTML = inner;

  $('#btn-switch').onclick = () => {
    loginStep = { mode: isSignup ? 'signin' : 'signup', username: $('#login-username').value, error: '', busy: false };
    renderLogin();
  };
  $('#btn-submit').onclick = isSignup ? doSignup : doSignin;
  $('#login-password').addEventListener('keydown', e => { if (e.key === 'Enter') (isSignup ? doSignup() : doSignin()); });
}

function friendlyAuthError(e) {
  const code = e && e.code || '';
  if (code.includes('email-already-in-use')) return 'That username is already taken — try another, or log in instead.';
  if (code.includes('weak-password')) return 'Password needs to be at least 6 characters.';
  if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) return "That username or password doesn't match.";
  if (code.includes('invalid-email')) return 'Usernames can only use letters, numbers, and . _ -';
  return "Something went wrong — check your connection and try again.";
}

async function doSignin() {
  const username = $('#login-username').value.trim();
  const password = $('#login-password').value;
  if (!username || !password) { loginStep.error = 'Enter both a username and a password.'; renderLogin(); return; }
  loginStep.username = username; loginStep.busy = true; loginStep.error = ''; renderLogin();
  try {
    const { uid, data } = await signInUser(username, password);
    currentUid = uid; currentUser = data.username || username; userData = data;
    view = 'home'; homeTab = 'grow';
    renderApp();
  } catch (e) {
    loginStep.busy = false; loginStep.error = friendlyAuthError(e); renderLogin();
  }
}

async function doSignup() {
  const username = $('#login-username').value.trim();
  const password = $('#login-password').value;
  if (!username || !password) { loginStep.error = 'Enter both a username and a password.'; renderLogin(); return; }
  loginStep.username = username; loginStep.busy = true; loginStep.error = ''; renderLogin();
  try {
    const { uid, data } = await signUpUser(username, password);
    currentUid = uid; currentUser = username; userData = data;
    view = 'home'; homeTab = 'grow';
    renderApp();
  } catch (e) {
    loginStep.busy = false; loginStep.error = friendlyAuthError(e); renderLogin();
  }
}

function logout() {
  stopTicking();
  signOutUser();
  currentUid = null; currentUser = null; userData = null;
  view = 'login'; loginStep = { mode: 'signin', username: '', error: '', busy: false };
  renderLogin();
}

/* ============================================================
   RENDER: HOME (shell + tabs)
   ============================================================ */
function renderApp() {
  if (view === 'login') { renderLogin(); return; }

  app.innerHTML = `
    <div class="topbar">
      <div class="who">
        <div class="account-avatar">🌿</div>
        <div class="name">${escapeHtml(currentUser)}</div>
      </div>
      <div class="row" style="gap:8px;">
        <div class="fert-pill">🌾 ${userData.fertilizer}</div>
        <button class="icon-btn" id="btn-logout" title="Log out">⏻</button>
      </div>
    </div>
    <div class="tabs">
      <div class="tab ${homeTab === 'grow' ? 'active' : ''}" data-tab="grow">Grow</div>
      <div class="tab ${homeTab === 'garden' ? 'active' : ''}" data-tab="garden">Garden</div>
      <div class="tab ${homeTab === 'achievements' ? 'active' : ''}" data-tab="achievements">Achievements</div>
    </div>
    <div id="tab-content"></div>
  `;
  $('#btn-logout').onclick = logout;
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => { homeTab = t.dataset.tab; renderApp(); };
  });
  renderTabContent();
}

function renderTabContent() {
  stopTicking();
  const el = $('#tab-content');
  if (!el) return;
  if (homeTab === 'grow') {
    if (userData.currentSession) renderGrowing(el);
    else renderPlantPicker(el);
  } else if (homeTab === 'garden') {
    renderGarden(el);
  } else if (homeTab === 'achievements') {
    renderAchievements(el);
  }
}

/* ---------- plant picker ---------- */
function renderPlantPicker(el) {
  el.innerHTML = `
    <p class="muted" style="margin-bottom:12px;">Choose a seed. It grows for as long as its focus time — stay on the page or step away, the timer keeps real time either way.</p>
    <div class="plant-grid">
      ${PLANT_TYPES.map(p => {
        const unlocked = isUnlocked(p, userData);
        const grown = userData.plantCounts[p.id] || 0;
        return `
        <div class="plant-card ${unlocked ? '' : 'locked'}" data-id="${p.id}">
          <div class="plant-icon">${isImagePath(p.stages[3]) ? `<img src="${p.stages[3]}" alt="" style="width:100%;height:100%;object-fit:contain;">` : p.stages[3]}</div>
          <div class="plant-info">
            <div class="plant-name">${p.name}</div>
            <div class="plant-meta">${p.category} · ${p.minutes} min focus${grown ? ` · grown ${grown}×` : ''}</div>
          </div>
          ${unlocked ? '' : `<div class="plant-lock">🔒 Grow ${p.unlock.value}</div>`}
        </div>`;
      }).join('')}
    </div>
  `;
  document.querySelectorAll('.plant-card').forEach(card => {
    const p = plantById(card.dataset.id);
    if (!isUnlocked(p, userData)) return;
    card.onclick = () => startSession(p);
  });
}

async function startSession(plant) {
  const requiredSeconds = plant.minutes * 60;
  userData.currentSession = {
    plantId: plant.id,
    startTime: Date.now(),
    requiredSeconds,
    status: 'running',
    pauseStartedAt: null,
    totalPausedMs: 0,
    sunSchedule: generateSunSchedule(requiredSeconds),
    fertFraction: 0,
    lastFocusCheckpoint: 0,
  };
  await saveUserData(currentUid, userData);
  renderTabContent();
}

/* ---------- growing screen ---------- */
function renderGrowing(el) {
  const session = userData.currentSession;
  const plant = plantById(session.plantId);
  el.innerHTML = `
    <div class="scene" id="scene">
      <div class="cloud" style="top:14px;left:10%;">☁️</div>
      <div class="cloud" style="top:34px;right:14%;">☁️</div>
      <button class="sun-badge" id="sun-badge" style="display:none;">☀️</button>
      <div class="plant-emoji" id="plant-emoji">${plant.stages[0]}</div>
      <div class="ground-fert" id="ground-fert"></div>
    </div>
    <div class="progress-wrap">
      <div class="progress-track"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
      <div class="progress-labels">
        <span id="progress-pct">0%</span>
        <span id="time-left">--:--</span>
      </div>
    </div>
    <div class="session-actions">
      <button class="btn btn-ghost" id="btn-pause">${session.status === 'paused' ? 'Resume' : 'Pause'}</button>
      <button class="btn btn-danger btn-block" id="btn-giveup">Give up</button>
    </div>
  `;
  $('#btn-pause').onclick = togglePause;
  $('#btn-giveup').onclick = showGiveUpConfirm;
  tick(); // immediate paint
  tickHandle = setInterval(tick, 1000);
}

function showGiveUpConfirm() {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box">
      <h3>Give up on this plant?</h3>
      <p class="muted">It will wilt and won't count toward your garden. Any fertilizer you've already earned stays yours.</p>
      <div class="row">
        <button class="btn btn-ghost btn-block" id="cancel-giveup">Keep growing</button>
        <button class="btn btn-danger btn-block" id="confirm-giveup">Give up</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#cancel-giveup').onclick = () => overlay.remove();
  overlay.querySelector('#confirm-giveup').onclick = async () => {
    overlay.remove();
    stopTicking();
    userData.currentSession = null;
    await saveUserData(currentUid, userData);
    renderApp();
  };
}

function stopTicking() { if (tickHandle) { clearInterval(tickHandle); tickHandle = null; } }

async function togglePause() {
  const session = userData.currentSession;
  const now = Date.now();
  if (session.status === 'running') {
    session.status = 'paused';
    session.pauseStartedAt = now;
  } else {
    session.totalPausedMs += (now - session.pauseStartedAt);
    session.pauseStartedAt = null;
    session.status = 'running';
  }
  await saveUserData(currentUid, userData);
  renderTabContent();
}

async function tick() {
  const session = userData.currentSession;
  if (!session) return;
  const plant = plantById(session.plantId);
  const now = Date.now();
  const activeSeconds = activeSecondsOf(session, now);
  const effSeconds = effectiveSecondsOf(session, activeSeconds);
  const pct = Math.min(100, (effSeconds / session.requiredSeconds) * 100);
  const sunEvent = session.status === 'running' ? currentSunEvent(session, activeSeconds) : null;

  // fertilizer accrual: ~3 fertilizer per effective minute
  if (session.status === 'running') {
    const delta = effSeconds - session.lastFocusCheckpoint;
    if (delta > 0) {
      session.lastFocusCheckpoint = effSeconds;
      session.fertFraction += delta / 20; // 1 fertilizer per 20 effective seconds
      userData.totalFocusSeconds += Math.min(delta, activeSeconds); // approx real focus credit
      while (session.fertFraction >= 1) {
        userData.fertilizer += 1;
        session.fertFraction -= 1;
      }
    }
  }

  // UI paint
  const emojiEl = $('#plant-emoji');
  const fillEl = $('#progress-fill');
  const pctEl = $('#progress-pct');
  const timeEl = $('#time-left');
  const sunEl = $('#sun-badge');
  const groundEl = $('#ground-fert');
  if (emojiEl) {
    const stageIdx = pct >= 100 ? 4 : pct >= 75 ? 3 : pct >= 45 ? 2 : pct >= 15 ? 1 : 0;
    setStageDisplay(emojiEl, plant.stages[stageIdx]);
    emojiEl.style.transform = `scale(${0.7 + (pct / 100) * 0.6})`;
  }
  if (fillEl) {
    fillEl.style.width = pct.toFixed(1) + '%';
    fillEl.classList.toggle('boosted', !!sunEvent);
  }
  if (pctEl) pctEl.textContent = Math.floor(pct) + '%';
  if (timeEl) {
    const remainingReal = Math.max(0, session.requiredSeconds - effSeconds);
    timeEl.textContent = pct >= 100 ? 'Ready!' : ('~' + fmtTime(remainingReal) + ' left');
  }
  if (sunEl) {
    if (sunEvent && !sunEvent.clicked) {
      sunEl.style.display = 'flex';
      sunEl.classList.remove('caught');
      sunEl.onclick = async () => {
        sunEvent.clicked = true;
        userData.sunCaught += 1;
        userData.fertilizer += 5;
        toast('☀️ Sunburst caught! +5 fertilizer');
        await saveUserData(currentUid, userData);
        checkAchievements();
      };
    } else if (sunEvent && sunEvent.clicked) {
      sunEl.style.display = 'flex';
      sunEl.classList.add('caught');
      sunEl.onclick = null;
    } else {
      sunEl.style.display = 'none';
    }
  }
  if (groundEl) {
    groundEl.textContent = sunEvent ? `Sunshine is boosting growth ×${sunEvent.mult.toFixed(2)}` : 'Fertilizer collecting quietly…';
  }

  if (pct >= 100) {
    await completeSession(plant);
    return;
  }
  await saveUserData(currentUid, userData);
}

async function completeSession(plant) {
  stopTicking();
  userData.totalPlanted += 1;
  userData.plantCounts[plant.id] = (userData.plantCounts[plant.id] || 0) + 1;
  userData.fertilizer += 10; // completion bonus
  userData.currentSession = null;
  await saveUserData(currentUid, userData);
  toast(`🌸 Your ${plant.name.toLowerCase()} finished growing! +10 fertilizer`);
  checkAchievements();
  renderApp();
}

async function checkAchievements() {
  let unlockedNew = [];
  ACHIEVEMENTS.forEach(a => {
    if (!userData.achievements.includes(a.id) && a.cond(userData)) {
      userData.achievements.push(a.id);
      unlockedNew.push(a);
    }
  });
  await saveUserData(currentUid, userData);
  unlockedNew.forEach(a => toast(`🏆 Achievement unlocked: ${a.name}`));
}

/* ---------- garden tab ---------- */
function renderGarden(el) {
  el.innerHTML = `
    <div class="stat-strip">
      <div class="stat-box"><div class="num">${userData.totalPlanted}</div><div class="lbl">Total grown</div></div>
      <div class="stat-box"><div class="num">${fmtTime(userData.totalFocusSeconds).slice(0, 5)}</div><div class="lbl">Focus time (h:m)</div></div>
      <div class="stat-box"><div class="num">${userData.sunCaught}</div><div class="lbl">Sunbursts caught</div></div>
    </div>
    <div class="garden-grid">
      ${PLANT_TYPES.map(p => {
        const count = userData.plantCounts[p.id] || 0;
        return `<div class="garden-tile ${count ? '' : 'empty'}">
          <div class="emo">${count ? (isImagePath(p.stages[4]) ? `<img src="${p.stages[4]}" alt="" style="width:100%;height:100%;object-fit:contain;">` : p.stages[4]) : '❔'}</div>
          <div class="lbl">${p.name}</div>
          <div class="cnt">${count} grown</div>
        </div>`;
      }).join('')}
    </div>
  `;
}

/* ---------- achievements tab ---------- */
function renderAchievements(el) {
  el.innerHTML = `
    <div class="ach-grid">
      ${ACHIEVEMENTS.map(a => {
        const unlocked = userData.achievements.includes(a.id);
        return `<div class="ach-row ${unlocked ? '' : 'locked'}">
          <div class="ach-icon">${unlocked ? a.icon : '🔒'}</div>
          <div>
            <div class="ach-name">${a.name}</div>
            <div class="ach-desc">${a.desc}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

/* ============================================================
   BACKGROUND STARFIELD (purely decorative, cheap canvas)
   ============================================================ */
function initStars() {
  const canvas = $('#stars');
  const ctx = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  const stars = Array.from({ length: 70 }, () => ({
    x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight * 0.6,
    r: Math.random() * 1.4 + 0.3, tw: Math.random() * Math.PI * 2
  }));
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.tw += 0.02;
      const alpha = 0.35 + Math.sin(s.tw) * 0.35;
      ctx.fillStyle = `rgba(244,236,217,${Math.max(0, alpha)})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ============================================================
   BOOT
   ============================================================ */
async function boot() {
  initStars();
  renderLogin();
}
boot();
