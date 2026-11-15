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

  /* ---------- 3D tilt on the home cards ---------- */
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

  /* ---------- games ---------- */
  const games = BLIZ.games;
  $('#statGames').textContent = games.length;
  let cat = 'All', query = '';
  let favs = store.get('favs', []);
  let recent = store.get('recent', []);
  const cats = ['All','🔥 Top Picks','★ Favorites','Recent', ...new Set(games.map(g => g.cat))];
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
    if(cat === '🔥 Top Picks') list = list.filter(g => g.top);
    else if(cat === '★ Favorites') list = list.filter(g => favs.includes(g.id));
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

/* Lightweight neon cursor: two small elements moved with GPU transforms only (no canvas, no repaints) */
(function(){
  if(!matchMedia('(pointer:fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const dot = document.createElement('div'), ring = document.createElement('div');
  dot.className = 'bz-dot'; ring.className = 'bz-ring';
  document.body.append(ring, dot);
  let x = -100, y = -100, rx = -100, ry = -100, shown = false, raf = 0;
  const HOT = 'a,button,input,select,textarea,label,[data-go],[data-u],[data-id],[data-play],.gcard,.opt,.chip,.bb-tab,.bm-card,.yt-card,.tt-acc';
  function frame(){
    rx += (x - rx) * .22; ry += (y - ry) * .22;
    dot.style.transform = `translate3d(${x}px,${y}px,0)`;
    ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    raf = (Math.abs(x - rx) > .3 || Math.abs(y - ry) > .3) ? requestAnimationFrame(frame) : 0;
  }
  addEventListener('pointermove', e => {
    if(e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if(!shown){ shown = true; rx = x; ry = y; document.documentElement.classList.add('bz-on'); }
    if(!raf) raf = requestAnimationFrame(frame);
  }, { passive:true });
  document.addEventListener('pointerover', e => { ring.classList.toggle('hot', !!(e.target.closest && e.target.closest(HOT))); }, { passive:true });
  addEventListener('pointerdown', () => { ring.classList.add('press'); }, { passive:true });
  addEventListener('pointerup', () => { ring.classList.remove('press'); }, { passive:true });
  document.addEventListener('mouseleave', () => document.documentElement.classList.remove('bz-on'));
  document.addEventListener('mouseenter', () => { if(shown) document.documentElement.classList.add('bz-on'); });
})();
