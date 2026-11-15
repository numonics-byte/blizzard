/* Blizzard core: routing, cursor FX, games */
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d){ try{ const v = localStorage.getItem('blizzard_'+k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
    set(k, v){ try{ localStorage.setItem('blizzard_'+k, JSON.stringify(v)); }catch(e){} }
  };
  BLIZ.store = store;

  /* ---------- toast ---------- */
  let toastT;
  BLIZ.toast = (msg) => {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
  };

  /* ---------- routing ---------- */
  const views = ['home','games','browser','watch','credits'];
  function route(){
    let v = (location.hash.replace('#','') || 'home').split('/')[0];
    if(!views.includes(v)) v = 'home';
    $$('.view').forEach(el => el.classList.toggle('active', el.id === 'v-'+v));
    document.body.dataset.view = v;
    $$('.nav button').forEach(b => b.classList.toggle('active', b.dataset.go === v));
    window.scrollTo(0,0);
    document.dispatchEvent(new CustomEvent('bliz:view', { detail:v }));
  }
  BLIZ.go = (v) => { if(location.hash === '#'+v) route(); else location.hash = v; };
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if(g){ BLIZ.go(g.dataset.go); }
  });
  window.addEventListener('hashchange', route);

  /* ---------- LED strip ---------- */
  const strip = $('#ledStrip');
  const ledColors = ['#3aa8ff','#7fdbff','#59ffb0','#ff4fd8','#8b5cff','#ffb84f'];
  for(let i=0;i<14;i++){
    const d = document.createElement('i');
    d.style.setProperty('--i', i); d.style.setProperty('--c', ledColors[i % ledColors.length]);
    strip.appendChild(d);
  }

  /* ---------- mouse spotlight + 3D tilt ---------- */
  const root = document.documentElement;
  let mx = -100, my = -100, lastX = null, lastY = null, cursorOn = false, cursorPulse = 0;
  const trail = [];
  function onMove(x, y, fine){
    root.style.setProperty('--mx', x+'px');
    root.style.setProperty('--my', y+'px');
    // fill in the gap since the last event so the trail is a smooth line glued to the pointer
    if(lastX !== null){
      const dx = x - lastX, dy = y - lastY, steps = Math.min(8, Math.max(1, Math.hypot(dx, dy) / 10 | 0));
      for(let i=1;i<=steps;i++) spawn(lastX + dx*i/steps, lastY + dy*i/steps, 1);
    }else spawn(x, y, 2);
    lastX = x; lastY = y; mx = x; my = y; cursorOn = fine;
    trail.push({ x, y, t: performance.now() });
  }
  addEventListener('pointermove', e => {
    // use every coalesced sample for exact tracking on fast moves
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    if(evs.length > 1) evs.forEach(ev => onMove(ev.clientX, ev.clientY, e.pointerType === 'mouse'));
    else onMove(e.clientX, e.clientY, e.pointerType === 'mouse');
  }, { passive:true });
  addEventListener('pointerup', e => { if(e.pointerType !== 'mouse'){ lastX = lastY = null; } }, { passive:true });
  document.addEventListener('mouseleave', () => { cursorOn = false; lastX = lastY = null; });
  addEventListener('pointerdown', e => burst(e.clientX, e.clientY), { passive:true });

  $$('.tilt').forEach(card => {
    const inner = card.querySelector('.opt-inner');
    card.addEventListener('pointermove', e => {
      if(e.pointerType === 'touch') return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.transform = `perspective(900px) rotateX(${(0.5-py)*12}deg) rotateY(${(px-0.5)*14}deg) translateY(-6px)`;
      inner.style.setProperty('--gx', px*100+'%'); inner.style.setProperty('--gy', py*100+'%');
    });
    card.addEventListener('pointerleave', () => card.style.transform = '');
  });

  /* ---------- particle canvas (snow trail + click bursts) ---------- */
  const cv = $('#fx'), cx = cv.getContext('2d');
  let W, H, DPR;
  function resize(){
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W*DPR; cv.height = H*DPR; cx.setTransform(DPR,0,0,DPR,0,0);
  }
  resize(); addEventListener('resize', resize);
  const parts = [];
  const hues = [195, 205, 270, 310, 160];
  function spawn(x, y, n){
    for(let i=0;i<n;i++){
      if(parts.length > 220) parts.shift();
      parts.push({ x, y, vx:(Math.random()-.5)*.9, vy:(Math.random()-.5)*.9 + .15, life:1,
        s: Math.random()*3+1.5, h: hues[(Math.random()*hues.length)|0], flake: Math.random() < .35, r: Math.random()*6 });
    }
  }
  const rings = [];
  function burst(x, y){
    cursorPulse = 1;
    rings.push({ x, y, r:4, a:1 });
    for(let i=0;i<18;i++){
      const a = i/18*Math.PI*2, sp = 2+Math.random()*3;
      parts.push({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:1, s:Math.random()*3+2, h:hues[i%hues.length], flake:true, r:a });
    }
  }
  function drawFlake(x, y, s, rot){
    cx.save(); cx.translate(x,y); cx.rotate(rot);
    cx.beginPath();
    for(let k=0;k<3;k++){ cx.rotate(Math.PI/3); cx.moveTo(-s*1.6,0); cx.lineTo(s*1.6,0); }
    cx.stroke(); cx.restore();
  }
  function tick(){
    cx.clearRect(0,0,W,H);
    cx.globalCompositeOperation = 'lighter';
    for(let i=parts.length-1;i>=0;i--){
      const p = parts[i];
      p.x += p.vx; p.y += p.vy; p.vx *= .97; p.vy = p.vy*.97 + .02; p.life -= .018; p.r += .03;
      if(p.life <= 0){ parts.splice(i,1); continue; }
      const col = `hsla(${p.h},100%,72%,${p.life})`;
      if(p.flake){ cx.strokeStyle = col; cx.lineWidth = 1.2; drawFlake(p.x,p.y,p.s*p.life+1,p.r); }
      else{
        cx.fillStyle = col; cx.shadowColor = col; cx.shadowBlur = 10;
        cx.beginPath(); cx.arc(p.x,p.y,p.s*p.life,0,7); cx.fill(); cx.shadowBlur = 0;
      }
    }
    for(let i=rings.length-1;i>=0;i--){
      const r = rings[i]; r.r += 4; r.a -= .035;
      if(r.a <= 0){ rings.splice(i,1); continue; }
      cx.strokeStyle = `rgba(127,219,255,${r.a})`; cx.lineWidth = 2;
      cx.beginPath(); cx.arc(r.x,r.y,r.r,0,7); cx.stroke();
    }
    // glowing comet tail that follows the exact pointer path
    const now = performance.now();
    while(trail.length && now - trail[0].t > 160) trail.shift();
    if(trail.length > 1){
      for(let i=1;i<trail.length;i++){
        const a = i / trail.length;
        cx.strokeStyle = `rgba(127,219,255,${a*.8})`; cx.lineWidth = 1 + a*4; cx.lineCap = 'round';
        cx.beginPath(); cx.moveTo(trail[i-1].x, trail[i-1].y); cx.lineTo(trail[i].x, trail[i].y); cx.stroke();
      }
    }
    // exact cursor: bright core + spinning snowflake ring centred on the pointer
    if(cursorOn){
      cursorPulse *= .9;
      const rr = 14 + cursorPulse*10, spin = now / 900;
      cx.shadowColor = '#7fdbff'; cx.shadowBlur = 16;
      cx.strokeStyle = 'rgba(127,219,255,.9)'; cx.lineWidth = 1.5;
      cx.beginPath(); cx.arc(mx, my, rr, 0, 7); cx.stroke();
      cx.strokeStyle = 'rgba(255,79,216,.75)';
      for(let k=0;k<6;k++){
        const a = spin + k*Math.PI/3;
        cx.beginPath(); cx.moveTo(mx + Math.cos(a)*(rr+3), my + Math.sin(a)*(rr+3)); cx.lineTo(mx + Math.cos(a)*(rr+8), my + Math.sin(a)*(rr+8)); cx.stroke();
      }
      cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(mx, my, 2.5, 0, 7); cx.fill();
      cx.shadowBlur = 0;
    }
    cx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(tick);
  }
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches) tick();

  /* ---------- games ---------- */
  const games = BLIZ.games;
  $('#statGames').textContent = games.length;
  let cat = 'All', query = '';
  let favs = store.get('favs', []);
  let recent = store.get('recent', []);
  const cats = ['All','★ Favorites','Recent', ...new Set(games.map(g => g.cat))];
  const chipBox = $('#gameChips');
  cats.forEach(c => {
    const b = document.createElement('button');
    b.className = 'chip' + (c === 'All' ? ' active' : ''); b.textContent = c;
    b.onclick = () => { cat = c; $$('.chip', chipBox).forEach(x => x.classList.toggle('active', x === b)); renderGames(); };
    chipBox.appendChild(b);
  });
  $('#gameSearch').addEventListener('input', e => { query = e.target.value.toLowerCase().trim(); renderGames(); });

  function renderGames(){
    const grid = $('#gameGrid'); grid.innerHTML = '';
    let list = games.filter(g => !query || (g.name + ' ' + g.cat + ' ' + g.desc).toLowerCase().includes(query));
    if(cat === '★ Favorites') list = list.filter(g => favs.includes(g.id));
    else if(cat === 'Recent') list = recent.map(id => list.find(g => g.id === id)).filter(Boolean);
    else if(cat !== 'All') list = list.filter(g => g.cat === cat);
    if(!list.length){ grid.innerHTML = `<div class="empty">${cat==='★ Favorites'?'Tap ☆ on a game to add it here.':cat==='Recent'?'Games you play show up here.':'No games found.'}</div>`; return; }
    list.forEach(g => {
      const c = document.createElement('div');
      c.className = 'gcard'; c.style.setProperty('--g1', g.g1); c.style.setProperty('--g2', g.g2);
      c.innerHTML = `
        <button class="fav" title="Favorite">${favs.includes(g.id)?'★':'☆'}</button>
        <div class="gthumb">
          <span class="badge">${g.cat}</span>
          <span class="gicon">${g.icon}</span>
          ${g.num?`<span class="num">${g.num}</span>`:''}
          <div class="gplay"><span>▶</span></div>
        </div>
        <div class="ginfo"><h3>${g.name}</h3><p>${g.desc}</p></div>`;
      c.querySelector('.fav').onclick = (e) => {
        e.stopPropagation();
        favs = favs.includes(g.id) ? favs.filter(x => x !== g.id) : [...favs, g.id];
        store.set('favs', favs); renderGames();
      };
      c.onclick = () => launch(g);
      grid.appendChild(c);
    });
  }
  renderGames();

  /* Open a game inside an about:blank tab */
  function launch(g){
    recent = [g.id, ...recent.filter(x => x !== g.id)].slice(0, 8); store.set('recent', recent);
    const url = new URL('games/' + g.file, location.href).href;
    let w = null;
    try{ w = window.open('about:blank', '_blank'); }catch(e){}
    if(w){
      try{
        w.document.open();
        w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${g.name}</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}
#bx{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:9;display:flex;gap:6px;opacity:.4;transition:opacity .2s;font:600 13px system-ui,sans-serif}
#bx:hover,#bx:focus-within{opacity:1}
#bx button{padding:7px 13px;border-radius:999px;border:1px solid rgba(127,219,255,.5);background:rgba(4,6,15,.75);color:#e8f3ff;cursor:pointer}
#bx button:hover{background:#7fdbff;color:#001018}</style></head>
<body><iframe src="${url}" allow="autoplay; fullscreen; gamepad" allowfullscreen></iframe>
<div id="bx"><button id="bMenu" title="Back to Blizzard main menu">⌂ Main Menu</button><button id="bGames" title="Back to the games list">🎮 Games</button><button id="bExit" title="Close this game">✕ Exit</button></div>
<script>document.querySelector('iframe').onload=function(){try{this.contentWindow.focus()}catch(e){}};
function back(v){try{if(opener&&!opener.closed){opener.BLIZ.go(v);opener.focus();close();return}}catch(e){}location.href=${JSON.stringify(location.href.split('#')[0])}+'#'+v}
document.getElementById('bMenu').onclick=function(){back('home')};
document.getElementById('bGames').onclick=function(){back('games')};
document.getElementById('bExit').onclick=function(){back('games')};<\/script></body></html>`);
        w.document.close();
        return;
      }catch(e){ try{ w.close(); }catch(_){} }
    }
    // pop-up blocked: open in-site
    $('#ovTitle').textContent = g.name.toUpperCase();
    $('#ovFrame').src = url;
    $('#gameOverlay').classList.add('open');
    BLIZ.toast('Pop-up blocked, so the game opened here instead.');
  }
  addEventListener('keydown', e => {
    if(e.key !== 'Escape') return;
    if($('#gameOverlay').classList.contains('open')) return $('#ovClose').click();
    if(document.querySelector('.bm-modal.open') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if(document.body.dataset.view !== 'home') BLIZ.go('home');
  });
  $('#ovMenu').onclick = () => { $('#ovClose').click(); BLIZ.go('home'); };
  $('#ovClose').onclick = () => { $('#gameOverlay').classList.remove('open'); $('#ovFrame').src = 'about:blank'; };

  route();
})();

/* Pause site music on the Watch page so it doesn't play over videos */
document.addEventListener('bliz:view', function(e){
  if(!window.BlizMusic) return;
  if(e.detail === 'watch') BlizMusic.stop(); else BlizMusic.start();
});
