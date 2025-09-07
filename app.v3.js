/* Pong2025 v3 — robust autostart & cache-busted assets */
(() => {
  'use strict';

  // Wait minimal to ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init(){
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d', { alpha: false });

    const BASE_W = 800, BASE_H = 450;
    let scaleX = 1, scaleY = 1;

    function applySize() {
      const DPR = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.min(window.innerWidth, 1000);
      const h = Math.min(window.innerHeight, 700);
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      canvas.width  = Math.round(w * DPR);
      canvas.height = Math.round(h * DPR);
      scaleX = canvas.width / BASE_W;
      scaleY = canvas.height / BASE_H;
    }
    let resizeRaf = 0;
    function requestResize(){ cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(applySize); }
    window.addEventListener('resize', requestResize, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(applySize, 300), { passive: true });
    applySize();

    // --- State ---
    const state = {
      mode: 'solo',
      speed: 'normal',
      paused: false,
      p1: { y: BASE_H/2 - 40, score: 0 },
      p2: { y: BASE_H/2 - 40, score: 0 },
      ball: { x: BASE_W/2, y: BASE_H/2, vx: 4.5, vy: 2.25, r: 6 },
    };

    // Read past prefs (safe)
    try {
      state.mode = localStorage.getItem('pong_mode') || 'solo';
      state.speed = localStorage.getItem('pong_speed') || 'normal';
    } catch {}

    function setSpeed(s) {
      state.speed = s;
      try { localStorage.setItem('pong_speed', s); } catch {}
      const v = s === 'slow' ? 3 : s === 'fast' ? 6 : 4.5;
      const signX = Math.sign(state.ball.vx) || 1;
      const signY = Math.sign(state.ball.vy) || 1;
      state.ball.vx = v * signX;
      state.ball.vy = (v * 0.5) * signY;
    }
    function setMode(m) {
      state.mode = m;
      try { localStorage.setItem('pong_mode', m); } catch {}
    }

    // --- UI refs (guard against null) ---
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

    function showMenu() { if (menuEl) menuEl.style.display = 'grid'; }
    function hideMenu() { if (menuEl) menuEl.style.display = 'none'; }

    function wire(btn, fn){ if (btn) btn.addEventListener('click', fn); }

    wire(soloBtn, () => { setMode('solo'); hideMenu(); });
    wire(duoBtn,  () => { setMode('duo');  hideMenu(); });
    wire(slowBtn, () => { setSpeed('slow'); });
    wire(normalBtn, () => { setSpeed('normal'); });
    wire(fastBtn, () => { setSpeed('fast'); });

    wire(pauseBtn, () => { state.paused = !state.paused; if (pauseBtn) pauseBtn.textContent = state.paused ? '▶️ Riprendi' : '⏸️ Pausa'; });
    wire(resetBtn, () => resetGame());
    wire(fullscreenBtn, () => {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen();
      else if (document.exitFullscreen) document.exitFullscreen();
    });

    // --- Autostart fallback (even if menu fails) ---
    setSpeed(state.speed);
    hideMenu(); // parte sempre, la modalità viene comunque salvata
    setTimeout(() => { // se qualcosa riapre il menu, lo chiudiamo
      if (menuEl && menuEl.style.display !== 'none') hideMenu();
    }, 500);

    // --- Controls ---
    let activeTouches = new Map();
    const PADDLE_W = 10, PADDLE_H = 80, P_MARGIN = 18;
    const NET_W = 4;

    function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
    function normY(pageY) {
      const rect = canvas.getBoundingClientRect();
      const y = (pageY - rect.top) / rect.height * BASE_H;
      return clamp(y, 0, BASE_H);
    }
    function handlePointer(e, isDownOrMove) {
      const touches = e.changedTouches ? Array.from(e.changedTouches) : [e];
      const rect = canvas.getBoundingClientRect();
      touches.forEach(t => {
        const id = t.identifier ?? 'mouse';
        const x = t.clientX ?? t.pageX;
        const side = (x - rect.left) < rect.width / 2 ? 'left' : 'right';
        if (isDownOrMove) {
          const y = normY(t.clientY ?? t.pageY);
          activeTouches.set(id, { side, y });
          if (side === 'left') state.p1.y = y - PADDLE_H/2;
          else state.p2.y = y - PADDLE_H/2;
        } else {
          activeTouches.delete(id);
        }
      });
      e.preventDefault();
    }
    canvas.addEventListener('touchstart', e => handlePointer(e, true),  { passive: false });
    canvas.addEventListener('touchmove',  e => handlePointer(e, true),  { passive: false });
    canvas.addEventListener('touchend',   e => handlePointer(e, false), { passive: false });
    canvas.addEventListener('mousedown',  e => handlePointer(e, true));
    window.addEventListener('mousemove',  e => { if (activeTouches.has('mouse')) handlePointer(e, true); });
    window.addEventListener('mouseup',    e => handlePointer(e, false));

    const keys = new Set();
    window.addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); if (e.key === 'Escape') showMenu(); });
    window.addEventListener('keyup',   e => { keys.delete(e.key.toLowerCase()); });

    function resetBall(toLeft = Math.random() < 0.5) {
      state.ball.x = BASE_W/2; state.ball.y = BASE_H/2;
      const speedBase = state.speed === 'slow' ? 3 : state.speed === 'fast' ? 6 : 4.5;
      const angle = (Math.random() * 0.6 - 0.3);
      state.ball.vx = (toLeft ? -1 : 1) * speedBase * Math.cos(angle);
      state.ball.vy = speedBase * 0.75 * Math.sin(angle);
    }
    function resetGame() {
      state.p1.score = 0; state.p2.score = 0; state.p1.y = BASE_H/2 - 40; state.p2.y = BASE_H/2 - 40;
      resetBall();
      state.paused = false;
      if (pauseBtn) pauseBtn.textContent = '⏸️ Pausa';
    }
    resetGame();

    function cpuUpdate() {
      const target = state.ball.y - PADDLE_H/2;
      const speed = Math.abs(state.ball.vx) * 0.9 + 2;
      state.p2.y += Math.sign(target - state.p2.y) * speed;
      state.p2.y = clamp(state.p2.y, 0, BASE_H - PADDLE_H);
    }

    const STEP = 1000/60;
    let last = performance.now(), acc = 0;
    function loop(ts){
      acc += ts - last; last = ts;
      while (acc >= STEP) {
        if (!state.paused && (!menuEl || menuEl.style.display === 'none')) {
          if (keys.has('w')) state.p1.y -= 6;
          if (keys.has('s')) state.p1.y += 6;
          if (state.mode === 'duo') {
            if (keys.has('arrowup')) state.p2.y -= 6;
            if (keys.has('arrowdown')) state.p2.y += 6;
          } else {
            cpuUpdate();
          }

          state.p1.y = clamp(state.p1.y, 0, BASE_H - PADDLE_H);
          state.p2.y = clamp(state.p2.y, 0, BASE_H - PADDLE_H);

          state.ball.x += state.ball.vx;
          state.ball.y += state.ball.vy;

          if (state.ball.y - state.ball.r < 0) { state.ball.y = state.ball.r; state.ball.vy *= -1; }
          if (state.ball.y + state.ball.r > BASE_H) { state.ball.y = BASE_H - state.ball.r; state.ball.vy *= -1; }

          if (state.ball.x - state.ball.r < P_MARGIN + PADDLE_W &&
              state.ball.y > state.p1.y && state.ball.y < state.p1.y + PADDLE_H &&
              state.ball.vx < 0) {
            state.ball.x = P_MARGIN + PADDLE_W + state.ball.r;
            state.ball.vx *= -1.05;
            const rel = (state.ball.y - (state.p1.y + PADDLE_H/2)) / (PADDLE_H/2);
            state.ball.vy += rel * 2.2;
          }
          if (state.ball.x + state.ball.r > BASE_W - (P_MARGIN + PADDLE_W) &&
              state.ball.y > state.p2.y && state.ball.y < state.p2.y + PADDLE_H &&
              state.ball.vx > 0) {
            state.ball.x = BASE_W - (P_MARGIN + PADDLE_W) - state.ball.r;
            state.ball.vx *= -1.05;
            const rel = (state.ball.y - (state.p2.y + PADDLE_H/2)) / (PADDLE_H/2);
            state.ball.vy += rel * 2.2;
          }

          if (state.ball.x < -20) { state.p2.score++; resetBall(false); }
          if (state.ball.x > BASE_W + 20) { state.p1.score++; resetBall(true); }

          if (scoreEl) scoreEl.textContent = `${state.p1.score} — ${state.p2.score}`;
        }
        acc -= STEP;
      }
      draw();
      requestAnimationFrame(loop);
    }

    function draw() {
      ctx.fillStyle = '#0b0f1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(scaleX, scaleY);

      ctx.strokeStyle = '#223049';
      ctx.lineWidth = 2;
      ctx.strokeRect(6, 6, BASE_W-12, BASE_H-12);

      ctx.fillStyle = '#2a3446';
      const dash = 16;
      for (let y=10; y<BASE_H-10; y+=dash*1.6){
        ctx.fillRect(BASE_W/2 - 2, y, 4, dash);
      }

      ctx.fillStyle = '#e6e8ee';
      ctx.fillRect(P_MARGIN, state.p1.y, PADDLE_W, PADDLE_H);
      ctx.fillRect(BASE_W - (P_MARGIN + PADDLE_W), state.p2.y, PADDLE_W, PADDLE_H);

      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI*2);
      ctx.fill();

      ctx.restore();
    }

    setTimeout(()=> { if (touchHint) touchHint.style.display='none'; }, 4000);
    canvas.addEventListener('touchstart', ()=> { if (touchHint) touchHint.style.display='none'; }, {passive:true});

    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (installBtn) installBtn.hidden = false; });
    if (installBtn) installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt(); await deferredPrompt.userChoice;
      deferredPrompt = null; installBtn.hidden = true;
    });

    requestAnimationFrame(loop);
  }
})();
