/* Blizzard Watch: YouTube, TikTok, BlizzardMovies — all played inside the site */
(function(){
  const root = document.getElementById('watch');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const store = BLIZ.store;
  const avColor = s => `hsl(${[...s].reduce((a,c) => a + c.charCodeAt(0), 0) * 37 % 360},65%,45%)`;

  root.innerHTML = `
    <div class="sec-head"><h1>BLIZZARD <em>WATCH</em></h1><p>No sign-in. Everything plays right here.</p></div>
    <div class="w-apps">
      <button class="w-app" data-app="youtube" style="--c:#ff0033"><i>▶</i>YouTube</button>
      <button class="w-app" data-app="tiktok" style="--c:#fe2c55"><i>♪</i>TikTok</button>
      <button class="w-app" data-app="movies" style="--c:#3aa8ff"><i>🎬</i>BlizzardMovies</button>
    </div>
    <div class="w-stage"></div>
    <div class="bm-modal"><div class="bm-box"><div class="bm-player"></div>
      <div class="bm-info"><div><h4></h4><p></p></div><button class="bm-close">✕</button></div></div></div>`;
  const stage = root.querySelector('.w-stage');
  const modal = root.querySelector('.bm-modal');
  let app = null;

  root.querySelectorAll('[data-app]').forEach(b => b.onclick = () => openApp(b.dataset.app));
  function openApp(name, payload){
    app = name;
    root.querySelectorAll('[data-app]').forEach(b => b.classList.toggle('on', b.dataset.app === name));
    store.set('watchApp', name);
    if(name === 'youtube') YT(payload);
    else if(name === 'tiktok') TT(payload);
    else MOVIES();
  }
  BLIZ.openWatch = (name, payload) => { BLIZ.go('watch'); openApp(name, payload); };

  // Stop any playing video when leaving the Watch page
  document.addEventListener('bliz:view', e => {
    if(e.detail !== 'watch'){ stage.querySelectorAll('iframe').forEach(f => f.src = 'about:blank'); closeModal(); app = null; }
    else if(!app) openApp(store.get('watchApp', 'youtube'));
  });

  const ytEmbed = id => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
  const ytFrame = id => `<iframe src="${ytEmbed(id)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  const parseYT = s => {
    s = s.trim();
    if(/^[\w-]{11}$/.test(s) && /[A-Z0-9_-]/.test(s)) return s;
    const m = s.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : null;
  };

  /* ================= YouTube ================= */
  let ytState = { cat:'All', q:'', extra:{} };
  function YT(id){
    stage.innerHTML = `<div class="yt">
      <div class="yt-top">
        <div class="yt-logo" data-home><span>▶</span><b>YouTube</b></div>
        <form class="yt-search"><input placeholder="Search or paste a YouTube link" value="${esc(ytState.q)}"><button>🔍</button></form>
        <button class="yt-gear" title="Settings">⚙️</button>
      </div>
      <div class="yt-setbox"></div>
      <div class="yt-body"></div></div>`;
    const body = stage.querySelector('.yt-body');
    stage.querySelector('[data-home]').onclick = () => { ytState.q = ''; ytState.cat = 'All'; YT(); };
    stage.querySelector('.yt-search').onsubmit = e => {
      e.preventDefault();
      const v = e.target.querySelector('input').value;
      const vid = parseYT(v);
      if(vid) return ytPlay(vid, body);
      ytState.q = v.trim(); ytHome(body);
    };
    stage.querySelector('.yt-gear').onclick = () => ytSettings(stage.querySelector('.yt-setbox'));
    if(id) ytPlay(id, body); else ytHome(body);
  }
  function ytSettings(box){
    if(box.innerHTML){ box.innerHTML = ''; return; }
    box.innerHTML = `<div class="yt-set"><b style="color:#fff">Backup search key (optional)</b><br>
      Search already works for every YouTube video. If live search is ever down, you can add a free YouTube Data API key
      (made at console.cloud.google.com) as a backup. It's saved only on this device.
      <input placeholder="Paste API key" value="${esc(store.get('ytKey',''))}"><button class="yt-pill sub">Save</button></div>`;
    box.querySelector('button').onclick = () => {
      store.set('ytKey', box.querySelector('input').value.trim()); box.innerHTML = ''; BLIZ.toast('Saved');
    };
  }
  /* Real YouTube search, trending and "up next" through public Piped servers.
     Videos still play in YouTube's own official embedded player. */
  const PIPED = ['https://api.piped.private.coffee','https://pipedapi.kavin.rocks','https://pipedapi.adminforge.de',
    'https://pipedapi.leptons.xyz','https://piped-api.lunar.icu','https://api.piped.yt','https://pipedapi.r4fo.com'];
  let pipedGood = store.get('pipedHost', null), ytToken = 0;
  async function piped(path){
    const order = pipedGood ? [pipedGood, ...PIPED.filter(h => h !== pipedGood)] : PIPED;
    let lastErr;
    for(const h of order){
      try{
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 7000);
        const r = await fetch(h + path, { signal: ctl.signal }); clearTimeout(t);
        if(!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        if(d && d.error) throw new Error(d.error);
        if(pipedGood !== h){ pipedGood = h; store.set('pipedHost', h); }
        return d;
      }catch(e){ lastErr = e; }
    }
    throw lastErr || new Error('YouTube search is unavailable right now');
  }
  const fromPiped = it => {
    const m = (it && it.url || '').match(/v=([\w-]{11})/); if(!m || it.type === 'channel' || it.type === 'playlist') return null;
    return { id:m[1], t:it.title || 'YouTube video', ch:it.uploaderName || 'YouTube', dur:+it.duration || 0, views:+it.views || 0, when:it.uploadedDate || '', cat:'' };
  };
  const fmtDur = s => { if(!s || s < 0) return ''; const h = s/3600|0, m = (s%3600)/60|0, x = s%60|0; return (h ? h + ':' + String(m).padStart(2,'0') : m) + ':' + String(x).padStart(2,'0'); };
  const fmtViews = n => !n || n < 0 ? '' : n >= 1e9 ? (n/1e9).toFixed(1).replace(/\.0$/,'') + 'B views' : n >= 1e6 ? (n/1e6).toFixed(1).replace(/\.0$/,'') + 'M views' : n >= 1e3 ? (n/1e3|0) + 'K views' : n + ' views';
  BLIZ.yt = { piped, fromPiped, fmtDur, fmtViews }; // shared with BlizBrowse search
  const YT_CHIPS = [['All',''],['Music','music'],['Gaming','gaming'],['Minecraft','minecraft'],['Animation','animation'],
    ['Funny','funny videos'],['Sports','sports highlights'],['Science','science'],['Trailers','official trailer'],['Learn','how to']];

  function cardHTML(v){
    ytState.extra[v.id] = v;
    return `<div class="yt-card" data-id="${v.id}">
      <div class="yt-thumb"><img loading="lazy" src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="">${v.dur ? `<span class="yt-dur">${fmtDur(v.dur)}</span>` : ''}</div>
      <div class="yt-meta"><div class="yt-av" style="background:${avColor(v.ch)}">${esc((v.ch[0] || 'Y').toUpperCase())}</div>
      <div><h4>${esc(v.t)}</h4><p>${esc(v.ch)}</p>${(v.views || v.when) ? `<p>${[fmtViews(v.views), v.when].filter(Boolean).map(esc).join(' • ')}</p>` : ''}</div></div></div>`;
  }

  async function ytHome(body){
    const q = ytState.q, token = ++ytToken;
    body.innerHTML = `<div class="yt-chips">${YT_CHIPS.map(c => `<button class="${c[0] === ytState.cat && !q ? 'on' : ''}" data-c="${c[0]}">${c[0]}</button>`).join('')}</div>
      ${q ? `<div class="yt-resfor">Results for <b>${esc(q)}</b></div>` : ''}
      <div class="yt-grid"><div class="yt-msg">Loading videos…</div></div><div class="yt-morebox"></div>`;
    body.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
      ytState.cat = b.dataset.c; ytState.q = '';
      const i = stage.querySelector('.yt-search input'); if(i) i.value = '';
      ytHome(body);
    });
    const grid = body.querySelector('.yt-grid'), moreBox = body.querySelector('.yt-morebox');
    const term = q || (YT_CHIPS.find(c => c[0] === ytState.cat) || ['', ''])[1];
    let list = [], next = null, note = '';
    try{
      if(term){
        const d = await piped('/search?q=' + encodeURIComponent(term) + '&filter=videos');
        list = d.items.map(fromPiped).filter(Boolean); next = d.nextpage;
      }else{
        const d = await piped('/trending?region=US');
        list = (Array.isArray(d) ? d : []).map(fromPiped).filter(Boolean);
      }
    }catch(e){
      // Live search is down: fall back to an API key (if the user added one) or Blizzard's own library
      const key = store.get('ytKey', '');
      if(term && key){
        try{
          const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&safeSearch=moderate&maxResults=24&q=${encodeURIComponent(term)}&key=${encodeURIComponent(key)}`);
          const d = await r.json(); if(d.error) throw new Error(d.error.message);
          list = d.items.map(it => ({ id:it.id.videoId, t:decodeEnt(it.snippet.title), ch:it.snippet.channelTitle, cat:'' }));
        }catch(_){}
      }
      if(!list.length){
        const words = term.toLowerCase().split(/\s+/).filter(Boolean);
        list = BLIZ.videos.filter(v => !words.length || words.some(w => (v.t + ' ' + v.ch + ' ' + v.cat).toLowerCase().includes(w)));
        if(!list.length) list = BLIZ.videos.slice();
        note = `<div class="yt-msg" style="grid-column:1/-1;padding:0 0 10px">Live YouTube search isn't responding right now, so here are videos from Blizzard's library. Try again in a minute.</div>`;
      }
    }
    if(token !== ytToken) return;
    if(!list.length){ grid.innerHTML = `<div class="yt-msg" style="grid-column:1/-1">No videos found for "<b>${esc(term)}</b>". Try different words.</div>`; return; }
    grid.innerHTML = note + list.map(cardHTML).join('');
    const wire = () => grid.querySelectorAll('[data-id]:not([data-w])').forEach(c => { c.dataset.w = 1; c.onclick = () => ytPlay(c.dataset.id, body); });
    wire();
    // "Show more" + auto-load when you scroll to the bottom, like real YouTube
    if(next && term){
      moreBox.innerHTML = `<button class="yt-more">Show more</button>`;
      const btn = moreBox.querySelector('button');
      let busy = false;
      const loadMore = async () => {
        if(busy || !next) return; busy = true; btn.textContent = 'Loading…';
        try{
          const d = await piped('/nextpage/search?nextpage=' + encodeURIComponent(next) + '&q=' + encodeURIComponent(term) + '&filter=videos');
          if(token !== ytToken) return;
          next = d.nextpage;
          grid.insertAdjacentHTML('beforeend', d.items.map(fromPiped).filter(Boolean).map(cardHTML).join(''));
          wire();
        }catch(e){ BLIZ.toast('Could not load more videos'); }
        busy = false;
        if(next) btn.textContent = 'Show more'; else { io && io.disconnect(); moreBox.innerHTML = ''; }
      };
      btn.onclick = loadMore;
      const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { if(es[0].isIntersecting) loadMore(); }, { rootMargin:'400px' }) : null;
      io && io.observe(btn);
    }
  }
  function decodeEnt(s){ const t = document.createElement('textarea'); t.innerHTML = s; return t.value; }
  function ytPlay(id, body){
    ++ytToken;
    const v = ytState.extra[id] || BLIZ.videos.find(x => x.id === id) || { id, t:'YouTube video', ch:'YouTube', cat:'' };
    const subs = store.get('subs', []);
    const fallbackNext = BLIZ.videos.filter(x => x.id !== id).sort(() => Math.random() - .5).slice(0, 12);
    const miniHTML = list => list.map(n => { ytState.extra[n.id] = ytState.extra[n.id] || n; return `<div class="yt-mini" data-id="${n.id}"><div class="yt-mthumb"><img loading="lazy" src="https://i.ytimg.com/vi/${n.id}/mqdefault.jpg" alt="">${n.dur ? `<span class="yt-dur">${fmtDur(n.dur)}</span>` : ''}</div>
        <div><h5>${esc(n.t)}</h5><p>${esc(n.ch)}</p>${n.views ? `<p>${esc(fmtViews(n.views))}</p>` : ''}</div></div>`; }).join('');
    body.innerHTML = `<div class="yt-watch"><div>
        <div class="w-backrow"><button class="w-back" data-yback>← Back to videos</button><button class="w-back" data-go="home">⌂ Main Menu</button></div>
        <div class="yt-player">${ytFrame(id)}</div>
        <h2 class="yt-title">${esc(v.t)}</h2>
        <div class="yt-chan"><div class="yt-av" style="background:${avColor(v.ch)}">${esc((v.ch[0] || 'Y').toUpperCase())}</div>
          <div><b class="yt-chname">${esc(v.ch)}</b><small class="yt-views">${v.views ? esc(fmtViews(v.views)) : 'YouTube'}</small></div>
          <button class="yt-pill sub ${subs.includes(v.ch) ? 'subbed' : ''}">${subs.includes(v.ch) ? 'Subscribed ✓' : 'Subscribe'}</button>
          <button class="yt-pill" data-like>👍 Like</button><button class="yt-pill" data-share>↗ Share</button>
        </div>
        <div class="yt-desc">Playing inside Blizzard Watch. No sign-in needed. Tap ⛶ in the player for full screen.</div>
      </div>
      <div class="yt-next"><div class="yt-msg" style="padding:6px 0">Loading up next…</div></div></div>`;
    const nextBox = body.querySelector('.yt-next');
    const wireNext = () => nextBox.querySelectorAll('[data-id]').forEach(c => c.onclick = () => { ytPlay(c.dataset.id, body); stage.scrollIntoView({behavior:'smooth'}); });
    const myToken = ytToken;
    piped('/streams/' + id).then(d => {
      if(myToken !== ytToken) return;
      if(d.title) body.querySelector('.yt-title').textContent = d.title;
      if(d.uploader) body.querySelector('.yt-chname').textContent = d.uploader;
      if(d.views) body.querySelector('.yt-views').textContent = fmtViews(d.views) + (d.uploadDate ? ' • ' + new Date(d.uploadDate).toLocaleDateString() : '');
      if(d.description){
        const txt = d.description.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
        body.querySelector('.yt-desc').textContent = decodeEnt(txt).slice(0, 400) + (txt.length > 400 ? '…' : '');
      }
      const rel = (d.relatedStreams || []).map(fromPiped).filter(Boolean).slice(0, 20);
      nextBox.innerHTML = miniHTML(rel.length ? rel : fallbackNext); wireNext();
    }).catch(() => { if(myToken === ytToken){ nextBox.innerHTML = miniHTML(fallbackNext); wireNext(); } });
    body.querySelector('[data-yback]').onclick = () => ytHome(body);
    const sb = body.querySelector('.sub');
    sb.onclick = () => {
      let s = store.get('subs', []);
      s = s.includes(v.ch) ? s.filter(x => x !== v.ch) : [...s, v.ch]; store.set('subs', s);
      sb.classList.toggle('subbed', s.includes(v.ch)); sb.textContent = s.includes(v.ch) ? 'Subscribed ✓' : 'Subscribe';
    };
    body.querySelector('[data-like]').onclick = e => { e.target.textContent = '👍 Liked'; };
    body.querySelector('[data-share]').onclick = () => {
      const link = 'https://youtu.be/' + id;
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => BLIZ.toast('Link copied'), () => BLIZ.toast(link));
    };
  }

  /* ================= TikTok ================= */
  // A "For You" feed of real TikTok videos, played inside Blizzard with TikTok's official player.
  let ttState = { list:[], i:0, who:'all' };
  function ttPlayerURL(id){ return `https://www.tiktok.com/player/v1/${id}?autoplay=1&loop=1&rel=0&music_info=1&description=0&controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1&timestamp=1&native_context_menu=0&closed_caption=1`; }
  function TT(link){
    const all = BLIZ.tiktoks || [];
    const creators = [];
    all.forEach(v => { if(!creators.find(c => c.u === v.u)) creators.push({ u:v.u, n:v.n }); });
    stage.innerHTML = `<div class="tt">
      <div class="tt-top"><div class="tt-logo"><i>♪</i> TikTok</div>
        <form class="tt-paste"><input placeholder="Paste a TikTok video link"><button>Play</button></form></div>
      <div class="tt-body">
        <div class="tt-side">
          <button class="tt-acc on" data-u="all"><span class="av" style="background:linear-gradient(135deg,#25f4ee,#fe2c55)">★</span><div><b>For You</b><small>All creators</small></div></button>
          <h6>Creators</h6>
          ${creators.map(a => `<button class="tt-acc" data-u="${esc(a.u)}"><span class="av" style="background:${avColor(a.u)}">${esc(a.n[0])}</span><div><b>${esc(a.n)}</b><small>@${esc(a.u)}</small></div></button>`).join('')}
        </div>
        <div class="tt-main"></div>
      </div></div>`;
    const main = stage.querySelector('.tt-main');
    stage.querySelectorAll('[data-u]').forEach(b => b.onclick = () => ttFeed(b.dataset.u, main));
    stage.querySelector('.tt-paste').onsubmit = e => { e.preventDefault(); ttLink(e.target.querySelector('input').value, main); };
    if(link) ttLink(link, main); else ttFeed('all', main);
  }
  function ttFeed(who, main, startId){
    const all = BLIZ.tiktoks || [];
    stage.querySelectorAll('.tt-acc').forEach(b => b.classList.toggle('on', b.dataset.u === who));
    let list = who === 'all' ? all.slice() : all.filter(v => v.u === who);
    if(who === 'all'){ // shuffle so the feed feels fresh every visit
      for(let i = list.length - 1; i > 0; i--){ const j = Math.random() * (i + 1) | 0; [list[i], list[j]] = [list[j], list[i]]; }
    }
    if(startId) list = [{ id:startId, u:'', n:'TikTok', t:'Shared video' }, ...list.filter(v => v.id !== startId)];
    ttState = { list, i:0, who };
    main.innerHTML = `<div class="tt-feed">
        <div class="tt-stage"><div class="tt-frame"></div>
          <div class="tt-actions">
            <button data-a="like" title="Like">🤍<small>Like</small></button>
            <button data-a="share" title="Copy link">↗<small>Share</small></button>
            <button data-a="creator" title="More from this creator">👤<small>Creator</small></button>
          </div></div>
        <div class="tt-cap"><b class="tt-who"></b><span class="tt-text"></span></div>
        <div class="tt-nav"><button data-a="prev">▲ Previous</button><span class="tt-count"></span><button data-a="next">Next ▼</button></div>
      </div>`;
    const go = d => { const n = ttState.i + d; if(n < 0 || n >= ttState.list.length) return; ttState.i = n; ttShow(main); };
    main.querySelector('[data-a=prev]').onclick = () => go(-1);
    main.querySelector('[data-a=next]').onclick = () => go(1);
    main.querySelector('[data-a=like]').onclick = e => { const b = e.currentTarget; b.classList.toggle('liked'); b.firstChild.textContent = b.classList.contains('liked') ? '❤️' : '🤍'; };
    main.querySelector('[data-a=share]').onclick = () => {
      const v = ttState.list[ttState.i]; const link = `https://www.tiktok.com/@${v.u || 'tiktok'}/video/${v.id}`;
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => BLIZ.toast('Link copied'), () => BLIZ.toast(link));
    };
    main.querySelector('[data-a=creator]').onclick = () => { const v = ttState.list[ttState.i]; if(v.u) ttFeed(v.u, main); };
    // swipe / wheel / keys to move through the feed
    const feed = main.querySelector('.tt-feed');
    let ty = null, wheelLock = 0;
    feed.addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive:true });
    feed.addEventListener('touchend', e => { if(ty === null) return; const dy = e.changedTouches[0].clientY - ty; ty = null; if(Math.abs(dy) > 60) go(dy < 0 ? 1 : -1); }, { passive:true });
    feed.addEventListener('wheel', e => { if(Math.abs(e.deltaY) < 30 || Date.now() < wheelLock) return; e.preventDefault(); wheelLock = Date.now() + 700; go(e.deltaY > 0 ? 1 : -1); }, { passive:false });
    if(!ttKeys){
      ttKeys = true;
      addEventListener('keydown', e => {
        if(app !== 'tiktok' || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
        const m = document.querySelector('.tt-feed'); if(!m) return;
        if(e.key === 'ArrowDown'){ e.preventDefault(); m.querySelector('[data-a=next]').click(); }
        if(e.key === 'ArrowUp'){ e.preventDefault(); m.querySelector('[data-a=prev]').click(); }
      });
    }
    ttShow(main);
  }
  let ttKeys = false;
  function ttShow(main){
    const v = ttState.list[ttState.i]; if(!v) return;
    main.querySelector('.tt-frame').innerHTML = `<iframe src="${ttPlayerURL(v.id)}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    main.querySelector('.tt-who').textContent = v.u ? '@' + v.u : 'TikTok';
    main.querySelector('.tt-text').textContent = v.t ? ' ' + v.t : '';
    main.querySelector('.tt-count').textContent = `${ttState.i + 1} / ${ttState.list.length}`;
    main.querySelector('[data-a=prev]').disabled = ttState.i === 0;
    main.querySelector('[data-a=next]').disabled = ttState.i >= ttState.list.length - 1;
    const like = main.querySelector('[data-a=like]'); like.classList.remove('liked'); like.firstChild.textContent = '🤍';
  }
  function ttLink(s, main){
    s = s.trim();
    const vid = (s.match(/\/video\/(\d{8,})/) || s.match(/^(\d{15,})$/) || [])[1];
    if(vid) return ttFeed(ttState.who || 'all', main, vid);
    const user = (s.match(/@([\w.]{2,24})/) || [])[1];
    if(user && (BLIZ.tiktoks || []).some(v => v.u === user)) return ttFeed(user, main);
    if(/vm\.tiktok\.com|tiktok\.com\/t\//.test(s)){
      BLIZ.toast('Short links can\'t be opened. Open the video in TikTok, copy the full link with /video/ in it, and paste that here.');
      return;
    }
    BLIZ.toast('Paste a TikTok video link (it has /video/ in it)');
  }

  /* ================= BlizzardMovies ================= */
  const poster = m => m.src === 'yt' ? `https://i.ytimg.com/vi/${m.id}/hqdefault.jpg` : `https://archive.org/services/img/${m.id}`;
  function MOVIES(){
    const ms = BLIZ.movies;
    const longOnes = ms.filter(m => m.mins >= 70 && (m.row === 'New releases' || m.row === 'Action & sci-fi' || m.row === 'Family & kids'));
    const feat = longOnes[Math.floor(Math.random() * longOnes.length)];
    const rows = [...new Set(ms.map(m => m.row))];
    stage.innerHTML = `<div class="bm">
      <div class="bm-top"><div class="bm-logo">BLIZZARD<b>MOVIES</b></div><input class="bm-search" placeholder="🔍 Search movies"></div>
      <div class="bm-hero"><div class="bm-hero-bg" style="background-image:url('${poster(feat)}')"></div>
        <div><span class="bm-tag">★ FEATURED · FULL MOVIE</span><h2>${esc(feat.title)}</h2><p>${esc(feat.d)} · ${feat.year ? feat.year + ' · ' : ''}${feat.len}</p>
        <button class="bm-btn" data-play="${ms.indexOf(feat)}">▶ Play</button><button class="bm-btn alt" data-info="${ms.indexOf(feat)}">ⓘ More info</button></div>
      </div>
      <div class="bm-rows"></div></div>`;
    const rowsEl = stage.querySelector('.bm-rows');
    const continueIds = store.get('bmRecent', []);
    function draw(q){
      const f = ms.filter(m => !q || (m.title + ' ' + m.d + ' ' + m.row).toLowerCase().includes(q));
      let html = '';
      const recent = !q && continueIds.map(i => ms[i]).filter(Boolean);
      if(recent && recent.length) html += rowHTML('Continue watching', recent);
      if(q) html += rowHTML(`Results for "${esc(q)}"`, f);
      else rows.forEach(r => html += rowHTML(r, f.filter(m => m.row === r)));
      rowsEl.innerHTML = html || '<p style="padding:26px;color:#99a">No movies found.</p>';
    }
    function rowHTML(title, list){
      if(!list.length) return '';
      return `<div class="bm-row"><h3>${title}</h3><div class="bm-scroll">${list.map(m =>
        `<div class="bm-card" data-play="${ms.indexOf(m)}"><div class="img" style="background-image:url('${poster(m)}')"></div>
        <div class="cap"><b>${esc(m.title)}</b><small>${m.year ? m.year + ' · ' : ''}${m.len}</small></div></div>`).join('')}</div></div>`;
    }
    draw('');
    stage.querySelector('.bm-search').oninput = e => draw(e.target.value.toLowerCase().trim());
    stage.querySelector('.bm').addEventListener('click', e => {
      const p = e.target.closest('[data-play],[data-info]'); if(!p) return;
      playMovie(+(p.dataset.play ?? p.dataset.info));
    });
  }
  function playMovie(i){
    const m = BLIZ.movies[i];
    const recent = [i, ...store.get('bmRecent', []).filter(x => x !== i)].slice(0, 8); store.set('bmRecent', recent);
    const src = m.src === 'yt' ? ytEmbed(m.id) : `https://archive.org/embed/${m.id}?autoplay=1`;
    modal.querySelector('.bm-player').innerHTML = `<iframe src="${src}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    modal.querySelector('h4').textContent = m.year ? `${m.title} (${m.year})` : m.title;
    modal.querySelector('p').textContent = `${m.d} · ${m.len} · ${m.row === 'Animated shorts' && m.src === 'yt' ? 'Open movie by Blender Studio' : m.src === 'yt' ? 'Free full movie' : 'Free to watch · Internet Archive'}`;
    modal.classList.add('open');
  }
  function closeModal(){ modal.classList.remove('open'); modal.querySelector('.bm-player').innerHTML = ''; }
  modal.querySelector('.bm-close').onclick = closeModal;
  modal.onclick = e => { if(e.target === modal) closeModal(); };
  addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });
})();
