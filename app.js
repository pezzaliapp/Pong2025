/* Pong2025 — Single-folder PWA
   Controls:
   - Touch: drag vertically on your half court
   - Keyboard: W/S (P1), ↑/↓ (P2)
   Modes:
   - Solo vs CPU
   - Two players local
*/

(() => {
  'use strict';

  // ---- Canvas setup (DPR aware) ----
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  function resize() {
    const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const w = Math.min(window.innerWidth, 1000);
    const h = Math.min(window.innerHeight - 20, 700);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * DPR);
    canvas.height = Math.round(h * DPR);
    scaleX = canvas.width / BASE_W;
    scaleY = canvas.height / BASE_H;
  }
  let BASE_W = 800, BASE_H = 450;
  let scaleX = 1, scaleY = 1;
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // ---- Game state ----
  const state = {
    mode: localStorage.getItem('pong_mode') || 'solo', // 'solo' | 'duo'
    speed: localStorage.getItem('pong_speed') || 'normal', // 'slow' | 'normal' | 'fast'
    paused: false,
    p1: { y: BASE_H/2 - 40, score: 0 },
    p2: { y: BASE_H/2 - 40, score: 0 },
    ball: { x: BASE_W/2, y: BASE_H/2, vx: 4, vy: 2, r: 6 },
  };

  function setSpeed(s) {
    state.speed = s;
    localStorage.setItem('pong_speed', s);
    const v = s === 'slow' ? 3 : s === 'fast' ? 6 : 4.5;
    const signX = Math.sign(state.ball.vx) || 1;
    const signY = Math.sign(state.ball.vy) || 1;
    state.ball.vx = v * signX;
    state.ball.vy = (v * 0.5) * signY;
  }

  function setMode(m) {
    state.mode = m;
    localStorage.setItem('pong_mode', m);
  }

  // ---- UI wires ----
  const scoreEl = document.getElementById('score');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const installBtn = document.getElementById('installBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  const menuEl = document.getElementById('menu');
  const soloBtn = document.getElementById('soloBtn');
  const duoBtn = document.getElementById('duoBtn');
  const slowBtn = document.getElementById('slowBtn');
  const normalBtn = document.getElementById('normalBtn');
  const fastBtn = document.getElementById('fastBtn');
  const touchHint = document.getElementById('touchHint');

  soloBtn.addEventListener('click', () => { setMode('solo'); hideMenu(); });
  duoBtn.addEventListener('click', () => { setMode('duo'); hideMenu(); });
  slowBtn.addEventListener('click', () => { setSpeed('slow'); });
  normalBtn.addEventListener('click', () => { setSpeed('normal'); });
  fastBtn.addEventListener('click', () => { setSpeed('fast'); });

  pauseBtn.addEventListener('click', () => { state.paused = !state.paused; pauseBtn.textContent = state.paused ? '▶️ Riprendi' : '⏸️ Pausa'; });
  resetBtn.addEventListener('click', () => resetGame());
  fullscreenBtn.addEventListener('click', () => {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  });

  function showMenu() { menuEl.style.display = 'grid'; }
  function hideMenu() { menuEl.style.display = 'none'; }

  // initialize preferred speed/mode
  setSpeed(state.speed);
  if (state.mode === 'solo') hideMenu();

  // ---- Controls (touch + mouse + keyboard) ----
  let activeTouches = new Map(); // id -> {side: 'left'|'right', y}
  function normY(pageY) {
    const rect = canvas.getBoundingClientRect();
    const y = (pageY - rect.top) / rect.height * BASE_H;
    return Math.max(0, Math.min(BASE_H, y));
    }

  function handlePointer(e, isDownOrMove) {
    const touches = e.changedTouches ? Array.from(e.changedTouches) : [e];
    touches.forEach(t => {
      const id = t.identifier ?? 'mouse';
      const x = t.clientX ?? t.pageX;
      const rect = canvas.getBoundingClientRect();
      const side = (x - rect.left) < rect.width / 2 ? 'left' : 'right';
      if (isDownOrMove) {
        activeTouches.set(id, { side, y: normY(t.clientY ?? t.pageY) });
        if (side === 'left') state.p1.y = activeTouches.get(id).y - PADDLE_H/2;
        else state.p2.y = activeTouches.get(id).y - PADDLE_H/2;
      } else {
        activeTouches.delete(id);
      }
    });
    e.preventDefault();
  }

  canvas.addEventListener('touchstart', e => handlePointer(e, true), {passive:false});
  canvas.addEventListener('touchmove',  e => handlePointer(e, true), {passive:false});
  canvas.addEventListener('touchend',   e => handlePointer(e, false), {passive:false});
  canvas.addEventListener('mousedown',  e => handlePointer(e, true));
  window.addEventListener('mousemove',  e => {
    if (activeTouches.has('mouse')) handlePointer(e, true);
  });
  window.addEventListener('mouseup',    e => handlePointer(e, false));

  const keys = new Set();
  window.addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); if (e.key === 'Escape') showMenu(); });
  window.addEventListener('keyup',   e => { keys.delete(e.key.toLowerCase()); });

  // ---- Game constants ----
  const PADDLE_W = 10, PADDLE_H = 80, P_MARGIN = 18;
  const NET_W = 4;

  function clamp(val, lo, hi){ return Math.max(lo, Math.min(hi, val)); }

  function resetBall(toLeft = Math.random() < 0.5) {
    state.ball.x = BASE_W/2; state.ball.y = BASE_H/2;
    const speedBase = state.speed === 'slow' ? 3 : state.speed === 'fast' ? 6 : 4.5;
    const angle = (Math.random() * 0.6 - 0.3); // -0.3..0.3 radians
    state.ball.vx = (toLeft ? -1 : 1) * speedBase * Math.cos(angle);
    state.ball.vy = speedBase * 0.75 * Math.sin(angle);
  }

  function resetGame() {
    state.p1.score = 0; state.p2.score = 0; state.p1.y = BASE_H/2 - 40; state.p2.y = BASE_H/2 - 40;
    resetBall();
    state.paused = false;
    pauseBtn.textContent = '⏸️ Pausa';
  }

  resetGame();

  // ---- CPU AI ----
  function cpuUpdate() {
    const target = state.ball.y - PADDLE_H/2;
    const speed = Math.abs(state.ball.vx) * 0.9 + 2; // scale with ball speed
    state.p2.y += Math.sign(target - state.p2.y) * speed;
    state.p2.y = clamp(state.p2.y, 0, BASE_H - PADDLE_H);
  }

  // ---- Update loop ----
  function update() {
    if (state.paused || menuEl.style.display !== 'none') return;

    // Keyboard control
    if (keys.has('w')) state.p1.y -= 6;
    if (keys.has('s')) state.p1.y += 6;
    if (state.mode === 'duo') {
      if (keys.has('arrowup')) state.p2.y -= 6;
      if (keys.has('arrowdown')) state.p2.y += 6;
    }

    // CPU
    if (state.mode === 'solo') cpuUpdate();

    // Clamp paddles
    state.p1.y = clamp(state.p1.y, 0, BASE_H - PADDLE_H);
    state.p2.y = clamp(state.p2.y, 0, BASE_H - PADDLE_H);

    // Ball
    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;

    // Top/bottom bounce
    if (state.ball.y - state.ball.r < 0) { state.ball.y = state.ball.r; state.ball.vy *= -1; }
    if (state.ball.y + state.ball.r > BASE_H) { state.ball.y = BASE_H - state.ball.r; state.ball.vy *= -1; }

    // Paddle collisions
    // Left paddle
    if (state.ball.x - state.ball.r < P_MARGIN + PADDLE_W &&
        state.ball.y > state.p1.y && state.ball.y < state.p1.y + PADDLE_H &&
        state.ball.vx < 0) {
      state.ball.x = P_MARGIN + PADDLE_W + state.ball.r;
      state.ball.vx *= -1.05;
      // add spin based on hit position
      const rel = (state.ball.y - (state.p1.y + PADDLE_H/2)) / (PADDLE_H/2);
      state.ball.vy += rel * 2.2;
    }

    // Right paddle
    if (state.ball.x + state.ball.r > BASE_W - (P_MARGIN + PADDLE_W) &&
        state.ball.y > state.p2.y && state.ball.y < state.p2.y + PADDLE_H &&
        state.ball.vx > 0) {
      state.ball.x = BASE_W - (P_MARGIN + PADDLE_W) - state.ball.r;
      state.ball.vx *= -1.05;
      const rel = (state.ball.y - (state.p2.y + PADDLE_H/2)) / (PADDLE_H/2);
      state.ball.vy += rel * 2.2;
    }

    // Score
    if (state.ball.x < -20) { state.p2.score++; resetBall(false); }
    if (state.ball.x > BASE_W + 20) { state.p1.score++; resetBall(true); }

    // UI
    scoreEl.textContent = `${state.p1.score} — ${state.p2.score}`;
  }

  // ---- Render ----
  function draw() {
    // Clear
    ctx.fillStyle = '#0b0f1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(scaleX, scaleY);

    // Court
    ctx.strokeStyle = '#223049';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, BASE_W-12, BASE_H-12);

    // Net
    ctx.fillStyle = '#2a3446';
    const dash = 16;
    for (let y=10; y<BASE_H-10; y+=dash*1.6){
      ctx.fillRect(BASE_W/2 - NET_W/2, y, NET_W, dash);
    }

    // Paddles
    ctx.fillStyle = '#e6e8ee';
    ctx.fillRect(P_MARGIN, state.p1.y, PADDLE_W, PADDLE_H);
    ctx.fillRect(BASE_W - (P_MARGIN + PADDLE_W), state.p2.y, PADDLE_W, PADDLE_H);

    // Ball
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  }

  // ---- Main loop ----
  let last = 0;
  function loop(ts){
    if (!last) last = ts;
    const dt = ts - last;
    if (dt > 1000/60 - 2) { // ~60fps
      update();
      draw();
      last = ts;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Hide touch hint after a few seconds or on first touch
  setTimeout(()=> touchHint.style.display='none', 4000);
  canvas.addEventListener('touchstart', ()=> touchHint.style.display='none', {passive:true});

  // ---- PWA install prompt ----
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.hidden = true;
  });

})();
