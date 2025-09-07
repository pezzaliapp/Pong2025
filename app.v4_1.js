/* Pong2025 v4.1 — attivazione visiva dei pulsanti (Velocità/Qualità) */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();

  function init(){
    const canvas = $('#game');
    const ctx = canvas.getContext('2d', {alpha:false});

    const scoreEl = $('#score');
    const pauseBtn = $('#pauseBtn');
    const resetBtn = $('#resetBtn');
    const installBtn = $('#installBtn');
    const fullscreenBtn = $('#fullscreenBtn');

    const menuEl = $('#menu');
    const soloBtn = $('#soloBtn');
    const duoBtn  = $('#duoBtn');
    const slowBtn = $('#slowBtn');
    const normalBtn = $('#normalBtn');
    const fastBtn = $('#fastBtn');
    const qLowBtn = $('#qLowBtn');
    const qMidBtn = $('#qMidBtn');
    const qHighBtn= $('#qHighBtn');
    const selLabel= $('#selLabel');
    const touchHint = $('#touchHint');
    const rotateOverlay = $('#rotateOverlay');

    const cfg = {
      mode: localStorage.getItem('pong_mode') || 'solo',
      speed: localStorage.getItem('pong_speed') || 'normal',
      quality: localStorage.getItem('pong_quality') || 'mid',
      paused: false
    };

    function dprCap(){ return cfg.quality==='low'?1:(cfg.quality==='high'?2:1.5); }
    const BASE_W=800, BASE_H=450; let scaleX=1, scaleY=1;

    function isMobile(){ return Math.max(innerWidth, innerHeight) < 900; }
    function applySize(){
      if (isMobile()){
        const portrait = innerHeight >= innerWidth;
        rotateOverlay.style.display = portrait ? 'none' : 'flex';
      } else rotateOverlay.style.display='none';

      const DPR=Math.min(dprCap(), devicePixelRatio||1);
      let vw=Math.min(innerWidth,1000), vh=Math.min(innerHeight,820);
      vh -= 60;
      let targetH=Math.min(vh, Math.round(vw*9/16));
      let targetW=Math.round(targetH*16/9);
      if (targetW>vw){ targetW=vw; targetH=Math.round(vw*9/16); }
      canvas.style.width=targetW+'px'; canvas.style.height=targetH+'px';
      canvas.width=Math.round(targetW*DPR); canvas.height=Math.round(targetH*DPR);
      scaleX=canvas.width/BASE_W; scaleY=canvas.height/BASE_H;
    }
    let resizeRaf=0; function requestResize(){ cancelAnimationFrame(resizeRaf); resizeRaf=requestAnimationFrame(applySize); }
    addEventListener('resize', requestResize, {passive:true});
    addEventListener('orientationchange', ()=> setTimeout(applySize,300), {passive:true});
    applySize();

    // --- State ---
    const state = {
      p1:{y:BASE_H/2-40, score:0},
      p2:{y:BASE_H/2-40, score:0},
      ball:{x:BASE_W/2, y:BASE_H/2, vx:4.5, vy:2.25, r:6}
    };

    function setSpeed(s){
      cfg.speed=s; localStorage.setItem('pong_speed', s);
      const v = s==='slow'?3:(s==='fast'?6:4.5);
      const sx=Math.sign(state.ball.vx)||1, sy=Math.sign(state.ball.vy)||1;
      state.ball.vx=v*sx; state.ball.vy=(v*0.5)*sy;
      markActive($('#speedRow'), s);
      updateSelLabel();
    }
    function setMode(m){ cfg.mode=m; localStorage.setItem('pong_mode', m); }
    function setQuality(q){ cfg.quality=q; localStorage.setItem('pong_quality', q); markActive($('#qualityRow'), q); updateSelLabel(); applySize(); }

    function markActive(rowEl, value){
      rowEl.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
      if (rowEl.id==='speedRow'){
        if (value==='slow') slowBtn.classList.add('active');
        else if (value==='fast') fastBtn.classList.add('active');
        else normalBtn.classList.add('active');
      } else {
        if (value==='low') qLowBtn.classList.add('active');
        else if (value==='high') qHighBtn.classList.add('active');
        else qMidBtn.classList.add('active');
      }
    }
    function updateSelLabel(){
      const sMap={slow:'Lento',normal:'Normale',fast:'Veloce'};
      const qMap={low:'Bassa',mid:'Media',high:'Alta'};
      selLabel.textContent = `Velocità: ${sMap[cfg.speed]} • Qualità: ${qMap[cfg.quality]}`;
    }

    // Init selections (visual)
    markActive($('#speedRow'), cfg.speed);
    markActive($('#qualityRow'), cfg.quality);
    updateSelLabel();

    // Wire menu buttons
    soloBtn.addEventListener('click', ()=> { setMode('solo'); startGame(); });
    duoBtn .addEventListener('click', ()=> { setMode('duo');  startGame(); });
    slowBtn.addEventListener('click', ()=> setSpeed('slow'));
    normalBtn.addEventListener('click', ()=> setSpeed('normal'));
    fastBtn.addEventListener('click', ()=> setSpeed('fast'));
    qLowBtn.addEventListener('click', ()=> setQuality('low'));
    qMidBtn.addEventListener('click', ()=> setQuality('mid'));
    qHighBtn.addEventListener('click',()=> setQuality('high'));

    pauseBtn.addEventListener('click', ()=> { cfg.paused=!cfg.paused; pauseBtn.textContent = cfg.paused ? '▶️ Riprendi' : '⏸️ Pausa'; });
    resetBtn.addEventListener('click', ()=> resetGame());
    fullscreenBtn.addEventListener('click', ()=> {
      const el=document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen();
      else if (document.exitFullscreen) document.exitFullscreen();
    });

    // Menu visible by default
    menuEl.style.display='grid';
    function startGame(){ menuEl.style.display='none'; cfg.paused=false; touchHint.style.display='none'; resetGame(); }

    function resetBall(toLeft=Math.random()<0.5){
      const speedBase=cfg.speed==='slow'?3:(cfg.speed==='fast'?6:4.5);
      const angle=(Math.random()*0.6-0.3);
      state.ball.x=BASE_W/2; state.ball.y=BASE_H/2;
      state.ball.vx=(toLeft?-1:1)*speedBase*Math.cos(angle);
      state.ball.vy=speedBase*0.75*Math.sin(angle);
    }
    function resetGame(){
      state.p1.score=0; state.p2.score=0; state.p1.y=BASE_H/2-40; state.p2.y=BASE_H/2-40;
      resetBall(); cfg.paused=false; pauseBtn.textContent='⏸️ Pausa';
    }

    // Controls
    const PADDLE_W=10, PADDLE_H=80, P_MARGIN=18;
    function clamp(v,lo,hi){ return Math.max(lo, Math.min(hi,v)); }
    function normY(pageY){ const r=canvas.getBoundingClientRect(); const y=(pageY-r.top)/r.height*BASE_H; return clamp(y,0,BASE_H); }
    let activeTouches=new Map();
    function handlePointer(e,isDownOrMove){
      const touches=e.changedTouches?Array.from(e.changedTouches):[e];
      const r=canvas.getBoundingClientRect();
      touches.forEach(t=>{
        const id=t.identifier ?? 'mouse';
        const x=t.clientX ?? t.pageX;
        const side=(x - r.left) < r.width/2 ? 'left' : 'right';
        if(isDownOrMove){
          const y=normY(t.clientY ?? t.pageY);
          activeTouches.set(id,{side,y});
          if(side==='left') state.p1.y=y-PADDLE_H/2; else state.p2.y=y-PADDLE_H/2;
        } else activeTouches.delete(id);
      });
      e.preventDefault();
    }
    canvas.addEventListener('touchstart',e=>handlePointer(e,true),{passive:false});
    canvas.addEventListener('touchmove', e=>handlePointer(e,true),{passive:false});
    canvas.addEventListener('touchend',  e=>handlePointer(e,false),{passive:false});
    canvas.addEventListener('mousedown', e=>handlePointer(e,true));
    addEventListener('mousemove', e=>{ if(activeTouches.has('mouse')) handlePointer(e,true); });
    addEventListener('mouseup',   e=>handlePointer(e,false));

    const keys=new Set();
    addEventListener('keydown', e=>{ keys.add(e.key.toLowerCase()); if (e.key==='Escape') menuEl.style.display='grid'; });
    addEventListener('keyup',   e=>{ keys.delete(e.key.toLowerCase()); });

    function cpuUpdate(){
      const target = state.ball.y - PADDLE_H/2;
      const speed = Math.abs(state.ball.vx)*0.9 + 2;
      state.p2.y += Math.sign(target - state.p2.y) * speed;
      state.p2.y = clamp(state.p2.y, 0, BASE_H - PADDLE_H);
    }

    const STEP=1000/60; let last=performance.now(), acc=0;
    function loop(ts){
      acc += ts - last; last = ts;
      while(acc>=STEP){
        if(!cfg.paused && menuEl.style.display==='none'){
          if (keys.has('w')) state.p1.y -= 6;
          if (keys.has('s')) state.p1.y += 6;
          if (cfg.mode==='duo'){
            if (keys.has('arrowup')) state.p2.y -= 6;
            if (keys.has('arrowdown')) state.p2.y += 6;
          } else cpuUpdate();

          state.p1.y = clamp(state.p1.y, 0, BASE_H-PADDLE_H);
          state.p2.y = clamp(state.p2.y, 0, BASE_H-PADDLE_H);

          state.ball.x += state.ball.vx; state.ball.y += state.ball.vy;
          if (state.ball.y - state.ball.r < 0) { state.ball.y = state.ball.r; state.ball.vy *= -1; }
          if (state.ball.y + state.ball.r > BASE_H) { state.ball.y = BASE_H - state.ball.r; state.ball.vy *= -1; }

          if (state.ball.x - state.ball.r < P_MARGIN + PADDLE_W &&
              state.ball.y > state.p1.y && state.ball.y < state.p1.y + PADDLE_H &&
              state.ball.vx < 0){
            state.ball.x = P_MARGIN + PADDLE_W + state.ball.r;
            state.ball.vx *= -1.05;
            const rel=(state.ball.y - (state.p1.y + PADDLE_H/2))/(PADDLE_H/2);
            state.ball.vy += rel*2.2;
          }
          if (state.ball.x + state.ball.r > BASE_W - (P_MARGIN + PADDLE_W) &&
              state.ball.y > state.p2.y && state.ball.y < state.p2.y + PADDLE_H &&
              state.ball.vx > 0){
            state.ball.x = BASE_W - (P_MARGIN + PADDLE_W) - state.ball.r;
            state.ball.vx *= -1.05;
            const rel=(state.ball.y - (state.p2.y + PADDLE_H/2))/(PADDLE_H/2);
            state.ball.vy += rel*2.2;
          }

          if (state.ball.x < -20){ state.p2.score++; resetBall(false); }
          if (state.ball.x > BASE_W + 20){ state.p1.score++; resetBall(true); }

          scoreEl.textContent = `${state.p1.score} — ${state.p2.score}`;
        }
        acc -= STEP;
      }
      draw();
      requestAnimationFrame(loop);
    }

    function draw(){
      ctx.fillStyle='#0b0f1a'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.save(); ctx.scale(scaleX,scaleY);

      ctx.strokeStyle='#223049'; ctx.lineWidth=2; ctx.strokeRect(6,6,BASE_W-12,BASE_H-12);
      ctx.fillStyle='#2a3446'; for(let y=10;y<BASE_H-10;y+=25){ ctx.fillRect(BASE_W/2-2,y,4,16); }

      ctx.fillStyle='#e6e8ee';
      const P_MARGIN=18, PADDLE_W=10, PADDLE_H=80;
      ctx.fillRect(P_MARGIN, state.p1.y, PADDLE_W, PADDLE_H);
      ctx.fillRect(BASE_W-(P_MARGIN+PADDLE_W), state.p2.y, PADDLE_W, PADDLE_H);
      ctx.beginPath(); ctx.arc(state.ball.x,state.ball.y,state.ball.r,0,Math.PI*2); ctx.fill();

      ctx.restore();
    }

    setTimeout(()=> touchHint.style.display='none', 4000);
    canvas.addEventListener('touchstart', ()=> touchHint.style.display='none', {passive:true});

    // PWA prompt
    let deferredPrompt=null;
    addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt=e; installBtn.hidden=false; });
    installBtn.addEventListener('click', async ()=>{
      if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; installBtn.hidden=true;
    });

    requestAnimationFrame(loop);
  }
})();
